'use client';
import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { MODELS } from '@/lib/capability';

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
                // @ts-ignore
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

            // @ts-ignore
            const messageErrorHandler = () => {
                fail(`Worker message error while loading ${type}`);
            };

            worker.addEventListener('message', handler);
            worker.addEventListener('error', errorHandler);
            // @ts-ignore
            worker.addEventListener('messageerror', messageErrorHandler);
            worker.postMessage({ type: 'load', data: { model: modelId } });
        });
    };

    const autoLoadAll = useCallback(async () => {
        // Single-flight: if a load is already in progress, reuse it.
        if (autoLoadPromiseRef.current) return autoLoadPromiseRef.current;

        autoLoadPromiseRef.current = (async () => {
            console.log('Auto-loading LLM model...');

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

    // Always keep a ref to the latest autoLoadAll so the startup effect (with
    // empty deps) never calls a stale closure without needing autoLoadAll in
    // its dependency array.
    const autoLoadAllRef = useRef(autoLoadAll);
    useEffect(() => { autoLoadAllRef.current = autoLoadAll; });

    // Auto-initialize models on startup without blocking first paint.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        let cancelled = false;

        const start = () => {
            if (cancelled) return;
            void autoLoadAllRef.current().catch(() => {
                // Errors are reflected in context state.
            });
        };

        const anyGlobal = globalThis as any;
        if (typeof anyGlobal.requestIdleCallback === 'function') {
            const id = anyGlobal.requestIdleCallback(start, { timeout: 2000 });
            return () => {
                cancelled = true;
                try { anyGlobal.cancelIdleCallback?.(id); } catch { /* ignore */ }
            };
        }

        const t = setTimeout(start, 500);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
