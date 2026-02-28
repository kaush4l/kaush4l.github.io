'use client';

/**
 * useChatAI — shared hook for all on-device AI chat surfaces.
 *
 * Extracted from ChatWidget.tsx and AMAChatClient.tsx so both share identical
 * LLM/STT/TTS wiring, audio queue, and message state management.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModelContext } from '@/context/ModelContext';
import { TextStreamAccumulator } from '@/lib/queue-manager';
import { stripMarkdownForSpeech } from '@/lib/voiceText';

const DEFAULT_TTS_SPEAKER = 'Lily';
const DEFAULT_TTS_PLAYBACK_RATE = 1.2;

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

function makeRequestId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resampleTo16k(input: Float32Array, fromSampleRate: number): Float32Array {
    const targetSampleRate = 16000;
    if (!fromSampleRate || fromSampleRate === targetSampleRate) return input;
    const ratio = fromSampleRate / targetSampleRate;
    const newLength = Math.round(input.length / ratio);
    const output = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        const srcIndex = Math.round(i * ratio);
        output[i] = input[Math.min(srcIndex, input.length - 1)];
    }
    return output;
}

async function blobToMono16k(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    try {
        const decoded = await ctx.decodeAudioData(arrayBuffer);

        const channelCount = decoded.numberOfChannels;
        const length = decoded.length;
        const mono = new Float32Array(length);
        for (let ch = 0; ch < channelCount; ch++) {
            const data = decoded.getChannelData(ch);
            for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
        }

        return resampleTo16k(mono, decoded.sampleRate);
    } finally {
        // Always close — AudioContext is a system resource and browsers cap the count.
        // Forgetting this causes a new context to leak on every ondataavailable tick.
        ctx.close().catch(() => {});
    }
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
    isRecording: boolean;
    liveTranscript: string;
    ttsEnabled: boolean;
    input: string;

    // Setters
    setInput: (v: string) => void;
    setTtsEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;

    // Actions
    sendText: (text: string) => Promise<void>;
    sendMessage: (overrideContent?: string) => void;
    clearChat: () => void;
    startRecording: () => Promise<void>;
    stopRecording: () => void;

    // Scroll refs
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    shouldAutoScrollRef: React.RefObject<boolean>;
}

export function useChatAI(opts: UseChatAIOptions = {}): UseChatAIReturn {
    const { autoLoad = false } = opts;
    const { llm, stt, tts, llmWorker, sttWorker, ttsWorker, autoLoadAll, systemPrompt } = useModelContext();

    // ── Core State ────────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingContent, setStreamingContent] = useState('');
    const [busy, setBusy] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [input, setInput] = useState('');

    // ── Internal Refs ─────────────────────────────────────────────────────────
    const streamingBufferRef = useRef('');
    const streamingFlushTimerRef = useRef<number | null>(null);
    const streamAccumulatorRef = useRef<TextStreamAccumulator | null>(null);
    const activeLlmRequestIdRef = useRef<string | null>(null);
    const activeTtsRequestIdRef = useRef<string | null>(null);
    const sttRequestIdRef = useRef<string | null>(null);
    const sttInFlightRef = useRef(false);

    // Audio playback
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Array<{ audio: Float32Array; sampleRate: number }>>([]);
    const audioPlayingRef = useRef(false);

    // Recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    // Always reflects the latest liveTranscript for use inside recorder callbacks
    const liveTranscriptRef = useRef('');

    // Scroll
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);

    // ── Keep liveTranscriptRef in sync ────────────────────────────────────────
    useEffect(() => { liveTranscriptRef.current = liveTranscript; }, [liveTranscript]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Stop any active recording and release the mic
            try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
            mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
            // Close shared playback AudioContext
            audioContextRef.current?.close().catch(() => {});
            // Clear pending UI flush timer
            if (streamingFlushTimerRef.current) clearTimeout(streamingFlushTimerRef.current);
            // Drop buffered audio so GC can reclaim memory
            audioQueueRef.current = [];
        };
    }, []);

    // ── Auto-load ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoLoad) return;
        const anyReady = llm.ready && stt.ready && tts.ready;
        const anyLoading = llm.loading || stt.loading || tts.loading;
        if (!anyReady && !anyLoading) {
            void autoLoadAll().catch(() => {});
        }
    }, [autoLoad]); // intentionally stable list

    // ── Audio Playback ────────────────────────────────────────────────────────
    const playNextAudio = useCallback(async () => {
        if (audioPlayingRef.current || audioQueueRef.current.length === 0) return;
        audioPlayingRef.current = true;

        const chunk = audioQueueRef.current.shift();
        if (!chunk?.audio) { audioPlayingRef.current = false; return; }

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const buffer = ctx.createBuffer(1, chunk.audio.length, chunk.sampleRate || 16000);
            buffer.getChannelData(0).set(chunk.audio);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = DEFAULT_TTS_PLAYBACK_RATE;
            source.connect(ctx.destination);
            source.onended = () => {
                audioPlayingRef.current = false;
                void playNextAudio();
            };
            source.start();
        } catch {
            audioPlayingRef.current = false;
        }
    }, []);

    // ── TextStreamAccumulator → TTS ───────────────────────────────────────────
    useEffect(() => {
        streamAccumulatorRef.current = new TextStreamAccumulator((sentence) => {
            if (!ttsEnabled || !tts.ready || !ttsWorker) return;
            const requestId = activeTtsRequestIdRef.current;
            if (!requestId) return;
            const clean = stripMarkdownForSpeech(sentence);
            if (!clean) return;
            ttsWorker.postMessage({
                type: 'synthesize',
                data: { text: clean, language: 'en', speaker: DEFAULT_TTS_SPEAKER, requestId },
            });
        });
        return () => { streamAccumulatorRef.current = null; };
    }, [ttsEnabled, tts.ready, ttsWorker]);

    // ── LLM Worker Handler ────────────────────────────────────────────────────
    useEffect(() => {
        if (!llmWorker) return;

        const scheduleFlush = () => {
            if (streamingFlushTimerRef.current) return;
            streamingFlushTimerRef.current = window.setTimeout(() => {
                streamingFlushTimerRef.current = null;
                setStreamingContent(stripMarkdownForSpeech(streamingBufferRef.current));
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
                streamAccumulatorRef.current?.add(token);
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

                const final = stripMarkdownForSpeech(finalRaw.trim());
                if (final) setMessages((prev) => [...prev, { role: 'assistant', content: final }]);
                streamAccumulatorRef.current?.flush();
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

    // ── TTS Worker Handler ────────────────────────────────────────────────────
    useEffect(() => {
        if (!ttsWorker) return;

        const handler = (e: MessageEvent) => {
            const { type, data } = e.data ?? {};
            if (type !== 'complete') return;
            if (data?.requestId && activeTtsRequestIdRef.current && data.requestId !== activeTtsRequestIdRef.current) return;
            if (!data?.audio) return;
            audioQueueRef.current.push({ audio: data.audio as Float32Array, sampleRate: data.sampling_rate ?? 16000 });
            void playNextAudio();
        };

        ttsWorker.addEventListener('message', handler);
        return () => ttsWorker.removeEventListener('message', handler);
    }, [ttsWorker, playNextAudio]);

    // ── STT Worker Handler ────────────────────────────────────────────────────
    useEffect(() => {
        if (!sttWorker) return;

        const handler = (e: MessageEvent) => {
            const { type, data } = e.data ?? {};
            if (type === 'transcription') {
                const payload = typeof data === 'string' ? { text: data } : data;
                if (payload?.requestId && sttRequestIdRef.current && payload.requestId !== sttRequestIdRef.current) return;
                const text = (payload?.text ?? '').trim();
                if (text) setLiveTranscript(text);
                sttInFlightRef.current = false;
            }
            if (type === 'error') {
                sttInFlightRef.current = false;
            }
        };

        sttWorker.addEventListener('message', handler);
        return () => sttWorker.removeEventListener('message', handler);
    }, [sttWorker]);

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
        const ttsRequestId = makeRequestId('tts');
        activeLlmRequestIdRef.current = llmRequestId;
        activeTtsRequestIdRef.current = ttsRequestId;
        streamAccumulatorRef.current?.reset?.();

        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLiveTranscript('');
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

    // ── sendMessage: convenience wrapper (reads local input + transcript) ─────
    const sendMessage = useCallback((overrideContent?: string) => {
        const content = overrideContent ?? [input.trim(), liveTranscript.trim()].filter(Boolean).join(' ');
        void sendText(content);
    }, [input, liveTranscript, sendText]);

    // ── Clear ─────────────────────────────────────────────────────────────────
    const clearChat = useCallback(() => {
        setMessages([]);
        setStreamingContent('');
        setLiveTranscript('');
        setInput('');
        streamingBufferRef.current = '';
        activeLlmRequestIdRef.current = null;
        activeTtsRequestIdRef.current = null;
        streamAccumulatorRef.current?.reset?.();
        audioQueueRef.current = [];
    }, []);

    // ── Recording ─────────────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        if (busy) return;
        if (!stt.ready) { await autoLoadAll().catch(() => {}); }
        if (!sttWorker || !stt.ready) return;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
        mediaStreamRef.current = stream;
        const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        const mimeType = preferredTypes.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t));
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        audioChunksRef.current = [];
        setIsRecording(true);

        // Max chunks to retain: chunk[0] always kept (contains webm container
        // headers required to decode subsequent chunks), plus a rolling window.
        const MAX_CHUNKS = 7; // ~7 s at 1 s timeslice

        recorder.ondataavailable = async (e) => {
            if (!e.data?.size) return;
            audioChunksRef.current.push(e.data);

            // Bound buffer: keep first chunk (webm headers) + recent tail so the
            // blob fed to blobToMono16k doesn't grow without limit.
            if (audioChunksRef.current.length > MAX_CHUNKS) {
                audioChunksRef.current = [
                    audioChunksRef.current[0],
                    ...audioChunksRef.current.slice(-(MAX_CHUNKS - 1)),
                ];
            }

            // Live STT: skip if another transcription is in-flight
            if (sttInFlightRef.current) return;
            sttInFlightRef.current = true;
            try {
                const blob = new Blob(audioChunksRef.current, { type: mimeType ?? 'audio/webm' });
                const audio16k = await blobToMono16k(blob);
                const requestId = makeRequestId('stt');
                sttRequestIdRef.current = requestId;
                sttWorker.postMessage({ type: 'transcribe', data: { audio: audio16k, requestId } });
            } catch {
                sttInFlightRef.current = false;
            }
        };

        recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
            setIsRecording(false);
            // Read from ref so we always get the value set by the most recent STT
            // response, not the stale closure value from when recording started.
            const transcript = liveTranscriptRef.current.trim();
            if (transcript && !input.trim()) {
                setLiveTranscript('');
                void sendText(transcript);
            } else if (transcript) {
                setInput((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                setLiveTranscript('');
            }
            sttInFlightRef.current = false;
            audioChunksRef.current = [];
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000);
    }, [autoLoadAll, busy, input, sendText, stt.ready, sttWorker]);

    const stopRecording = useCallback(() => {
        try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
    }, []);

    return {
        messages,
        streamingContent,
        busy,
        isRecording,
        liveTranscript,
        ttsEnabled,
        input,
        setInput,
        setTtsEnabled,
        sendText,
        sendMessage,
        clearChat,
        startRecording,
        stopRecording,
        scrollContainerRef,
        messagesEndRef,
        shouldAutoScrollRef,
    };
}
