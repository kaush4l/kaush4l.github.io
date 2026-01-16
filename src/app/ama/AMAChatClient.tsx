'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

import { useModelContext } from '@/context/ModelContext';
import { MODELS } from '@/lib/capability';
import { TextStreamAccumulator } from '@/lib/queue-manager';
import { stripMarkdownForSpeech } from '@/lib/voiceText';

const DEFAULT_TTS_SPEAKER = 'Lily';
const DEFAULT_TTS_PLAYBACK_RATE = 1.2;

type Role = 'user' | 'assistant' | 'system';

type ChatMessage = {
    role: Exclude<Role, 'system'>;
    content: string;
};

function makeRequestId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export default function AMAChatClient() {
    const {
        llm,
        stt,
        tts,
        llmWorker,
        sttWorker,
        ttsWorker,
        systemPrompt,
        autoLoadAll,
        modelName,
    } = useModelContext();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState('');
    const [busy, setBusy] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);

    const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');

    // Scrolling + streaming perf
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const streamingBufferRef = useRef('');
    const streamingFlushTimerRef = useRef<number | null>(null);

    // Audio
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<Array<{ audio: Float32Array; sampleRate: number }>>([]);
    const audioPlayingRef = useRef(false);

    // Recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Requests
    const activeLlmRequestIdRef = useRef<string | null>(null);
    const activeTtsRequestIdRef = useRef<string | null>(null);
    const sttRequestIdRef = useRef<string | null>(null);

    const streamAccumulatorRef = useRef<TextStreamAccumulator | null>(null);

    const ready = llm.ready && stt.ready && tts.ready;
    const anyLoading = llm.loading || stt.loading || tts.loading;

    const modelIds = useMemo(
        () => ({
            llm: MODELS.llm.default,
            stt: MODELS.stt.default,
            tts: MODELS.tts.default,
        }),
        []
    );

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior });
    }, []);

    const scheduleStreamingFlush = useCallback(() => {
        if (streamingFlushTimerRef.current) return;
        streamingFlushTimerRef.current = window.setTimeout(() => {
            streamingFlushTimerRef.current = null;
            setStreaming(stripMarkdownForSpeech(streamingBufferRef.current));
            if (shouldAutoScrollRef.current) scrollToBottom('auto');
        }, 75);
    }, [scrollToBottom]);

    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        scrollToBottom('auto');
    }, [messages.length, scrollToBottom]);

    // Avoid hydration mismatch: server render can't know navigator.gpu.
    useEffect(() => {
        setWebgpuSupported(isWebGPUSupported());
    }, []);

    const playNextAudio = useCallback(async () => {
        if (audioPlayingRef.current) return;
        const next = audioQueueRef.current.shift();
        if (!next) return;

        audioPlayingRef.current = true;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const buffer = ctx.createBuffer(1, next.audio.length, next.sampleRate || 16000);
            buffer.getChannelData(0).set(next.audio);

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

    // Build an accumulator that emits sentence chunks to TTS.
    useEffect(() => {
        streamAccumulatorRef.current = new TextStreamAccumulator((sentence) => {
            if (!ttsEnabled || !tts.ready || !ttsWorker) return;
            const requestId = activeTtsRequestIdRef.current;
            if (!requestId) return;

            const clean = stripMarkdownForSpeech(sentence);
            if (!clean) return;

            ttsWorker.postMessage({
                type: 'synthesize',
                data: {
                    text: clean,
                    language: 'en',
                    speaker: DEFAULT_TTS_SPEAKER,
                    requestId,
                },
            });
        });

        return () => {
            streamAccumulatorRef.current = null;
        };
    }, [tts.ready, ttsEnabled, ttsWorker]);

    const ensureModelsLoaded = useCallback(async () => {
        await autoLoadAll();
    }, [autoLoadAll]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setStreaming('');
        streamingBufferRef.current = '';
        setLiveTranscript('');
        activeLlmRequestIdRef.current = null;
        activeTtsRequestIdRef.current = null;
        streamAccumulatorRef.current?.reset?.();
        audioQueueRef.current = [];
    }, []);

    const sendText = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (busy) return;

        // Make the load step explicit and user-visible.
        if (!ready) {
            await ensureModelsLoaded();
        }
        if (!llmWorker || !llm.ready) {
            throw new Error('LLM worker is not ready.');
        }

        setBusy(true);
        setLiveTranscript('');
        setInput('');

        const requestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = requestId;

        const ttsRequestId = makeRequestId('tts');
        activeTtsRequestIdRef.current = ttsRequestId;

        streamAccumulatorRef.current?.reset?.();
        setStreaming('');
        streamingBufferRef.current = '';

        const userMessage: ChatMessage = { role: 'user', content: trimmed };
        setMessages((prev) => [...prev, userMessage]);

        const history = [{ role: 'system', content: systemPrompt }, ...messages, userMessage] as Array<{
            role: Role;
            content: string;
        }>;

        llmWorker.postMessage({
            type: 'generate',
            data: {
                messages: history,
                requestId,
            },
        });
    }, [busy, ensureModelsLoaded, llm.ready, llmWorker, messages, ready, systemPrompt]);

    // Wire worker message handlers.
    useEffect(() => {
        if (!llmWorker) return;

        const onMessage = (e: MessageEvent) => {
            const { type, data } = e.data || {};

            if (type === 'progress' && data?.status === 'stream') {
                const requestId = data?.requestId;
                if (requestId && requestId !== activeLlmRequestIdRef.current) return;

                const chunk = data?.output || '';
                streamingBufferRef.current += chunk;
                streamAccumulatorRef.current?.push?.(chunk);
                scheduleStreamingFlush();
            }

            if (type === 'complete') {
                const payload = typeof data === 'string' ? { output: data } : data;
                const requestId = payload?.requestId;
                if (requestId && requestId !== activeLlmRequestIdRef.current) return;

                // Flush any remaining buffered tokens.
                if (streamingFlushTimerRef.current) {
                    window.clearTimeout(streamingFlushTimerRef.current);
                    streamingFlushTimerRef.current = null;
                }

                const finalText = stripMarkdownForSpeech((payload?.output || '').trim());
                if (finalText) {
                    setMessages((prev) => [...prev, { role: 'assistant', content: finalText }]);
                } else if (streamingBufferRef.current.trim()) {
                    setMessages((prev) => [...prev, { role: 'assistant', content: stripMarkdownForSpeech(streamingBufferRef.current.trim()) }]);
                }

                setStreaming('');
                streamingBufferRef.current = '';
                setBusy(false);
                activeLlmRequestIdRef.current = null;
                streamAccumulatorRef.current?.flush?.();
                if (shouldAutoScrollRef.current) scrollToBottom('auto');
            }

            if (type === 'error') {
                const payload = typeof data === 'string' ? { message: data } : data;
                const requestId = payload?.requestId;
                if (requestId && requestId !== activeLlmRequestIdRef.current) return;

                setBusy(false);
                activeLlmRequestIdRef.current = null;
            }
        };

        llmWorker.addEventListener('message', onMessage);
        return () => {
            llmWorker.removeEventListener('message', onMessage);
            if (streamingFlushTimerRef.current) {
                window.clearTimeout(streamingFlushTimerRef.current);
                streamingFlushTimerRef.current = null;
            }
        };
    }, [llmWorker, scheduleStreamingFlush, scrollToBottom]);

    useEffect(() => {
        if (!ttsWorker) return;

        const onMessage = (e: MessageEvent) => {
            const { type, data } = e.data || {};
            if (type !== 'complete') return;

            const requestId = data?.requestId;
            if (requestId && requestId !== activeTtsRequestIdRef.current) return;

            if (!data?.audio) return;
            const audio = data.audio as Float32Array;
            const sampleRate = (data.sampling_rate || 16000) as number;

            audioQueueRef.current.push({ audio, sampleRate });
            void playNextAudio();
        };

        ttsWorker.addEventListener('message', onMessage);
        return () => ttsWorker.removeEventListener('message', onMessage);
    }, [playNextAudio, ttsWorker]);

    useEffect(() => {
        if (!sttWorker) return;

        const onMessage = (e: MessageEvent) => {
            const { type, data } = e.data || {};
            if (type !== 'transcription') return;

            const payload = typeof data === 'string' ? { text: data } : data;
            const requestId = payload?.requestId;
            if (requestId && requestId !== sttRequestIdRef.current) return;

            const text = (payload?.text || '').trim();
            if (text) setLiveTranscript(text);
        };

        sttWorker.addEventListener('message', onMessage);
        return () => sttWorker.removeEventListener('message', onMessage);
    }, [sttWorker]);

    const blobToFloat32Audio = useCallback(async (blob: Blob) => {
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decoded = await ctx.decodeAudioData(arrayBuffer);

        // Mixdown to mono.
        const channelCount = decoded.numberOfChannels;
        const length = decoded.length;
        const mono = new Float32Array(length);
        for (let ch = 0; ch < channelCount; ch++) {
            const data = decoded.getChannelData(ch);
            for (let i = 0; i < length; i++) mono[i] += data[i] / channelCount;
        }

        const fromSampleRate = decoded.sampleRate;
        const targetSampleRate = 16000;
        if (fromSampleRate === targetSampleRate) return mono;

        const ratio = fromSampleRate / targetSampleRate;
        const newLength = Math.round(mono.length / ratio);
        const out = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
            const srcIndex = Math.round(i * ratio);
            out[i] = mono[Math.min(srcIndex, mono.length - 1)];
        }

        return out;
    }, []);

    const startRecording = useCallback(async () => {
        if (busy) return;
        if (!ready) await ensureModelsLoaded();
        if (!sttWorker || !stt.ready) throw new Error('STT worker is not ready.');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        setIsRecording(true);

        recorder.ondataavailable = (evt) => {
            if (evt.data && evt.data.size > 0) audioChunksRef.current.push(evt.data);
        };

        recorder.onstop = async () => {
            setIsRecording(false);

            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];

            try {
                const floatAudio = await blobToFloat32Audio(blob);
                const requestId = makeRequestId('stt');
                sttRequestIdRef.current = requestId;

                sttWorker.postMessage({
                    type: 'transcribe',
                    data: { audio: floatAudio, requestId },
                });
            } catch {
                // ignore
            } finally {
                try {
                    streamRef.current?.getTracks().forEach((t) => t.stop());
                } catch {
                    // ignore
                }
                streamRef.current = null;
            }
        };

        recorder.start();
    }, [blobToFloat32Audio, busy, ensureModelsLoaded, ready, stt.ready, sttWorker]);

    const stopRecording = useCallback(() => {
        try {
            mediaRecorderRef.current?.stop();
        } catch {
            // ignore
        }
    }, []);

    const onSend = useCallback(async () => {
        const text = (liveTranscript || input).trim();
        await sendText(text);
    }, [input, liveTranscript, sendText]);

    const statusChip = (label: string, state: typeof llm) => {
        if (state.loading) return <Chip label={`${label}: loading ${state.progress}%`} size="small" />;
        if (state.ready) return <Chip label={`${label}: ready`} color="success" size="small" />;
        if (state.error) return <Chip label={`${label}: error`} color="error" size="small" />;
        return <Chip label={`${label}: idle`} size="small" />;
    };

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Box>
                            <Typography variant="h5" fontWeight={700}>AMA</Typography>
                            <Typography variant="body2" color="text.secondary">
                                On-device chat (WebGPU). Models must exist under <code>public/models</code>.
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            {webgpuSupported === null ? (
                                <Chip label="Checking WebGPU..." size="small" />
                            ) : webgpuSupported ? (
                                <Chip label="WebGPU detected" color="success" size="small" />
                            ) : (
                                <Chip label="WebGPU required" color="error" size="small" />
                            )}

                            <IconButton
                                aria-label="toggle tts"
                                size="small"
                                onClick={() => setTtsEnabled((v) => !v)}
                                disabled={!tts.ready && !ttsEnabled}
                            >
                                {ttsEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                            </IconButton>

                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                disabled={anyLoading}
                                onClick={() => void ensureModelsLoaded().catch(() => {})}
                            >
                                Load models
                            </Button>

                            <Button
                                size="small"
                                color="inherit"
                                startIcon={<DeleteIcon />}
                                onClick={clearChat}
                                disabled={busy || anyLoading}
                            >
                                Clear
                            </Button>
                        </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                        <Typography variant="subtitle2">Runtime</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                            {statusChip('LLM', llm)}
                            {statusChip('STT', stt)}
                            {statusChip('TTS', tts)}
                            <Chip label={`LLM: ${modelName}`} size="small" variant="outlined" />
                        </Stack>

                        {(llm.error || stt.error || tts.error) && (
                            <Alert severity="error">
                                {llm.error || stt.error || tts.error}
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2">
                                        Expected local ORT assets: <code>/onnxruntime</code>. Expected local models: <code>/models</code>.
                                    </Typography>
                                </Box>
                            </Alert>
                        )}

                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                            <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">LLM model</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{modelIds.llm}</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">STT model</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{modelIds.stt}</Typography>
                            </Paper>
                            <Paper variant="outlined" sx={{ p: 1.25 }}>
                                <Typography variant="caption" color="text.secondary">TTS model</Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{modelIds.tts}</Typography>
                            </Paper>
                        </Box>
                    </Stack>

                    <Divider />

                    <Paper
                        ref={scrollContainerRef}
                        onScroll={() => {
                            const el = scrollContainerRef.current;
                            if (!el) return;
                            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                            shouldAutoScrollRef.current = distanceFromBottom < 120;
                        }}
                        sx={{
                            p: 2,
                            height: { xs: 420, md: 520 },
                            overflowY: 'auto',
                            bgcolor: 'background.default',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                        }}
                    >
                        <Stack spacing={1.5}>
                            {messages.length === 0 && !streaming && (
                                <Typography variant="body2" color="text.secondary">
                                    Ask anything about Kaushal’s background, experience, and projects.
                                </Typography>
                            )}

                            {messages.map((m, idx) => (
                                <Box
                                    key={`${m.role}-${idx}`}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            maxWidth: '85%',
                                            px: 1.5,
                                            py: 1,
                                            borderRadius: 2,
                                            bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                                            color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                            border: m.role === 'assistant' ? '1px solid' : 'none',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                                    </Box>
                                </Box>
                            ))}

                            {streaming && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <Box
                                        sx={{
                                            maxWidth: '85%',
                                            px: 1.5,
                                            py: 1,
                                            borderRadius: 2,
                                            bgcolor: 'background.paper',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{streaming}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                            <CircularProgress size={14} />
                                            <Typography variant="caption" color="text.secondary">Generating…</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )}

                            {liveTranscript && (
                                <Alert severity="info">
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        Transcript: {liveTranscript}
                                    </Typography>
                                </Alert>
                            )}

                            <div ref={scrollerRef} />
                        </Stack>
                    </Paper>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                        <TextField
                            id="ama-message"
                            name="ama-message"
                            fullWidth
                            placeholder={ready ? 'Type a message…' : 'Load models to start…'}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={busy || anyLoading}
                            multiline
                            maxRows={4}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void onSend().catch(() => {});
                                }
                            }}
                        />

                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <IconButton
                                aria-label={isRecording ? 'stop recording' : 'start recording'}
                                color={isRecording ? 'error' : 'primary'}
                                onClick={() => {
                                    if (isRecording) stopRecording();
                                    else void startRecording().catch(() => {});
                                }}
                                disabled={busy || anyLoading}
                            >
                                {isRecording ? <StopIcon /> : <MicIcon />}
                            </IconButton>

                            <Button
                                variant="contained"
                                endIcon={<SendIcon />}
                                onClick={() => void onSend().catch(() => {})}
                                disabled={busy || anyLoading || (!input.trim() && !liveTranscript.trim())}
                            >
                                Send
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}
