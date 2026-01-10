'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Card,
    CardContent,
    IconButton,
    LinearProgress,
    Stack,
    Chip,
    Paper,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

import { checkCapability, CapabilityResult, MODELS } from '@/lib/capability';
import { TextStreamAccumulator, AsyncQueue } from '@/lib/queue-manager';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface ModelState {
    loaded: boolean;
    loading: boolean;
    progress: number;
    error?: string;
}

// Audio context for processing
let audioContext: AudioContext | null = null;

interface AMAClientProps {
    initialSystemPrompt: string;
}

export default function AMAClient({ initialSystemPrompt }: AMAClientProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [capability, setCapability] = useState<CapabilityResult | null>(null);
    const [processing, setProcessing] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);

    // STT state
    const [sttState, setSTTState] = useState<ModelState>({ loaded: false, loading: false, progress: 0 });
    const [isRecording, setIsRecording] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const liveTranscriptRef = useRef('');
    const lastTranscriptTimeRef = useRef(0);

    // LLM state
    const [llmState, setLLMState] = useState<ModelState>({ loaded: false, loading: false, progress: 0 });
    const [selectedLLM, setSelectedLLM] = useState<string>(''); // Will be set by capability check
    const [streamingContent, setStreamingContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // TTS state
    const [ttsState, setTTSState] = useState<ModelState>({ loaded: false, loading: false, progress: 0 });
    const [ttsSettings, setTTSSettings] = useState<{ speed: number; autoPlay: boolean }>({ speed: 1.0, autoPlay: true });

    // Audio Queue Logic
    const ttsWorkerRef = useRef<Worker | null>(null);
    const ttsQueueRef = useRef<AsyncQueue<string> | null>(null);
    const streamAccumulatorRef = useRef<TextStreamAccumulator | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sttWorkerRef = useRef<Worker | null>(null);
    const llmWorkerRef = useRef<Worker | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const isWorkerBusyRef = useRef(false);

    // Camera Input Ref
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Initialize Capability and Default Models
    useEffect(() => {
        checkCapability().then((result) => {
            setCapability(result);
            // Auto-select recommended LLM based on HW tier
            setSelectedLLM(result.recommended.llm);
        });

        if (typeof window !== 'undefined') {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Initialize TTS Queue
        ttsQueueRef.current = new AsyncQueue<string>(async (sentence) => {
            return new Promise<void>((resolve, reject) => {
                if (!ttsWorkerRef.current) return resolve();

                const handler = (e: MessageEvent) => {
                    const { type, data } = e.data;
                    if (type === 'complete') {
                        playAudio(data).then(() => {
                            ttsWorkerRef.current?.removeEventListener('message', handler);
                            resolve();
                        });
                    } else if (type === 'error') {
                        console.error('TTS Error:', data);
                        ttsWorkerRef.current?.removeEventListener('message', handler);
                        resolve(); // Skip on error
                    }
                };

                // We need to add a temporary listener for THIS specific synthesis request
                // However, the worker is global. 
                // BETTER APPROACH: The worker sends 'complete'. 
                // To make this AsyncQueue work with the Event-based worker, we can't easily correlate 1:1 without IDs.
                // SIMPLIFICATION: We will use the main worker listener to push audio to an AudioPlayer queue, 
                // and this AsyncQueue will just be responsible for SENDING content to the worker with a small delay if needed.

                // RE-DESIGN: The TTS Worker is fast. The bottleneck is playback.
                // We should send text to TTS worker. TTS worker sends Audio. We put Audio in AudioQueue.
                // So we don't need to await the playback here. We just await the dispatch.

                ttsWorkerRef.current?.postMessage({
                    type: 'synthesize',
                    data: { text: sentence, generation_config: { speed: ttsSettings.speed } }
                });

                // We resolve immediately to allow pipelining, OR we wait for "complete" message?
                // If we wait, we ensure order generation.
                // Let's rely on the worker's serial processing or just sequential postMessages.
                resolve();
            });
        });

        // Initialize Stream Accumulator
        streamAccumulatorRef.current = new TextStreamAccumulator((sentence) => {
            if (ttsSettings.autoPlay && ttsWorkerRef.current && ttsState.loaded) {
                // Send to TTS Worker
                ttsWorkerRef.current.postMessage({
                    type: 'synthesize',
                    data: { text: sentence, generation_config: { speed: ttsSettings.speed } }
                });
            }
        });

        return () => {
            sttWorkerRef.current?.terminate();
            llmWorkerRef.current?.terminate();
            ttsWorkerRef.current?.terminate();
            if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, liveTranscript, streamingContent]);

    // Update Header Status
    useEffect(() => {
        // This would communicate with Layout if status uplifting was implemented, 
        // but for now we keep local state or could dispatch a custom event.
    }, [llmState, sttState, ttsState]);


    const convertAudioToFloat32 = async (audioBlob: Blob): Promise<Float32Array> => {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const arrayBuffer = await audioBlob.arrayBuffer();
        try {
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const audioData = audioBuffer.getChannelData(0);

            // Resample to 16kHz if needed (Whisper expects 16k)
            const targetSampleRate = 16000;
            if (audioBuffer.sampleRate !== targetSampleRate) {
                const ratio = audioBuffer.sampleRate / targetSampleRate;
                const newLength = Math.round(audioData.length / ratio);
                const resampledData = new Float32Array(newLength);
                for (let i = 0; i < newLength; i++) {
                    const srcIndex = Math.round(i * ratio);
                    resampledData[i] = audioData[Math.min(srcIndex, audioData.length - 1)];
                }
                return resampledData;
            }
            return audioData;
        } catch (e) {
            return new Float32Array(0);
        }
    };

    const loadSTTModel = useCallback(async () => {
        setSTTState({ loaded: false, loading: true, progress: 0 });
        try {
            const worker = new Worker(new URL('../../workers/stt.worker.ts', import.meta.url), { type: 'module' });
            sttWorkerRef.current = worker;
            worker.onmessage = (e) => {
                const { type, data } = e.data;
                if (type === 'progress') setSTTState((prev) => ({ ...prev, progress: Math.round((data.progress ?? 0) * 100) }));
                else if (type === 'ready') setSTTState({ loaded: true, loading: false, progress: 100 });
                else if (type === 'error') {
                    setSTTState({ loaded: false, loading: false, progress: 0, error: data });
                    setTranscribing(false);
                    isWorkerBusyRef.current = false;
                } else if (type === 'transcription') {
                    const text = data.trim();
                    if (text) {
                        setLiveTranscript(text);
                        liveTranscriptRef.current = text;
                        lastTranscriptTimeRef.current = Date.now();
                    }
                    setTranscribing(false);
                    isWorkerBusyRef.current = false;
                }
            };
            worker.postMessage({ type: 'load' });
        } catch (error: any) {
            setSTTState({ loaded: false, loading: false, progress: 0, error: error.message });
        }
    }, []);

    // --- Audio Playback Queue ---
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);

    const playAudio = async (audioData: Float32Array) => {
        return new Promise<void>(async (resolve) => {
            if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') await audioContext.resume();

            const buffer = audioContext.createBuffer(1, audioData.length, 16000); // 16kHz for MMS/SpeechT5 usually, verify?
            // Note: MMS might be 24k or 16k. The worker should ideally return sample rate, but we assume 16k or allow content to dictate.
            // Actually speecht5 is 16k. MMS might be different.
            // For now assuming 16k or whatever the context handles.
            // If it sounds wrong, we need sample rate from worker.

            buffer.getChannelData(0).set(audioData);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);

            source.onended = () => {
                resolve();
            };

            source.start();
        });
    };

    const processAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        while (audioQueueRef.current.length > 0) {
            const next = audioQueueRef.current.shift();
            if (next) {
                await playAudio(next);
            }
        }

        isPlayingRef.current = false;
    };

    const handleTTSMessage = useCallback((e: MessageEvent) => {
        const { type, data } = e.data;
        if (type === 'progress') setTTSState((prev) => ({ ...prev, progress: Math.round((data.progress ?? 0) * 100) }));
        else if (type === 'ready') setTTSState({ loaded: true, loading: false, progress: 100 });
        else if (type === 'error') setTTSState({ loaded: false, loading: false, progress: 0, error: data });
        else if (type === 'complete') {
            audioQueueRef.current.push(data);
            processAudioQueue();
        }
    }, []);

    const loadTTSModel = useCallback(async () => {
        setTTSState({ loaded: false, loading: true, progress: 0 });
        try {
            const worker = new Worker(new URL('../../workers/tts.worker.ts', import.meta.url), { type: 'module' });
            ttsWorkerRef.current = worker;
            worker.onmessage = handleTTSMessage;
            worker.postMessage({ type: 'load', data: { model: MODELS.tts.default } });
        } catch (error: any) {
            setTTSState({ loaded: false, loading: false, progress: 0, error: error.message });
        }
    }, [handleTTSMessage]);

    const speakText = useCallback((text: string) => {
        if (ttsWorkerRef.current && ttsState.loaded && text.trim()) {
            ttsWorkerRef.current.postMessage({ type: 'synthesize', data: { text, generation_config: { speed: ttsSettings.speed } } });
        }
    }, [ttsState.loaded, ttsSettings]);

    const loadLLMModel = useCallback(async () => {
        if (!selectedLLM) return;
        setLLMState({ loaded: false, loading: true, progress: 0 });
        try {
            llmWorkerRef.current?.terminate();
            const worker = new Worker(new URL('../../workers/llm.worker.ts', import.meta.url), { type: 'module' });
            llmWorkerRef.current = worker;
            worker.onmessage = (e) => {
                const { type, data } = e.data;
                if (type === 'progress') {
                    if (data.status === 'stream') {
                        const token = data.output;
                        setStreamingContent((prev) => prev + token);
                        // Add to stream accumulator for TTS
                        if (ttsSettings.autoPlay && ttsState.loaded) {
                            streamAccumulatorRef.current?.add(token);
                        }
                    } else {
                        setLLMState((prev) => ({ ...prev, progress: Math.round((data.progress ?? 0) * 100) }));
                    }
                } else if (type === 'ready') setLLMState({ loaded: true, loading: false, progress: 100 });
                else if (type === 'complete') {
                    const finalResponse = data;
                    setMessages((prev) => [...prev, { role: 'assistant', content: finalResponse }]);

                    // Flush remaining TTS
                    if (ttsSettings.autoPlay && ttsState.loaded) {
                        streamAccumulatorRef.current?.flush();
                    }

                    setStreamingContent('');
                    setProcessing(false);
                } else if (type === 'error') {
                    setLLMState({ loaded: false, loading: false, progress: 0, error: data });
                    setProcessing(false);
                }
            };
            worker.postMessage({ type: 'load', data: { model: selectedLLM } });
        } catch (error: any) {
            setLLMState({ loaded: false, loading: false, progress: 0, error: error.message });
        }
    }, [selectedLLM, ttsSettings.autoPlay, ttsState.loaded]);

    const startRecording = useCallback(async () => {
        if (!sttState.loaded) return alert('Please load the STT model first');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            mediaRecorderRef.current = mediaRecorder;
            setLiveTranscript('');
            liveTranscriptRef.current = '';
            lastTranscriptTimeRef.current = Date.now();
            setIsRecording(true);
            mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    if (!isWorkerBusyRef.current && sttWorkerRef.current) {
                        isWorkerBusyRef.current = true;
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        const audioFloat32 = await convertAudioToFloat32(audioBlob);
                        if (audioFloat32.length > 0) {
                            setTranscribing(true);
                            sttWorkerRef.current.postMessage({ type: 'transcribe', data: { audio: audioFloat32 } });
                        } else isWorkerBusyRef.current = false;
                    }
                }
            };
            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false);
                const finalTranscript = liveTranscriptRef.current;
                if (finalTranscript) {
                    setInput((prev) => {
                        const trimmed = prev.trim();
                        return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
                    });
                }
                setLiveTranscript('');
                liveTranscriptRef.current = '';
            };
            mediaRecorder.start(1000);
        } catch (error: any) {
            alert('Could not access microphone: ' + error.message);
        }
    }, [sttState.loaded]);

    const stopRecording = useCallback(() => mediaRecorderRef.current?.stop(), []);

    // Silence detection
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            lastTranscriptTimeRef.current = Date.now();
            interval = setInterval(() => {
                if (Date.now() - lastTranscriptTimeRef.current > 2000) {
                    stopRecording();
                }
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isRecording, stopRecording]);

    const sendMessage = async () => {
        if ((!input.trim() && !liveTranscript && !selectedImage) || processing) return;
        const finalContent = input.trim() + (liveTranscript ? (input ? ' ' : '') + liveTranscript : '');
        const userMessage: Message = {
            role: 'user',
            content: selectedImage ? `![image](${selectedImage})\n${finalContent}` : finalContent
        };
        const chatHistory: Message[] = [{ role: 'system', content: systemPrompt }, ...messages, userMessage];
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLiveTranscript('');
        setProcessing(true);
        setStreamingContent('');

        if (llmWorkerRef.current && llmState.loaded) {
            llmWorkerRef.current.postMessage({
                type: 'generate',
                data: {
                    messages: chatHistory,
                    images: selectedImage ? [selectedImage] : []
                }
            });
            setSelectedImage(null);
        } else {
            setTimeout(() => {
                setMessages((prev) => [...prev, { role: 'assistant', content: 'LLM not loaded. I received: \n' + finalContent }]);
                setProcessing(false);
            }, 500);
        }
    };

    const performCameraAction = () => {
        cameraInputRef.current?.click();
    };

    const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const clearChat = () => setMessages([]);

    return (
        <>
            <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Sidebar Panel */}
                <Box sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>AI Models</Typography>

                    {capability && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            System: {capability.tier} | {capability.details.webgpu ? 'WebGPU' : 'WASM'}
                        </Alert>
                    )}

                    {/* STT Model Card */}
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Speech-to-Text</Typography>
                            {sttState.loaded ? <Chip icon={<CheckCircleIcon />} label="Ready" color="success" /> : (
                                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={loadSTTModel} disabled={sttState.loading} fullWidth size="small">
                                    {sttState.loading ? `Loading ${sttState.progress}%` : 'Load STT'}
                                </Button>
                            )}
                            {sttState.loading && <LinearProgress variant="determinate" value={sttState.progress} sx={{ mt: 1 }} />}
                        </CardContent>
                    </Card>

                    {/* LLM Model Card */}
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Language Model</Typography>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                                {selectedLLM ? selectedLLM.split('/').pop() : 'Detecting...'}
                            </Typography>
                            {llmState.loaded ? <Chip icon={<CheckCircleIcon />} label="Ready" color="success" /> : (
                                <Button variant="contained" startIcon={<DownloadIcon />} onClick={loadLLMModel} disabled={llmState.loading || !selectedLLM} fullWidth>
                                    {llmState.loading ? `Loading ${llmState.progress}%` : 'Load LLM'}
                                </Button>
                            )}
                            {llmState.loading && <LinearProgress variant="determinate" value={llmState.progress} sx={{ mt: 1 }} />}
                            {llmState.error && <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>{llmState.error}</Alert>}
                        </CardContent>
                    </Card>

                    {/* System Prompt */}
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>System Prompt</Typography>
                            <TextField multiline rows={4} fullWidth placeholder="Control AI behavior..." value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} size="small" sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem' } }} />
                        </CardContent>
                    </Card>

                    {/* TTS Model Card */}
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Text-to-Speech</Typography>
                            <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Speed</InputLabel>
                                    <Select
                                        value={ttsSettings.speed}
                                        label="Speed"
                                        onChange={(e) => setTTSSettings(prev => ({ ...prev, speed: Number(e.target.value) }))}
                                        disabled={!ttsState.loaded}
                                    >
                                        <MenuItem value={0.8}>Slow (0.8x)</MenuItem>
                                        <MenuItem value={1.0}>Normal (1.0x)</MenuItem>
                                        <MenuItem value={1.2}>Fast (1.2x)</MenuItem>
                                    </Select>
                                </FormControl>
                                <Button
                                    size="small"
                                    variant={ttsSettings.autoPlay ? "contained" : "outlined"}
                                    onClick={() => setTTSSettings(prev => ({ ...prev, autoPlay: !prev.autoPlay }))}
                                    color={ttsSettings.autoPlay ? "primary" : "inherit"}
                                >
                                    {ttsSettings.autoPlay ? "Stream: ON" : "Stream: OFF"}
                                </Button>
                            </Stack>
                            <Box sx={{ mt: 2 }}>
                                {ttsState.loaded ? <Chip icon={<CheckCircleIcon />} label="Ready" color="success" /> : (
                                    <Button variant="outlined" startIcon={<VolumeUpIcon />} onClick={loadTTSModel} disabled={ttsState.loading} fullWidth size="small">
                                        {ttsState.loading ? `Loading ${ttsState.progress}%` : 'Load TTS'}
                                    </Button>
                                )}
                            </Box>
                            {ttsState.loading && <LinearProgress variant="determinate" value={ttsState.progress} sx={{ mt: 1 }} />}
                        </CardContent>
                    </Card>
                </Box>

                {/* Chat Area */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6" fontWeight={600}>Ask Me Anything</Typography>
                        <Button size="small" startIcon={<DeleteIcon />} onClick={clearChat} color="inherit">Clear Chat</Button>
                    </Stack>

                    <Paper sx={{ flexGrow: 1, p: 2, mb: 2, overflow: 'auto', maxHeight: 500, backgroundColor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                        {messages.length === 0 && !streamingContent && (
                            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                                <Typography variant="body2">Context loaded from Resume. Start asking questions!</Typography>
                            </Box>
                        )}
                        {messages.map((msg, idx) => (
                            <Box key={idx} sx={{ mb: 2, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <Paper sx={{ p: 2, maxWidth: '85%', backgroundColor: msg.role === 'user' ? 'primary.main' : 'white', color: msg.role === 'user' ? 'white' : 'text.primary', borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                                    {msg.role === 'assistant' && ttsState.loaded && (
                                        <IconButton size="small" onClick={() => speakText(msg.content)} sx={{ mt: 1, float: 'right' }}>
                                            <VolumeUpIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Paper>
                            </Box>
                        ))}

                        {(streamingContent || processing) && (
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
                                <Paper sx={{ p: 2, maxWidth: '85%', backgroundColor: 'white', border: '1px dashed', borderColor: 'primary.main', borderRadius: 2 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {streamingContent}
                                        {!streamingContent && <CircularProgress size={12} sx={{ ml: 1 }} />}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}

                        {isRecording && liveTranscript && (
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Paper sx={{ p: 2, maxWidth: '80%', backgroundColor: 'rgba(124, 58, 237, 0.1)', fontStyle: 'italic', borderRadius: 2 }}>
                                    <Typography variant="body2">{liveTranscript}...</Typography>
                                </Paper>
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Paper>

                    {/* Input Controls */}
                    <Stack spacing={2}>
                        {selectedImage && (
                            <Box sx={{ position: 'relative', width: 80, height: 80, mb: 1, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                                <img src={selectedImage} alt="Selected" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <IconButton
                                    size="small"
                                    onClick={() => setSelectedImage(null)}
                                    sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        )}
                        <Stack direction="row" spacing={1} alignItems="center">
                            {/* Hidden Camera Input */}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={cameraInputRef}
                                style={{ display: 'none' }}
                                onChange={handleCameraCapture}
                            />

                            <Tooltip title="Upload or Capture Image">
                                <IconButton component="span" color="primary" onClick={performCameraAction}>
                                    <CameraAltIcon />
                                </IconButton>
                            </Tooltip>

                            <TextField fullWidth placeholder={isRecording ? 'Listening...' : 'Type a message...'} value={isRecording ? liveTranscript : input} onChange={(e) => {
                                if (isRecording) {
                                    setLiveTranscript(e.target.value);
                                    liveTranscriptRef.current = e.target.value;
                                } else {
                                    setInput(e.target.value);
                                }
                            }} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={processing} size="small" autoComplete="off" />
                            <IconButton color={isRecording ? 'error' : 'primary'} onClick={isRecording ? stopRecording : startRecording} disabled={!sttState.loaded} sx={{ backgroundColor: isRecording ? 'error.main' : 'primary.main', color: 'white', '&:hover': { backgroundColor: isRecording ? 'error.dark' : 'primary.dark' }, animation: isRecording ? 'pulse 1.5s infinite' : 'none', '@keyframes pulse': { '0%': { boxShadow: '0 0 0 0px rgba(239, 68, 68, 0.4)' }, '100%': { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)' } } }}>
                                {isRecording ? <StopIcon /> : <MicIcon />}
                            </IconButton>
                            <Button variant="contained" onClick={sendMessage} disabled={processing || (!input.trim() && !liveTranscript && !selectedImage)} endIcon={processing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}>Send</Button>
                        </Stack>
                        {isRecording && (
                            <Alert severity="error" variant="filled" sx={{ py: 0 }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 8, height: 8, bgcolor: 'white', borderRadius: '50%', animation: 'blink 1s infinite' }} />
                                    <Typography variant="caption" fontWeight={700}>RECORDING LIVE</Typography>
                                </Stack>
                                <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
                            </Alert>
                        )}
                    </Stack>
                </Box>
            </Box>
        </>
    );
}
