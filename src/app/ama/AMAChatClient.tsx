'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

import { useModelContext } from '@/context/ModelContext';
import { useChatAI } from '@/hooks/useChatAI';

// ── Quick-start prompt suggestions ───────────────────────────────────────────
const SUGGESTED_PROMPTS = [
    "What's your current role?",
    'Tell me about your AI experience.',
    'What tech stack do you specialise in?',
    'What projects are you most proud of?',
    'Are you open to new opportunities?',
    'How do you approach system design?',
];

// ── Pipeline stage labels ─────────────────────────────────────────────────────
type PipelineStage = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

function getPipelineLabel(stage: PipelineStage): string {
    switch (stage) {
        case 'listening':    return 'Listening…';
        case 'transcribing': return 'Transcribing…';
        case 'thinking':     return 'Thinking…';
        case 'speaking':     return 'Speaking…';
        default:             return 'Ready';
    }
}

export default function AMAChatClient() {
    const { llm, stt, tts, autoLoadAll } = useModelContext();

    const {
        messages,
        streamingContent: streaming,
        busy,
        isRecording,
        liveTranscript,
        ttsEnabled,
        setTtsEnabled,
        isSpeaking,
        input,
        setInput,
        sendText,
        clearChat,
        startRecording,
        stopRecording,
        stopTTS,
        scrollContainerRef,
    } = useChatAI({ autoLoad: false });

    const shouldAutoScrollRef = useRef(true);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const ready = llm.ready && stt.ready && tts.ready;
    const anyLoading = llm.loading || stt.loading || tts.loading;
    const anyError = !!(llm.error || stt.error || tts.error);
    const hasMessages = messages.length > 0 || !!streaming;

    // ── Derive pipeline stage ─────────────────────────────────────────────────
    const pipelineStage = useMemo((): PipelineStage => {
        if (isRecording) return 'listening';
        if (liveTranscript && busy) return 'transcribing';
        if (busy && !streaming) return 'thinking';
        if (busy && streaming) return 'thinking';
        return 'idle';
    }, [isRecording, liveTranscript, busy, streaming]);

    // ── Auto-scroll to bottom ─────────────────────────────────────────────────
    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, streaming]);

    const handleLoadModels = useCallback(async () => {
        await autoLoadAll().catch(() => {});
    }, [autoLoadAll]);

    const handleSend = useCallback(async () => {
        const text = (liveTranscript || input).trim();
        if (!text) return;
        await sendText(text).catch(() => {});
    }, [input, liveTranscript, sendText]);

    const handleSuggestedPrompt = useCallback(async (prompt: string) => {
        await sendText(prompt).catch(() => {});
    }, [sendText]);

    const handleMicPointerDown = useCallback(() => {
        if (!ready || busy || isRecording) return;
        void startRecording().catch(() => {});
    }, [ready, busy, isRecording, startRecording]);

    const handleMicPointerUp = useCallback(() => {
        if (isRecording) stopRecording();
    }, [isRecording, stopRecording]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    }, [handleSend]);

    // ── Progress bar for loading stage ───────────────────────────────────────
    const loadingProgress = anyLoading
        ? Math.round(((llm.progress + stt.progress + tts.progress) / 3))
        : 0;

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 1, sm: 2 } }}>
            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(124,58,237,0.06)'
                            : 'rgba(124,58,237,0.03)',
                }}
            >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    {/* Title & description */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                            sx={{
                                width: 40, height: 40,
                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                fontSize: '1rem', fontWeight: 700,
                            }}
                        >
                            KK
                        </Avatar>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                                Ask Me Anything
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                On-device AI — your voice, your browser, no cloud
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Controls */}
                    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                        {isSpeaking && (
                            <Tooltip title="Stop speaking">
                                <IconButton
                                    size="small"
                                    onClick={stopTTS}
                                    color="error"
                                    aria-label="stop speaking"
                                >
                                    <StopIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}

                        <Tooltip title={ttsEnabled ? 'Mute voice responses' : 'Enable voice responses'}>
                            <IconButton
                                size="small"
                                onClick={() => setTtsEnabled((v) => !v)}
                                color={ttsEnabled ? 'primary' : 'default'}
                                aria-label={ttsEnabled ? 'mute' : 'unmute'}
                            >
                                {ttsEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={hasMessages ? 'Clear conversation' : ''}>
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={clearChat}
                                    disabled={busy || anyLoading || !hasMessages}
                                    aria-label="clear chat"
                                >
                                    <DeleteSweepIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            {/* ── Model status / loading card ──────────────────────────────── */}
            {!ready && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2, mb: 1.5,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: anyError ? 'error.main' : 'divider',
                    }}
                >
                    {anyError ? (
                        <Alert severity="error" sx={{ mb: 1.5 }}>
                            <Typography variant="body2" fontWeight={600} gutterBottom>
                                Failed to load AI models
                            </Typography>
                            <Typography variant="caption" component="div">
                                {llm.error || stt.error || tts.error}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                Models are loaded from <code>/models</code> on first use. Run <code>bun run models:download</code> to cache them locally, or they will be fetched from HuggingFace Hub.
                            </Typography>
                        </Alert>
                    ) : anyLoading ? (
                        <Box sx={{ mb: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="body2" fontWeight={600}>
                                    Loading AI models… {loadingProgress}%
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    First load takes a minute
                                </Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={loadingProgress} sx={{ borderRadius: 1, height: 6 }} />
                        </Box>
                    ) : null}

                    {!anyLoading && (
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={anyLoading ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                            onClick={handleLoadModels}
                            disabled={anyLoading}
                            sx={{
                                mt: 1,
                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                fontWeight: 700,
                                '&:hover': { background: 'linear-gradient(135deg, #6D28D9, #0891B2)' },
                            }}
                        >
                            {anyError ? 'Retry Loading Models' : 'Initialize AI Models'}
                        </Button>
                    )}
                </Paper>
            )}

            {/* ── Ready bar (minimal, when all loaded) ─────────────────────── */}
            {ready && (
                <Paper
                    elevation={0}
                    sx={{
                        px: 2, py: 1, mb: 1.5,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'success.main',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                        {/* Pipeline indicator */}
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Box
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 0.75,
                                    px: 1.5, py: 0.5,
                                    borderRadius: 10,
                                    bgcolor: pipelineStage !== 'idle'
                                        ? 'primary.main'
                                        : (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                    color: pipelineStage !== 'idle' ? 'primary.contrastText' : 'text.secondary',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {pipelineStage === 'listening' && (
                                    <GraphicEqIcon sx={{ fontSize: '0.9rem', animation: 'pulse 1s infinite' }} />
                                )}
                                {(pipelineStage === 'thinking' || pipelineStage === 'transcribing') && (
                                    <CircularProgress size={12} color="inherit" />
                                )}
                                {pipelineStage === 'idle' && (
                                    <SmartToyOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                                )}
                                <Typography variant="caption" fontWeight={600}>
                                    {getPipelineLabel(pipelineStage)}
                                </Typography>
                            </Box>
                        </Stack>

                        <Box
                            sx={{
                                width: 8, height: 8, borderRadius: '50%',
                                bgcolor: 'success.main',
                                boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
                            }}
                        />
                    </Stack>
                </Paper>
            )}

            {/* ── Suggested prompts (shown before first message) ───────────── */}
            {ready && !hasMessages && (
                <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block', px: 0.5 }}>
                        Try asking:
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {SUGGESTED_PROMPTS.map((p) => (
                            <Chip
                                key={p}
                                label={p}
                                size="small"
                                variant="outlined"
                                onClick={() => void handleSuggestedPrompt(p)}
                                disabled={busy}
                                sx={{
                                    cursor: 'pointer',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                                    transition: 'all 0.2s',
                                }}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {/* ── Message thread ───────────────────────────────────────────── */}
            <Paper
                ref={scrollContainerRef}
                onScroll={() => {
                    const el = scrollContainerRef.current;
                    if (!el) return;
                    shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
                }}
                elevation={0}
                sx={{
                    p: 2,
                    height: { xs: 380, sm: 460, md: 520 },
                    overflowY: 'auto',
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    mb: 1.5,
                    scrollbarWidth: 'thin',
                }}
            >
                <Stack spacing={2}>
                    {!hasMessages && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, gap: 1.5, opacity: 0.5 }}>
                            <SmartToyOutlinedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                {ready
                                    ? 'Tap the mic to speak, or type below. I know everything about Kaushal.'
                                    : 'Initialize AI models above to start chatting.'}
                            </Typography>
                        </Box>
                    )}

                    {messages.map((m, idx) => (
                        <Box
                            key={`${m.role}-${idx}`}
                            sx={{
                                display: 'flex',
                                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                gap: 1,
                                alignItems: 'flex-end',
                            }}
                        >
                            {m.role === 'assistant' && (
                                <Avatar
                                    sx={{
                                        width: 28, height: 28, flexShrink: 0,
                                        fontSize: '0.7rem', fontWeight: 700,
                                        background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                    }}
                                >
                                    KK
                                </Avatar>
                            )}
                            <Box
                                sx={{
                                    maxWidth: '80%',
                                    px: 1.75,
                                    py: 1,
                                    borderRadius: m.role === 'user'
                                        ? '18px 18px 4px 18px'
                                        : '18px 18px 18px 4px',
                                    bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                                    color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                    border: m.role === 'assistant' ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                    boxShadow: 1,
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {m.content}
                                </Typography>
                            </Box>
                        </Box>
                    ))}

                    {/* Live streaming response */}
                    {streaming && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                            <Avatar
                                sx={{
                                    width: 28, height: 28, flexShrink: 0,
                                    fontSize: '0.7rem', fontWeight: 700,
                                    background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                }}
                            >
                                KK
                            </Avatar>
                            <Box
                                sx={{
                                    maxWidth: '80%',
                                    px: 1.75, py: 1,
                                    borderRadius: '18px 18px 18px 4px',
                                    bgcolor: 'background.paper',
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    boxShadow: 1,
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {streaming}
                                </Typography>
                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} alignItems="center">
                                    <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                        {[0, 1, 2].map((i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    width: 5, height: 5, borderRadius: '50%',
                                                    bgcolor: 'primary.main',
                                                    animation: 'streamDot 1.2s ease-in-out infinite',
                                                    animationDelay: `${i * 0.2}s`,
                                                    '@keyframes streamDot': {
                                                        '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                                                        '40%': { transform: 'scale(1)', opacity: 1 },
                                                    },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">generating</Typography>
                                </Stack>
                            </Box>
                        </Box>
                    )}

                    {/* Live transcript preview */}
                    {liveTranscript && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Box
                                sx={{
                                    maxWidth: '80%',
                                    px: 1.75, py: 1,
                                    borderRadius: '18px 18px 4px 18px',
                                    bgcolor: 'primary.main',
                                    opacity: 0.6,
                                    border: '1px dashed',
                                    borderColor: 'primary.light',
                                }}
                            >
                                <Typography variant="body2" sx={{ color: 'primary.contrastText', fontStyle: 'italic' }}>
                                    {liveTranscript}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <div ref={messagesEndRef} />
                </Stack>
            </Paper>

            {/* ── Input bar ────────────────────────────────────────────────── */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: isRecording ? 'error.main' : (ready ? 'divider' : 'action.disabledBackground'),
                    transition: 'border-color 0.3s',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="flex-end">
                    {/* Mic button — push-to-talk: hold to record, release to send */}
                    <Tooltip title={
                        !ready ? 'Load models first' :
                        isRecording ? 'Release to send…' :
                        'Hold to speak, release to send'
                    }>
                        <span>
                            <IconButton
                                onPointerDown={handleMicPointerDown}
                                onPointerUp={handleMicPointerUp}
                                onPointerLeave={handleMicPointerUp}
                                disabled={!ready || busy}
                                aria-label={isRecording ? 'recording — release to send' : 'hold to record'}
                                sx={{
                                    width: 48, height: 48, flexShrink: 0,
                                    bgcolor: isRecording ? 'error.main' : 'primary.main',
                                    color: 'white',
                                    touchAction: 'none',
                                    userSelect: 'none',
                                    '&:hover': {
                                        bgcolor: isRecording ? 'error.dark' : 'primary.dark',
                                        transform: 'scale(1.05)',
                                    },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                                    transition: 'all 0.2s',
                                    ...(isRecording && {
                                        animation: 'micPulse 1.5s ease-in-out infinite',
                                        '@keyframes micPulse': {
                                            '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
                                            '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
                                        },
                                    }),
                                }}
                            >
                                <MicIcon />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Text input */}
                    <TextField
                        fullWidth
                        id="ama-input"
                        name="ama-input"
                        placeholder={
                            !ready ? 'Initialize models to start…' :
                            isRecording ? 'Recording… speak your question' :
                            busy ? 'Waiting for response…' :
                            'Type a question, or tap the mic to speak… (Enter to send)'
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={busy || anyLoading}
                        multiline
                        maxRows={4}
                        size="small"
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '& fieldset': { border: 'none' },
                            },
                        }}
                    />

                    {/* Send button */}
                    <Tooltip title="Send (Enter)">
                        <span>
                            <IconButton
                                onClick={() => void handleSend()}
                                disabled={busy || anyLoading || (!input.trim() && !liveTranscript.trim())}
                                aria-label="send message"
                                color="primary"
                                sx={{
                                    width: 48, height: 48, flexShrink: 0,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.05)' },
                                    '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
                                    transition: 'all 0.2s',
                                }}
                            >
                                {busy ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                {/* Keyboard hint */}
                <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: 'block', textAlign: 'center', mt: 0.75, fontSize: '0.65rem' }}
                >
                    Hold mic to speak · release to send · Enter to type
                </Typography>
            </Paper>
        </Box>
    );
}
