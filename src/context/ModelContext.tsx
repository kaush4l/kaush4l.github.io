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
    stt: ModelState;
    tts: ModelState;
    llm: ModelState;
    modelName: string;
    systemPrompt: string;
    autoLoadAll: () => Promise<void>;

    // Workers - exposed for consumption by Chat Widget
    sttWorker: Worker | null;
    ttsWorker: Worker | null;
    llmWorker: Worker | null;
}

const ModelContext = createContext<ModelContextType | null>(null);

export function useModelContext() {
    const ctx = useContext(ModelContext);
    if (!ctx) throw new Error('useModelContext must be used within ModelProvider');
    return ctx;
}

export function ModelProvider({ children, initialSystemPrompt = '' }: { children: ReactNode, initialSystemPrompt?: string }) {
    const [stt, setStt] = useState<ModelState>({ ready: false, loading: false, progress: 0 });
    const [tts, setTts] = useState<ModelState>({ ready: false, loading: false, progress: 0 });
    const [llm, setLlm] = useState<ModelState>({ ready: false, loading: false, progress: 0 });
    const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);

    // ... rest of context ...

    // Keep workers in refs so we don't re-render too often, but expose them? 
    // Actually we need state for them if we want to trigger updates in consumers? 
    // No, refs are fine, consumers just need the instance. But consumers mount later.
    const [workers, setWorkers] = useState<{
        stt: Worker | null;
        tts: Worker | null;
        llm: Worker | null;
    }>({ stt: null, tts: null, llm: null });

    const autoLoadPromiseRef = useRef<Promise<void> | null>(null);

    const terminateWorkers = useCallback(() => {
        try { workers.stt?.terminate(); } catch { }
        try { workers.tts?.terminate(); } catch { }
        try { workers.llm?.terminate(); } catch { }
        setWorkers({ stt: null, tts: null, llm: null });
    }, [workers.llm, workers.stt, workers.tts]);

    const loadWorker = async (
        type: 'stt' | 'tts' | 'llm',
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
                    // Transformers.js progress_callback sends {status, progress, ...}
                    // Progress is already a percentage (0-100), not a fraction
                    const rawProgress = data?.progress ?? 0;
                    // Handle both percentage (0-100) and fraction (0-1) formats
                    const normalizedProgress = rawProgress > 1 ? rawProgress : rawProgress * 100;
                    const progress = Math.min(99, Math.round(normalizedProgress)); // Cap at 99 until ready
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
                // Some browsers provide these; they are very helpful for worker-load failures.
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

        // Target only modern WebGPU browsers.
        if (typeof navigator !== 'undefined' && !('gpu' in navigator)) {
            const message = 'WebGPU is required to run the on-device models (supported in latest Chrome/Edge).';
            setStt((prev) => (prev.error ? prev : { ready: false, loading: false, progress: 0, error: message }));
            setTts((prev) => (prev.error ? prev : { ready: false, loading: false, progress: 0, error: message }));
            setLlm((prev) => (prev.error ? prev : { ready: false, loading: false, progress: 0, error: message }));
            throw new Error(message);
        }

        autoLoadPromiseRef.current = (async () => {
            console.log('Auto-loading all models in parallel...');

            // If we already have workers and all models are ready, no-op.
            if (workers.stt && workers.tts && workers.llm && stt.ready && tts.ready && llm.ready) {
                return;
            }

            // If retrying after a failure, terminate old workers first.
            if (workers.stt || workers.tts || workers.llm) {
                terminateWorkers();
            }

            // Load all workers in parallel for faster startup.
            const [sttW, ttsW, llmW] = await Promise.all([
                loadWorker(
                    'stt',
                    () => new Worker(new URL('../workers/stt.worker.js', import.meta.url), { type: 'module' }),
                    MODELS.stt.default,
                    setStt
                ),
                loadWorker(
                    'tts',
                    () => new Worker(new URL('../workers/tts.worker.js', import.meta.url), { type: 'module' }),
                    MODELS.tts.default,
                    setTts
                ),
                loadWorker(
                    'llm',
                    () => new Worker(new URL('../workers/llm.worker.js', import.meta.url), { type: 'module' }),
                    MODELS.llm.default,
                    setLlm
                ),
            ]);

            setWorkers({ stt: sttW, tts: ttsW, llm: llmW });
        })();

        try {
            await autoLoadPromiseRef.current;
        } finally {
            autoLoadPromiseRef.current = null;
        }
    }, [
        llm.ready,
        stt.ready,
        terminateWorkers,
        tts.ready,
        workers.llm,
        workers.stt,
        workers.tts,
    ]);

    // Auto-initialize models on startup without blocking first paint.
    useEffect(() => {
        let cancelled = false;

        const start = () => {
            if (cancelled) return;
            void autoLoadAll().catch(() => {
                // Errors are reflected in context state.
            });
        };

        if (typeof window === 'undefined') return;

        const anyGlobal = globalThis as any;
        if (typeof anyGlobal.requestIdleCallback === 'function') {
            const id = anyGlobal.requestIdleCallback(start, { timeout: 2000 });
            return () => {
                cancelled = true;
                try {
                    anyGlobal.cancelIdleCallback?.(id);
                } catch {
                    // ignore
                }
            };
        }

        const t = setTimeout(start, 500);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [autoLoadAll]);

    return (
        <ModelContext.Provider value={{
            stt, tts, llm, systemPrompt,
            modelName: MODELS.llm.default.split('/').pop() || 'Unknown',
            autoLoadAll,
            sttWorker: workers.stt,
            ttsWorker: workers.tts,
            llmWorker: workers.llm
        }}>
            {children}
        </ModelContext.Provider>
    );
}
