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

export default function ChatWidget() {
    const theme = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const { llm, stt, tts, llmWorker, sttWorker, ttsWorker, modelName, systemPrompt } = useModelContext();

    // Messages & State
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');

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

    // TTS Settings
    const [ttsEnabled, setTtsEnabled] = useState(true);

    // --- Initialization ---

    // Initialize Stream Accumulator
    useEffect(() => {
        streamAccumulatorRef.current = new TextStreamAccumulator((sentence) => {
            if (ttsEnabled && tts.ready && ttsWorker) {
                ttsWorker.postMessage({
                    type: 'synthesize',
                    data: { text: sentence, generation_config: { speed: 1.0 } }
                });
            }
        });
    }, [ttsEnabled, tts.ready, ttsWorker]);

    // Handle Worker Messages (LLM & STT & TTS)
    useEffect(() => {
        if (!llmWorker) return;

        const llmHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'progress' && data.status === 'stream') {
                const token = data.output;
                setStreamingContent(prev => prev + token);
                if (ttsEnabled) streamAccumulatorRef.current?.add(token);
            } else if (type === 'complete') {
                setMessages(prev => [...prev, { role: 'assistant', content: data }]);
                if (ttsEnabled) streamAccumulatorRef.current?.flush();
                setStreamingContent('');
                setProcessing(false);
            } else if (type === 'error') {
                setProcessing(false);
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data}` }]);
            }
        };

        llmWorker.addEventListener('message', llmHandler);
        return () => llmWorker.removeEventListener('message', llmHandler);
    }, [llmWorker, ttsEnabled]);

    useEffect(() => {
        if (!sttWorker) return;

        const sttHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'transcription') {
                const text = data.trim();
                setLiveTranscript(text);
                // Auto-stop recording logic could go here, or we wait for stop
                // Actually for real-time we might want continuous, but let's stick to "record -> stop -> send" for stability
            }
        };

        sttWorker.addEventListener('message', sttHandler);
        return () => sttWorker.removeEventListener('message', sttHandler);
    }, [sttWorker]);

    // Audio Playback Queue
    const audioQueue = useRef<Float32Array[]>([]);
    const isPlaying = useRef(false);

    const playNext = async () => {
        if (isPlaying.current || audioQueue.current.length === 0) return;
        isPlaying.current = true;

        const audioData = audioQueue.current.shift();
        if (audioData) {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const buffer = ctx.createBuffer(1, audioData.length, 16000);
            buffer.getChannelData(0).set(audioData);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => {
                isPlaying.current = false;
                playNext();
            };
            source.start();
        } else {
            isPlaying.current = false;
        }
    };

    useEffect(() => {
        if (!ttsWorker) return;

        const ttsHandler = (e: MessageEvent) => {
            const { type, data } = e.data;
            if (type === 'complete') {
                audioQueue.current.push(data);
                playNext();
            }
        };

        ttsWorker.addEventListener('message', ttsHandler);
        return () => ttsWorker.removeEventListener('message', ttsHandler);
    }, [ttsWorker]);

    // --- Actions ---

    const sendMessage = () => {
        const text = input.trim();
        const transcript = liveTranscript.trim();
        const content = [text, transcript].filter(Boolean).join(' '); // Combine inputs

        if ((!content && !selectedImage) || processing || !llm.ready) return;

        const userMsg: Message = {
            role: 'user',
            content: selectedImage ? `![image](${selectedImage})\n${content}` : content
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLiveTranscript('');
        setProcessing(true);
        setStreamingContent('');

        // Construct history - Ensure System Prompt is first
        const history = [{ role: 'system', content: systemPrompt }, ...messages, userMsg];

        llmWorker?.postMessage({
            type: 'generate',
            data: {
                messages: history,
                images: selectedImage ? [selectedImage] : []
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
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
                streamRef.current = stream;
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    // Convert to float32
                    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    const channelData = audioBuffer.getChannelData(0);

                    // Resample if needed
                    // Send to worker
                    sttWorker?.postMessage({ type: 'transcribe', data: { audio: channelData } });

                    stream.getTracks().forEach(t => t.stop());
                };

                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start();
                setIsRecording(true);
                setLiveTranscript('');
            } catch (e) {
                console.error(e);
            }
        }
    };

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent, liveTranscript]);

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
                                {(!llm.ready || processing) && (
                                    <CircularProgress
                                        size={72}
                                        sx={{
                                            position: 'absolute',
                                            top: -4,
                                            left: -4,
                                            color: processing ? 'secondary.main' : 'success.main',
                                            opacity: 0.6
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
                                            {modelName} • {llm.ready ? 'Online' : 'Loading...'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box>
                                    <IconButton size="small" color="inherit" onClick={() => setTtsEnabled(!ttsEnabled)}>
                                        {ttsEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                                    </IconButton>
                                    <IconButton size="small" color="inherit" onClick={() => setIsOpen(false)}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Messages */}
                            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                            onClick={sendMessage}
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
