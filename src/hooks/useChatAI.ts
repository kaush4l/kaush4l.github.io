'use client';

/**
 * useChatAI — lightweight hook for on-device LLM chat.
 *
 * After STT/TTS removal: manages LLM message state, streaming, and text input only.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModelContext } from '@/context/ModelContext';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

function makeRequestId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface UseChatAIOptions {
    /** Automatically start loading models as soon as the hook mounts (default: false) */
    autoLoad?: boolean;
}

export interface UseChatAIReturn {
    // State
    messages: ChatMessage[];
    streamingContent: string;
    busy: boolean;
    input: string;

    // Setters
    setInput: (v: string) => void;

    // Actions
    sendText: (text: string) => Promise<void>;
    sendAudio: (audio: Float32Array) => Promise<void>;
    sendMessage: (overrideContent?: string) => void;
    clearChat: () => void;

    // Scroll refs
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    shouldAutoScrollRef: React.RefObject<boolean>;
}

export function useChatAI(opts: UseChatAIOptions = {}): UseChatAIReturn {
    const { autoLoad = false } = opts;
    const { llm, llmWorker, autoLoadAll, systemPrompt } = useModelContext();

    // ── Core State ────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');

    // ── Internal Refs ─────────────────────────────────────────────────────────
    const streamingBufferRef = useRef('');
    const streamingFlushTimerRef = useRef<number | null>(null);
    const activeLlmRequestIdRef = useRef<string | null>(null);

    // Scroll
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (streamingFlushTimerRef.current) clearTimeout(streamingFlushTimerRef.current);
        };
    }, []);

    // ── Auto-load ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoLoad) return;
        if (!llm.ready && !(llm.loading)) {
            void autoLoadAll().catch(() => {});
        }
    }, [autoLoad]); // intentionally stable list

    // ── LLM Worker Handler ────────────────────────────────────────────────────
    useEffect(() => {
        if (!llmWorker) return;

        const scheduleFlush = () => {
            if (streamingFlushTimerRef.current) return;
            streamingFlushTimerRef.current = window.setTimeout(() => {
                streamingFlushTimerRef.current = null;
                setStreamingContent(streamingBufferRef.current);
                if (shouldAutoScrollRef.current) {
                    const el = scrollContainerRef.current;
                    el?.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
                }
            }, 75);
        };

        const handler = (e: MessageEvent) => {
            const { type, data } = e.data ?? {};

            if (type === 'progress' && data?.status === 'stream') {
                if (data?.requestId && data.requestId !== activeLlmRequestIdRef.current) return;
                const token = data?.output ?? '';
                streamingBufferRef.current += token;
                scheduleFlush();
                return;
            }

            if (type === 'complete') {
                const payload = typeof data === 'string' ? { output: data } : data;
                if (payload?.requestId && payload.requestId !== activeLlmRequestIdRef.current) return;

                if (streamingFlushTimerRef.current) {
                    clearTimeout(streamingFlushTimerRef.current);
                    streamingFlushTimerRef.current = null;
                }
                const finalRaw =
                    (typeof payload?.output === 'string' ? payload.output : '') ||
                    streamingBufferRef.current;
                streamingBufferRef.current = '';

                const final = finalRaw.trim();
                if (final) setMessages((prev) => [...prev, { role: 'assistant', content: final }]);
                setStreamingContent('');
                setBusy(false);
                activeLlmRequestIdRef.current = null;
                return;
            }

            if (type === 'error') {
                const payload = typeof data === 'string' ? { message: data } : data;
                if (payload?.requestId && payload.requestId !== activeLlmRequestIdRef.current) return;
                const msg = payload?.message ?? 'Unknown error';
                setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
                streamingBufferRef.current = '';
                setStreamingContent('');
                setBusy(false);
                activeLlmRequestIdRef.current = null;
            }
        };

        llmWorker.addEventListener('message', handler);
        return () => {
            llmWorker.removeEventListener('message', handler);
            if (streamingFlushTimerRef.current) clearTimeout(streamingFlushTimerRef.current);
        };
    }, [llmWorker]);

    // ── Auto-scroll when messages change ─────────────────────────────────────
    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        const el = scrollContainerRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, [messages.length]);

    // ── Send Text ─────────────────────────────────────────────────────────────
    const sendText = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        if (!llm.ready || !llmWorker) {
            await autoLoadAll().catch(() => {});
            if (!llmWorker) return;
        }

        const llmRequestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = llmRequestId;

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setBusy(true);
        setStreamingContent('');
        streamingBufferRef.current = '';

        const history: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...messages,
            userMsg,
        ];

        llmWorker.postMessage({ type: 'generate', data: { messages: history, requestId: llmRequestId } });
    }, [autoLoadAll, busy, llm.ready, llmWorker, messages, systemPrompt]);

    // ── Send Audio (multimodal voice input) ─────────────────────────────────
    const sendAudio = useCallback(async (audio: Float32Array) => {
        if (busy || audio.length === 0) return;
        if (!llm.ready || !llmWorker) {
            await autoLoadAll().catch(() => {});
            if (!llmWorker) return;
        }

        const llmRequestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = llmRequestId;

        // The bubble is a placeholder; the model receives the raw audio and is
        // instructed (worker-side) to transcribe and answer it.
        setMessages((prev) => [...prev, { role: 'user', content: '🎤 Voice message' }]);
        setBusy(true);
        setStreamingContent('');
        streamingBufferRef.current = '';

        const history: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...messages,
            { role: 'user', content: '' },
        ];

        llmWorker.postMessage({
            type: 'generate',
            data: { messages: history, audio, requestId: llmRequestId },
        });
    }, [autoLoadAll, busy, llm.ready, llmWorker, messages, systemPrompt]);

    // ── sendMessage: convenience wrapper (reads local input) ─────
    const sendMessage = useCallback((overrideContent?: string) => {
        const content = overrideContent ?? input.trim();
        if (content) void sendText(content);
    }, [input, sendText]);

    // ── Clear ─────────────────────────────────────────────────────────────────
    const clearChat = useCallback(() => {
        setMessages([]);
        setStreamingContent('');
        setInput('');
        streamingBufferRef.current = '';
        activeLlmRequestIdRef.current = null;
    }, []);

    return {
        messages,
        streamingContent,
        busy,
        input,
        setInput,
        sendText,
        sendAudio,
        sendMessage,
        clearChat,
        scrollContainerRef,
        messagesEndRef,
        shouldAutoScrollRef,
    };
}
