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
import { useChatAI } from '@/hooks/useChatAI';

function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export default function AMAChatClient() {
    const {
        llm,
        stt,
        tts,
        autoLoadAll,
        modelName,
    } = useModelContext();

    const {
        messages,
        streamingContent: streaming,
        busy,
        isRecording,
        liveTranscript,
        ttsEnabled,
        setTtsEnabled,
        input,
        setInput,
        sendMessage,
        sendText,
        clearChat,
        startRecording,
        stopRecording,
        scrollContainerRef,
    } = useChatAI({ autoLoad: false });

    const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    const ready = llm.ready && stt.ready && tts.ready;
    const anyLoading = llm.loading || stt.loading || tts.loading;

    const modelIds = useMemo(() => ({
        llm: MODELS.llm.default,
        stt: MODELS.stt.default,
        tts: MODELS.tts.default,
    }), []);

    useEffect(() => {
        setWebgpuSupported(typeof navigator !== 'undefined' && 'gpu' in navigator);
    }, []);

    const ensureModelsLoaded = useCallback(async () => {
        await autoLoadAll();
    }, [autoLoadAll]);

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
