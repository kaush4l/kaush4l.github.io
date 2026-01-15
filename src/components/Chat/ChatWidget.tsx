'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Paper,
    Fade,
    Slide,
    Avatar,
    Tooltip,
    Stack,
    CircularProgress,
    alpha,
    useTheme,
    Badge,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ImageIcon from '@mui/icons-material/Image';
import { useModelContext } from '@/context/ModelContext';
import { TextStreamAccumulator, AsyncQueue } from '@/lib/queue-manager';
import { AnimatePresence, motion } from 'framer-motion';

// --- Shared Types ---
interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

function makeRequestId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function ChatWidget() {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const { llm, stt, tts, llmWorker, sttWorker, ttsWorker, modelName, systemPrompt, autoLoadAll } = useModelContext();

    // Messages & State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');

    // Reduce main-thread churn during streaming.
    const streamingBufferRef = useRef('');
    const streamingFlushTimerRef = useRef<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);

    // Media & Hardware
    const [isRecording, setIsRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Refs for streams/workers
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const streamAccumulatorRef = useRef<TextStreamAccumulator | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Request correlation (workers are shared via ModelContext)
    const activeLlmRequestIdRef = useRef<string | null>(null);
    const activeTtsRequestIdRef = useRef<string | null>(null);
    const sttInFlightRef = useRef(false);
    const sttLastRequestIdRef = useRef<string | null>(null);
    const lastTranscriptAtRef = useRef<number>(0);

    const resampleTo16k = useCallback((input: Float32Array, fromSampleRate: number) => {
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
    }, []);

    // TTS Settings
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [autoSendOnStop] = useState(true);

    // --- Initialization ---

    // Ensure models are loaded when the dialog is opened (AMA-style behavior)
    useEffect(() => {
        if (!isOpen) return;

        const anyReady = llm.ready && stt.ready && tts.ready;
        const anyLoading = llm.loading || stt.loading || tts.loading;
        const anyError = !!llm.error || !!stt.error || !!tts.error;

        if (!anyReady && !anyLoading && !anyError) {
            void autoLoadAll().catch(() => {
                // Errors are reflected in context state.
            });
        }
    }, [isOpen, llm.ready, stt.ready, tts.ready, llm.loading, stt.loading, tts.loading, llm.error, stt.error, tts.error, autoLoadAll]);

    // Initialize Stream Accumulator
    useEffect(() => {
        streamAccumulatorRef.current = new TextStreamAccumulator((sentence) => {
            if (ttsEnabled && tts.ready && ttsWorker) {
                const requestId = activeTtsRequestIdRef.current;
                if (!requestId) return;
                ttsWorker.postMessage({
                    type: 'synthesize',
                    data: {
                        text: sentence,
                        language: 'en',
                        speaker: 'Lily',
                        generation_config: { speed: 1.0 },
                        requestId,
                    }
                });
            }
        });
    }, [ttsEnabled, tts.ready, ttsWorker]);

    // Handle Worker Messages (LLM & STT & TTS)
    useEffect(() => {
        if (!llmWorker) return;

        const scheduleStreamingFlush = () => {
            if (!isOpen) return; // Don't re-render the whole page when the widget is closed.
            if (streamingFlushTimerRef.current) return;

            streamingFlushTimerRef.current = window.setTimeout(() => {
                streamingFlushTimerRef.current = null;
                setStreamingContent(streamingBufferRef.current);

                if (shouldAutoScrollRef.current) {
                    const el = scrollContainerRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
                }
            }, 75);
        };

        const llmHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'progress' && data?.status === 'stream') {
                const requestId = data?.requestId;
                if (!requestId || requestId !== activeLlmRequestIdRef.current) return;
                const token = data.output;
                streamingBufferRef.current += token;
                scheduleStreamingFlush();
                if (ttsEnabled) streamAccumulatorRef.current?.add(token);
            } else if (type === 'complete') {
                const requestId = typeof data === 'object' ? data?.requestId : undefined;
                const output = typeof data === 'object' ? data?.output : data;
                if (!requestId || requestId !== activeLlmRequestIdRef.current) return;

                // Flush any remaining buffered tokens.
                if (streamingFlushTimerRef.current) {
                    window.clearTimeout(streamingFlushTimerRef.current);
                    streamingFlushTimerRef.current = null;
                }
                const finalText = (typeof output === 'string' ? output : '') || streamingBufferRef.current;
                streamingBufferRef.current = '';

                setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
                if (ttsEnabled) streamAccumulatorRef.current?.flush();
                setStreamingContent('');
                setProcessing(false);
                activeLlmRequestIdRef.current = null;
            } else if (type === 'error') {
                const requestId = typeof data === 'object' ? data?.requestId : undefined;
                const message = typeof data === 'object' ? data?.message : data;
                if (!requestId || requestId !== activeLlmRequestIdRef.current) return;
                setProcessing(false);
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${message}` }]);
                activeLlmRequestIdRef.current = null;
            }
        };

        llmWorker.addEventListener('message', llmHandler);
        return () => {
            llmWorker.removeEventListener('message', llmHandler);
            if (streamingFlushTimerRef.current) {
                window.clearTimeout(streamingFlushTimerRef.current);
                streamingFlushTimerRef.current = null;
            }
        };
    }, [isOpen, llmWorker, ttsEnabled]);

    useEffect(() => {
        if (!sttWorker) return;

        const sttHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'transcription') {
                const requestId = typeof data === 'object' ? data?.requestId : undefined;
                const text = (typeof data === 'object' ? data?.text : data)?.trim?.() ?? '';
                if (requestId && sttLastRequestIdRef.current && requestId !== sttLastRequestIdRef.current) return;
                setLiveTranscript(text);
                lastTranscriptAtRef.current = Date.now();
                sttInFlightRef.current = false;
            }
            if (type === 'error') {
                sttInFlightRef.current = false;
            }
        };

        sttWorker.addEventListener('message', sttHandler);
        return () => sttWorker.removeEventListener('message', sttHandler);
    }, [sttWorker]);

    // Audio Playback Queue
    type TtsAudioChunk = { audio: Float32Array; sampleRate: number };
    const audioQueue = useRef<TtsAudioChunk[]>([]);
    const isPlaying = useRef(false);

    const playNext = useCallback(async () => {
        if (isPlaying.current || audioQueue.current.length === 0) return;
        isPlaying.current = true;

        const chunk = audioQueue.current.shift();
        if (chunk?.audio) {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const buffer = ctx.createBuffer(1, chunk.audio.length, chunk.sampleRate || 16000);
            buffer.getChannelData(0).set(chunk.audio);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => {
                isPlaying.current = false;
                void playNext();
            };
            source.start();
        } else {
            isPlaying.current = false;
        }
    }, []);

    useEffect(() => {
        if (!ttsWorker) return;

        const ttsHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'complete') {
                const requestId = data?.requestId;
                if (requestId && activeTtsRequestIdRef.current && requestId !== activeTtsRequestIdRef.current) return;
                if (!requestId && activeTtsRequestIdRef.current) return;
                const audio = data?.audio ?? data;
                const sampleRate = data?.sampling_rate ?? 16000;
                if (audio) {
                    audioQueue.current.push({ audio, sampleRate });
                }
                void playNext();
            }
        };

        ttsWorker.addEventListener('message', ttsHandler);
        return () => ttsWorker.removeEventListener('message', ttsHandler);
    }, [ttsWorker, playNext]);

    // --- Actions ---

    const sendMessage = (overrideContent?: string) => {
        const text = input.trim();
        const transcript = liveTranscript.trim();
        const content = overrideContent ?? [text, transcript].filter(Boolean).join(' '); // Combine inputs

        if ((!content && !selectedImage) || processing || !llm.ready) return;

        const requestId = makeRequestId('llm');
        activeLlmRequestIdRef.current = requestId;
        activeTtsRequestIdRef.current = requestId;

        const userMsg: Message = {
            role: 'user',
            content: selectedImage ? `![image](${selectedImage})\n${content}` : content
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLiveTranscript('');
        setProcessing(true);
        setStreamingContent('');
        streamingBufferRef.current = '';

        // Construct history - Ensure System Prompt is first
        const history = [{ role: 'system', content: systemPrompt }, ...messages, userMsg];

        llmWorker?.postMessage({
            type: 'generate',
            data: {
                messages: history,
                images: selectedImage ? [selectedImage] : [],
                requestId,
            }
        });

        setSelectedImage(null);
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            if (!stt.ready) return; // Alert?
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
                streamRef.current = stream;

                const preferredMimeTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/mp4',
                ];
                const mimeType = preferredMimeTypes.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t));
                const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = async (e) => {
                    if (!e.data?.size) return;
                    audioChunksRef.current.push(e.data);

                    // Live STT: transcribe the growing audio buffer once per chunk.
                    if (sttInFlightRef.current) return;
                    sttInFlightRef.current = true;

                    try {
                        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const arrayBuffer = await blob.arrayBuffer();
                        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                        const channelData = audioBuffer.getChannelData(0);
                        const audio16k = resampleTo16k(channelData, audioBuffer.sampleRate);

                        const requestId = makeRequestId('stt');
                        sttLastRequestIdRef.current = requestId;
                        sttWorker?.postMessage({ type: 'transcribe', data: { audio: audio16k, requestId } });
                    } catch (err) {
                        console.error(err);
                        sttInFlightRef.current = false;
                    }
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(t => t.stop());

                    const transcript = liveTranscript.trim();
                    if (!transcript) {
                        setLiveTranscript('');
                        sttInFlightRef.current = false;
                        return;
                    }

                    if (autoSendOnStop && !input.trim()) {
                        setLiveTranscript('');
                        sendMessage(transcript);
                    } else {
                        // Commit the transcript into the input for editing/sending.
                        setInput(prev => {
                            const trimmed = prev.trim();
                            return trimmed ? `${trimmed} ${transcript}` : transcript;
                        });
                        setLiveTranscript('');
                    }
                    sttInFlightRef.current = false;
                };

                mediaRecorderRef.current = mediaRecorder;
                lastTranscriptAtRef.current = Date.now();
                mediaRecorder.start(1000);
                setIsRecording(true);
                setLiveTranscript('');
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Auto-stop on silence (no transcript updates)
    useEffect(() => {
        if (!isRecording) return;
        const interval = setInterval(() => {
            if (Date.now() - lastTranscriptAtRef.current > 2500) {
                mediaRecorderRef.current?.stop();
                setIsRecording(false);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [isRecording]);

    // Auto-scroll
    useEffect(() => {
        if (!isOpen) return;
        if (!shouldAutoScrollRef.current) return;
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
    }, [isOpen, messages.length]);

    return (
        <>
            {/* Floating FAB */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
                    >
                        <Tooltip title="Ask Me Anything" placement="left">
                            <Box sx={{ position: 'relative' }}>
                                <IconButton
                                    data-testid="chat-open"
                                    aria-label="open chat"
                                    onClick={() => setIsOpen(true)}
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        boxShadow: 6,
                                        '&:hover': { bgcolor: 'primary.dark' }
                                    }}
                                >
                                    <ChatIcon fontSize="large" />
                                </IconButton>
                                {/* Loading Badge */}
                                {((llm.loading || stt.loading || tts.loading || processing) || llm.error || stt.error || tts.error) && (
                                    <CircularProgress
                                        size={72}
                                        sx={{
                                            position: 'absolute',
                                            top: -4,
                                            left: -4,
                                            color: (llm.error || stt.error || tts.error) ? 'error.main' : (processing ? 'secondary.main' : 'success.main'),
                                            opacity: 0.6,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            width: 'min(90vw, 400px)',
                            height: 'min(80vh, 600px)',
                            zIndex: 1200,
                            pointerEvents: 'none' // allow clicking through empty space if we had any, but here we fill it
                        }}
                    >
                        <Paper
                            sx={{
                                pointerEvents: 'auto',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                borderRadius: 4,
                                boxShadow: 24,
                                border: '1px solid',
                                borderColor: 'divider'
                            }}
                        >
                            {/* Header */}
                            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 32, height: 32 }}>AI</Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>Chat with Kaushal</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                            {modelName} • {(llm.error || stt.error || tts.error) ? 'Error' : (llm.ready ? 'Online' : 'Loading...')}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box>
                                    <IconButton
                                        data-testid="chat-tts-toggle"
                                        aria-label="toggle tts"
                                        size="small"
                                        color="inherit"
                                        onClick={() => setTtsEnabled(!ttsEnabled)}
                                    >
                                        {ttsEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                                    </IconButton>
                                    <IconButton
                                        data-testid="chat-close"
                                        aria-label="close chat"
                                        size="small"
                                        color="inherit"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Messages */}
                            <Box
                                data-testid="chat-messages"
                                ref={scrollContainerRef}
                                onScroll={() => {
                                    const el = scrollContainerRef.current;
                                    if (!el) return;
                                    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                                    shouldAutoScrollRef.current = distanceFromBottom < 80;
                                }}
                                sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}
                            >
                                {/* Model load status / errors */}
                                {(!!llm.error || !!stt.error || !!tts.error) && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {llm.error || stt.error || tts.error}
                                        </Typography>
                                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                            <Button
                                                data-testid="chat-retry-models"
                                                size="small"
                                                variant="contained"
                                                color="inherit"
                                                onClick={() => void autoLoadAll().catch(() => {})}
                                            >
                                                Retry loading models
                                            </Button>
                                        </Box>
                                    </Paper>
                                )}

                                {(!llm.ready || !stt.ready || !tts.ready) && !llm.error && !stt.error && !tts.error && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                                        <Typography variant="body2">
                                            Loading on-device models (WebGPU required)…
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            STT {stt.loading ? `${stt.progress}%` : stt.ready ? '✓' : '…'} • LLM {llm.loading ? `${llm.progress}%` : llm.ready ? '✓' : '…'} • TTS {tts.loading ? `${tts.progress}%` : tts.ready ? '✓' : '…'}
                                        </Typography>
                                    </Paper>
                                )}

                                {messages.length === 0 && (
                                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                                        <ChatIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                                        <Typography variant="body2">
                                            Back online! Ask me anything about my projects, experience, or skills.
                                        </Typography>
                                    </Box>
                                )}

                                {messages.map((msg, i) => (
                                    <Box key={i} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 3,
                                                bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                                                color: msg.role === 'user' ? 'white' : 'text.primary',
                                                borderTopRightRadius: msg.role === 'user' ? 0 : 3,
                                                borderTopLeftRadius: msg.role === 'assistant' ? 0 : 3
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                                        </Paper>
                                    </Box>
                                ))}

                                {/* Streaming / Processing Indicator */}
                                {(streamingContent || processing) && (
                                    <Box sx={{ alignSelf: 'flex-start', maxWidth: '85%', minWidth: 40 }}>
                                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover', borderTopLeftRadius: 0 }}>
                                            {streamingContent ? (
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{streamingContent}</Typography>
                                            ) : (
                                                <Stack direction="row" spacing={0.5} sx={{ p: 0.5 }}>
                                                    <Box sx={{ width: 6, height: 6, bgcolor: 'text.secondary', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0s' }} />
                                                    <Box sx={{ width: 6, height: 6, bgcolor: 'text.secondary', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.16s' }} />
                                                    <Box sx={{ width: 6, height: 6, bgcolor: 'text.secondary', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both 0.32s' }} />
                                                    <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
                                                </Stack>
                                            )}
                                        </Paper>
                                    </Box>
                                )}

                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Inputs */}
                            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                {/* Image Preview */}
                                {selectedImage && (
                                    <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box
                                            component="img"
                                            src={selectedImage}
                                            sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }}
                                        />
                                        <Typography variant="caption" noWrap sx={{ maxWidth: 100 }}>Image Selected</Typography>
                                        <IconButton size="small" onClick={() => setSelectedImage(null)}><CloseIcon fontSize="small" /></IconButton>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        ref={cameraInputRef}
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    <IconButton size="small" color={selectedImage ? "primary" : "default"} onClick={() => cameraInputRef.current?.click()}>
                                        <CameraAltIcon />
                                    </IconButton>

                                    <TextField
                                        fullWidth
                                        placeholder={!llm.ready ? "Loading models..." : isRecording ? "Listening..." : "Type a message..."}
                                        size="small"
                                        variant="outlined"
                                        value={isRecording ? liveTranscript : input}
                                        onChange={(e) => isRecording ? null : setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                        disabled={!llm.ready || processing || isRecording}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'action.hover' },
                                            '& textarea': { height: '24px' }
                                        }}
                                    />

                                    {!input.trim() && !liveTranscript && !selectedImage ? (
                                        <IconButton
                                            color={isRecording ? "error" : "default"}
                                            onClick={toggleRecording}
                                            disabled={!stt.ready}
                                            sx={{
                                                bgcolor: isRecording ? 'error.light' : 'transparent',
                                                '&:hover': { bgcolor: isRecording ? 'error.main' : 'action.hover' }
                                            }}
                                        >
                                            {isRecording ? <StopIcon /> : <MicIcon />}
                                        </IconButton>
                                    ) : (
                                        <IconButton
                                            color="primary"
                                            onClick={() => sendMessage()}
                                            disabled={processing}
                                        >
                                            <SendIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
