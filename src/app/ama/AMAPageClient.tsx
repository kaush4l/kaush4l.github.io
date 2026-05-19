'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from 'next/link';
import { ModelProvider, useModelContext } from '@/context/ModelContext';
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

// ── Mini Header ───────────────────────────────────────────────────────────────
function MiniHeader() {
    return (
        <Box
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                px: { xs: 2, sm: 3 },
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            <Tooltip title="Back to home">
                <IconButton component={Link} href="/" color="primary" aria-label="back to home">
                    <ArrowBackIcon />
                </IconButton>
            </Tooltip>
            <Typography
                variant="h6"
                sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}
            >
                AMA
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Ask Kaushal Anything
            </Typography>
        </Box>
    );
}

// ── Chat UI (consumes ModelProvider) ──────────────────────────────────────────
function AMAChatContent() {
    const { llm, autoLoadAll } = useModelContext();

    const {
        messages,
        streamingContent: streaming,
        busy,
        input,
        setInput,
        sendText,
        clearChat,
        scrollContainerRef,
    } = useChatAI({ autoLoad: true });

    const shouldAutoScrollRef = useRef(true);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const ready = llm.ready;
    const anyLoading = llm.loading;
    const anyError = !!llm.error;
    const hasMessages = messages.length > 0 || !!streaming;

    const pipelineStage = useMemo((): 'idle' | 'thinking' => {
        if (busy && !streaming) return 'thinking';
        if (busy && streaming) return 'thinking';
        return 'idle';
    }, [busy, streaming]);

    useEffect(() => {
        if (!shouldAutoScrollRef.current) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, streaming]);

    const handleLoadModels = useCallback(async () => {
        await autoLoadAll().catch(() => {});
    }, [autoLoadAll]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;
        await sendText(text).catch(() => {});
    }, [input, sendText]);

    const handleSuggestedPrompt = useCallback(async (prompt: string) => {
        await sendText(prompt).catch(() => {});
    }, [sendText]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    }, [handleSend]);

    const loadingProgress = anyLoading ? Math.round(llm.progress) : 0;

    return (
        <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 1, sm: 2 } }}>
            {/* Model status / loading card */}
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
                                Failed to load AI model
                            </Typography>
                            <Typography variant="caption" component="div">
                                {llm.error}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                Models are loaded from <code>/models</code> on first use. Run <code>bun run models:download</code> to cache them locally.
                            </Typography>
                        </Alert>
                    ) : anyLoading ? (
                        <Box sx={{ mb: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="body2" fontWeight={600}>
                                    Loading AI model… {loadingProgress}%
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
                            startIcon={anyLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                            onClick={handleLoadModels}
                            disabled={anyLoading}
                            sx={{
                                mt: 1,
                                background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
                                fontWeight: 700,
                                '&:hover': { background: 'linear-gradient(135deg, #6D28D9, #0891B2)' },
                            }}
                        >
                            {anyError ? 'Retry Loading Model' : 'Initialize AI Model'}
                        </Button>
                    )}
                </Paper>
            )}

            {/* Ready bar */}
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
                                {pipelineStage === 'idle' && (
                                    <SmartToyOutlinedIcon sx={{ fontSize: '0.9rem' }} />
                                )}
                                {pipelineStage === 'thinking' && (
                                    <CircularProgress size={12} color="inherit" />
                                )}
                                <Typography variant="caption" fontWeight={600}>
                                    {pipelineStage === 'idle' ? 'Ready' : 'Thinking…'}
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

            {/* Suggested prompts */}
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

            {/* Message thread */}
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
                                    ? 'Type a question below. I know everything about Kaushal.'
                                    : 'Initialize AI model above to start chatting.'}
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

                    <div ref={messagesEndRef} />
                </Stack>
            </Paper>

            {/* Input bar */}
            <Paper
                elevation={0}
                sx={{
                    p: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: ready ? 'divider' : 'action.disabledBackground',
                    transition: 'border-color 0.3s',
                    bgcolor: 'background.paper',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="flex-end">
                    <TextField
                        fullWidth
                        id="ama-input"
                        name="ama-input"
                        placeholder={
                            !ready ? 'Initialize model to start…' :
                            busy ? 'Waiting for response…' :
                            'Type a question… (Enter to send)'
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
                                disabled={busy || anyLoading || !input.trim()}
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
            </Paper>
        </Box>
    );
}

// ── Exported component ────────────────────────────────────────────────────────

export default function AMAPageClient() {
    return (
        <ModelProvider>
            <MiniHeader />
            <AMAChatContent />
        </ModelProvider>
    );
}
