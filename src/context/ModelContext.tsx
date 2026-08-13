'use client';
import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { MODELS } from '@/lib/capability';

/**
 * Loading is *never* started here. Model weights are gigabytes of the visitor's
 * bandwidth, so the download begins only on an explicit act of intent —
 * `ChatWidget.handleOpen` → `ensureLoading()` (A2). There is deliberately no
 * startup prefetch, idle-callback warm-up or speculative fetch in this file.
 */

interface ModelState {
    ready: boolean;
    loading: boolean;
    progress: number;
    error?: string;
}

interface ModelContextType {
    llm: ModelState;
    modelName: string;
    systemPrompt: string;
    autoLoadAll: () => Promise<void>;

    // Worker exposed for consumption by Chat Widget
    llmWorker: Worker | null;
}

const ModelContext = createContext<ModelContextType | null>(null);

export function useModelContext() {
    const ctx = useContext(ModelContext);
    if (!ctx) throw new Error('useModelContext must be used within ModelProvider');
    return ctx;
}

export function ModelProvider({ children, initialSystemPrompt = '' }: { children: ReactNode, initialSystemPrompt?: string }) {
    const [llm, setLlm] = useState<ModelState>({ ready: false, loading: false, progress: 0 });
    const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);

    const [workers, setWorkers] = useState<{
        llm: Worker | null;
    }>({ llm: null });

    const autoLoadPromiseRef = useRef<Promise<void> | null>(null);

    const terminateWorkers = useCallback(() => {
        try { workers.llm?.terminate(); } catch { }
        setWorkers({ llm: null });
    }, [workers.llm]);

    const loadWorker = async (
        type: 'llm',
        createWorker: () => Worker,
        modelId: string,
        setState: React.Dispatch<React.SetStateAction<ModelState>>
    ) => {
        return new Promise<Worker>((resolve, reject) => {
            setState({ ready: false, loading: true, progress: 0 });

            const worker = createWorker();

            const cleanup = () => {
                worker.removeEventListener('message', handler);
                worker.removeEventListener('error', errorHandler);
                worker.removeEventListener('messageerror', messageErrorHandler);
            };

            const fail = (message: string) => {
                cleanup();
                try { worker.terminate(); } catch { }
                setState({ ready: false, loading: false, progress: 0, error: message });
                reject(new Error(message));
            };

            const handler = (e: MessageEvent) => {
                const { type: msgType, data } = e.data;

                if (msgType === 'progress') {
                    const rawProgress = data?.progress ?? 0;
                    const normalizedProgress = rawProgress > 1 ? rawProgress : rawProgress * 100;
                    const progress = Math.min(99, Math.round(normalizedProgress));
                    setState(prev => ({ ...prev, progress, loading: true }));
                } else if (msgType === 'ready') {
                    setState({ ready: true, loading: false, progress: 100 });
                    cleanup();
                    resolve(worker);
                } else if (msgType === 'error') {
                    const message = typeof data === 'string' ? data : (data?.message || `Failed to load ${type} model`);
                    fail(message);
                }
            };

            const errorHandler = (e: ErrorEvent) => {
                const parts = [e?.message || `Worker error while loading ${type}`];
                const anyE = e as any;
                if (anyE?.filename) parts.push(`file: ${anyE.filename}`);
                if (typeof anyE?.lineno === 'number') parts.push(`line: ${anyE.lineno}`);
                if (typeof anyE?.colno === 'number') parts.push(`col: ${anyE.colno}`);
                fail(parts.join(' | '));
            };

            // `messageerror` is a typed member of WorkerEventMap; typing the
            // listener is what makes the suppression unnecessary (G6).
            const messageErrorHandler = (_e: MessageEvent) => {
                fail(`Worker message error while loading ${type}`);
            };

            worker.addEventListener('message', handler);
            worker.addEventListener('error', errorHandler);
            worker.addEventListener('messageerror', messageErrorHandler);
            worker.postMessage({ type: 'load', data: { model: modelId } });
        });
    };

    const autoLoadAll = useCallback(async () => {
        // Single-flight: if a load is already in progress, reuse it.
        if (autoLoadPromiseRef.current) return autoLoadPromiseRef.current;

        autoLoadPromiseRef.current = (async () => {
            // If we already have workers and the model is ready, no-op.
            if (workers.llm && llm.ready) {
                return;
            }

            // If retrying after a failure, terminate old workers first.
            if (workers.llm) {
                terminateWorkers();
            }

            // Load the LLM worker.
            const llmW = await loadWorker(
                'llm',
                () => new Worker(new URL('../workers/llm.worker.js', import.meta.url), { type: 'module' }),
                MODELS.llm.default,
                setLlm
            );

            setWorkers({ llm: llmW });
        })();

        try {
            await autoLoadPromiseRef.current;
        } finally {
            autoLoadPromiseRef.current = null;
        }
    }, [
        llm.ready,
        terminateWorkers,
        workers.llm,
    ]);

    return (
        <ModelContext.Provider value={{
            llm, systemPrompt,
            modelName: MODELS.llm.default.split('/').pop() || 'Unknown',
            autoLoadAll,
            llmWorker: workers.llm
        }}>
            {children}
        </ModelContext.Provider>
    );
}
