'use client';
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
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

    const loadWorker = async (
        type: 'stt' | 'tts' | 'llm',
        url: URL,
        modelId: string,
        setState: React.Dispatch<React.SetStateAction<ModelState>>
    ) => {
        return new Promise<Worker>((resolve, reject) => {
            setState({ ready: false, loading: true, progress: 0 });

            const worker = new Worker(url, { type: 'module' });

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
                    worker.removeEventListener('message', handler);
                } else if (msgType === 'error') {
                    setState({ ready: false, loading: false, progress: 0, error: data });
                    worker.removeEventListener('message', handler);
                }
            };

            worker.addEventListener('message', handler);
            worker.postMessage({ type: 'load', data: { model: modelId } });

            resolve(worker);
        });
    };

    const autoLoadAll = useCallback(async () => {
        console.log('Auto-loading all models in parallel...');

        try {
            // Load all workers in parallel for faster startup
            const [sttW, ttsW, llmW] = await Promise.all([
                loadWorker('stt', new URL('../workers/stt.worker.ts', import.meta.url), MODELS.stt.default, setStt),
                loadWorker('tts', new URL('../workers/tts.worker.ts', import.meta.url), MODELS.tts.default, setTts),
                loadWorker('llm', new URL('../workers/llm.worker.ts', import.meta.url), MODELS.llm.default, setLlm),
            ]);

            setWorkers({ stt: sttW, tts: ttsW, llm: llmW });
        } catch (e) {
            console.error('Failed to load workers', e);
        }
    }, []);

    // Auto-load on mount - only once
    useEffect(() => {
        let mounted = true;

        // Only load if not already loading/ready
        if (!llm.loading && !llm.ready && !workers.llm) {
            autoLoadAll();
        }

        return () => {
            mounted = false;
            // Cleanup workers on unmount
        };
    }, [autoLoadAll, llm.loading, llm.ready, workers.llm]);

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
