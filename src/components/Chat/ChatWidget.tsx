'use client';

// ChatWidget — "Ask my résumé": on-device LLM chat with text + voice input.
//
// Design notes:
// - Every radius is an explicit px string so `theme.shape.borderRadius` can
//   never silently rescale it (B1/B2).
// - No color literals: everything resolves through the palette, with tinted
//   shadows built from `primary.main` via `alpha()` (M7).
// - The suggested prompts render before any weights have loaded; taps and typed
//   input are queued and fired the moment the model is ready (M1).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    IconButton,
    Paper,
    Avatar,
    Chip,
    Stack,
    LinearProgress,
    CircularProgress,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useModelContext } from '@/context/ModelContext';
import { MODELS, formatBytes } from '@/lib/capability';
import { RADIUS } from '@/theme/ThemeProvider';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useChatAI } from '@/hooks/useChatAI';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { OPEN_CHAT_EVENT } from '@/lib/chatBridge';

// ── One name for the feature, everywhere (M5) ────────────────────────────────
//
// Voice: the panel speaks in the *third* person throughout, because what
// answers is a local model reading a résumé — not the person it describes (F2).
const FEATURE_NAME = 'Ask this résumé';
const MODEL_SUBTITLE = 'Gemma 4 · running in your browser';

/**
 * The window event the hero's control dispatches to open this panel (B1).
 * Owned by `lib/chatBridge` — this end and the dispatching end must never be
 * two separately-authored copies of the same string.
 */
export { OPEN_CHAT_EVENT };

/**
 * Formatted from the `bytes` the download script sourced for the exact model id
 * this app loads (F3). `null` when unsourced — in which case the disclosure
 * says nothing about size rather than inventing one.
 */
const MODEL_DOWNLOAD_SIZE = formatBytes(MODELS.llm.bytes);

/**
 * Prompts arrive as `suggestedPrompts`, threaded from `content/01-about/_section.md`
 * through `Layout` → `LayoutClient` beside `systemPrompt` (F2).
 *
 * The fallback is deliberately empty rather than a hardcoded set: résumé facts do not
 * belong in a component on a site whose central claim is that content drives it. If the
 * frontmatter ever goes missing the panel shows its empty-state sentence and no chips —
 * honest, and visibly wrong to whoever removed the field.
 */
const DEFAULT_PROMPTS: string[] = [];

// ── Motion tokens (radii come from the theme scale — E12) ────────────────────
const EASE = 'cubic-bezier(0.2,0,0,1)';
const FADE_150 = `opacity 150ms ${EASE}, color 150ms ${EASE}`;

/** Announced by assistive tech, invisible to everyone else (D7). */
const VISUALLY_HIDDEN = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    border: 0,
} as const;

const STATUS_THINKING = 'Thinking…';
const STATUS_QUEUED = 'Queued — sends as soon as the model is ready';

export interface ChatWidgetProps {
    /** Peak-moment entry points, from content. Falls back to `DEFAULT_PROMPTS`. */
    suggestedPrompts?: string[];
}

export default function ChatWidget({ suggestedPrompts }: ChatWidgetProps = {}) {
    const theme = useTheme(); // also keeps dark-mode reactivity
    const prefersReducedMotion = useReducedMotion();

    const [isOpen, setIsOpen] = useState(false);
    /** A prompt captured before the model was ready; fires automatically on ready. */
    const [queued, setQueued] = useState<string | null>(null);

    const { llm, autoLoadAll } = useModelContext();

    const {
        messages,
        streamingContent,
        streamingReasoning,
        thinking,
        busy,
        input,
        setInput,
        sendText,
        sendAudio,
        stopGeneration,
        clearChat,
        scrollContainerRef,
        messagesEndRef,
        shouldAutoScrollRef,
    } = useChatAI({ autoLoad: false });

    const recorder = useAudioRecorder();

    const fabRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const wasOpenRef = useRef(false);

    const ensureLoading = useCallback(() => {
        if (!llm.ready && !llm.loading && !llm.error) {
            void autoLoadAll().catch(() => { });
        }
    }, [autoLoadAll, llm.error, llm.loading, llm.ready]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        ensureLoading();
    }, [ensureLoading]);

    // B1 — the hero's "ask it" control opens the panel through a window event,
    // so the fold can pay off its own on-device-AI promise without lifting
    // this widget's state into the layout.
    useEffect(() => {
        const onOpenRequest = () => handleOpen();
        window.addEventListener(OPEN_CHAT_EVENT, onOpenRequest);
        return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpenRequest);
    }, [handleOpen]);

    const handleClose = useCallback(() => setIsOpen(false), []);

    const handleClear = useCallback(() => {
        if (busy) stopGeneration();
        setQueued(null);
        clearChat();
        inputRef.current?.focus();
    }, [busy, clearChat, stopGeneration]);

    const prompts = suggestedPrompts?.length ? suggestedPrompts : DEFAULT_PROMPTS;

    /**
     * Never disable the primary affordance: if the model is not ready yet the
     * prompt is queued instead of dropped, and the load wait becomes anticipation.
     */
    const submit = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        setInput('');
        if (llm.ready) {
            void sendText(trimmed);
            return;
        }
        setQueued(trimmed);
        ensureLoading();
    }, [busy, ensureLoading, llm.ready, sendText, setInput]);

    // Fire the queued prompt the moment the model becomes ready.
    useEffect(() => {
        if (!queued || !llm.ready || busy) return;
        const next = queued;
        setQueued(null);
        void sendText(next);
    }, [busy, llm.ready, queued, sendText]);

    // Escape to close + a focus trap while the dialog is open (M2).
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                handleClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const root = panelRef.current;
            if (!root) return;
            const focusable = Array.from(
                root.querySelectorAll<HTMLElement>(
                    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;
            const inside = active ? root.contains(active) : false;
            if (e.shiftKey && (!inside || active === first)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (!inside || active === last)) {
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 60);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            window.clearTimeout(focusTimer);
        };
    }, [handleClose, isOpen]);

    // Restore focus to the FAB after it re-mounts on close (M2).
    useEffect(() => {
        if (isOpen) {
            wasOpenRef.current = true;
            return;
        }
        if (!wasOpenRef.current) return;
        wasOpenRef.current = false;
        const restoreTimer = window.setTimeout(() => fabRef.current?.focus(), 60);
        return () => window.clearTimeout(restoreTimer);
    }, [isOpen]);

    const handleMic = async () => {
        if (recorder.recording) {
            const audio = await recorder.stop();
            if (audio && audio.length) void sendAudio(audio);
        } else {
            try {
                await recorder.start();
            } catch {
                /* microphone permission denied or unavailable */
            }
        }
    };

    const showEmptyState = messages.length === 0 && !streamingContent && !busy;

    /**
     * D7 — one stable, complete string at a time. While tokens are streaming the
     * region is deliberately empty; the finished message lands in it once.
     */
    /**
     * M14 — the one thing coder mode has that a template does not: a 4B
     * multimodal model actually running in the visitor's own GPU. This is that
     * state, published to the stylesheet as a plain attribute so `coder.css` can
     * bind the FAB's halo to it. Glow that encodes machine state reads as an
     * instrument; glow that encodes nothing reads as compensation.
     *
     * Deliberately an attribute rather than a colour prop: no coder-mode value
     * enters this component, so light and dark are unaffected and deleting
     * `coder.css` leaves nothing behind but a dormant `data-` attribute.
     *
     * `generating` outranks `loading` — while tokens are streaming that is what
     * the machine is doing, whatever else is warming in the background. The
     * `CircularProgress` below is the redundant visual channel and the panel's
     * `aria-live` region the redundant textual one; the glow is never the only
     * encoding of any of these three states.
     */
    const modelState: 'idle' | 'loading' | 'generating' = busy
        ? 'generating'
        : llm.loading
            ? 'loading'
            : 'idle';

    const lastMessage = messages[messages.length - 1];
    const announcement = queued
        ? STATUS_QUEUED
        : busy
            ? (streamingContent ? '' : STATUS_THINKING)
            : lastMessage?.role === 'assistant'
                ? lastMessage.content
                : '';

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        transition={prefersReducedMotion ? { duration: 0.001 } : undefined}
                        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1200 }}
                    >
                        {/* E13 — no Tooltip here: `aria-label` already names it, and
                            MUI wires the tooltip as `aria-describedby`, so the two
                            together make screen readers say the name twice. */}
                        <Box sx={{ position: 'relative' }}>
                                <IconButton
                                    ref={fabRef}
                                    data-testid="chat-open"
                                    data-model-state={modelState}
                                    aria-label={FEATURE_NAME}
                                    aria-haspopup="dialog"
                                    onClick={handleOpen}
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: RADIUS.pill,
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.28)}`,
                                        transition: `background-color 150ms ${EASE}, box-shadow 150ms ${EASE}`,
                                        '&:hover': { bgcolor: 'primary.dark' },
                                    }}
                                >
                                    <ChatIcon fontSize="large" />
                                </IconButton>
                                {(llm.loading || busy) && (
                                    <CircularProgress
                                        size={72}
                                        variant={llm.loading && !busy ? 'determinate' : 'indeterminate'}
                                        value={llm.progress}
                                        aria-hidden
                                        sx={{
                                            position: 'absolute',
                                            top: -4,
                                            left: -4,
                                            color: busy ? 'secondary.main' : 'success.main',
                                            opacity: 0.6,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile scrim — the panel is effectively a modal below `sm` (M2). */}
            {isOpen && (
                <Box
                    aria-hidden
                    onClick={handleClose}
                    sx={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1199,
                        display: { xs: 'block', sm: 'none' },
                        bgcolor: alpha(theme.palette.common.black, 0.32),
                        backdropFilter: 'blur(4px)',
                    }}
                />
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
                        transition={
                            prefersReducedMotion
                                ? { duration: 0.001 }
                                : { type: 'spring', damping: 26, stiffness: 320 }
                        }
                        style={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                            width: 'min(90vw, 400px)',
                            height: 'min(80vh, 600px)',
                            zIndex: 1200,
                            // The panel comes *from* the FAB; say so (N2).
                            transformOrigin: 'bottom right',
                        }}
                    >
                        <Paper
                            ref={panelRef}
                            role="dialog"
                            aria-modal="true"
                            aria-label={FEATURE_NAME}
                            sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                borderRadius: RADIUS.floating,
                                boxShadow: `0 24px 64px ${alpha(theme.palette.primary.main, 0.22)}`,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            {/* Header */}
                            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ bgcolor: 'primary.contrastText', color: 'primary.main', width: 32, height: 32 }}>
                                        <BoltIcon fontSize="small" />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{FEATURE_NAME}</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.85 }}>{MODEL_SUBTITLE}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {messages.length > 0 && (
                                        <IconButton
                                            data-testid="chat-clear"
                                            aria-label="Clear conversation"
                                            size="small"
                                            color="inherit"
                                            onClick={handleClear}
                                        >
                                            <DeleteSweepIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton data-testid="chat-close" aria-label="Close" size="small" color="inherit" onClick={handleClose}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Messages */}
                            <Box
                                data-testid="chat-messages"
                                ref={scrollContainerRef}
                                role="log"
                                /* D7 — no `aria-live` here. The streaming node is
                                   rewritten every 75ms, which makes most screen
                                   readers re-read the whole answer from the start.
                                   Completed units go to the polite region below. */
                                aria-busy={busy}
                                aria-label="Conversation"
                                onScroll={() => {
                                    const el = scrollContainerRef.current;
                                    if (!el) return;
                                    shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                                }}
                                sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}
                            >
                                {llm.error && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: RADIUS.card, bgcolor: 'error.main', color: 'error.contrastText' }}>
                                        <Typography variant="body2">{llm.error}</Typography>
                                        <Button
                                            data-testid="chat-retry-models"
                                            size="small"
                                            variant="outlined"
                                            color="inherit"
                                            sx={{ mt: 1, borderRadius: RADIUS.pill }}
                                            onClick={() => void autoLoadAll().catch(() => { })}
                                        >
                                            Retry loading model
                                        </Button>
                                    </Paper>
                                )}

                                {/* L2 — disclose the download before spending the visitor's bandwidth. */}
                                {!llm.ready && !llm.error && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: RADIUS.card, bgcolor: 'action.hover' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            Loading Gemma 4 into your browser
                                        </Typography>
                                        <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {MODEL_DOWNLOAD_SIZE
                                                ? `First visit downloads ${MODEL_DOWNLOAD_SIZE} of model weights once, then it is cached and runs fully offline — nothing leaves your device.`
                                                : 'First visit downloads the model weights once, then they are cached and run fully offline — nothing leaves your device.'}
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={llm.progress}
                                            sx={{ mt: 1, height: 4, borderRadius: RADIUS.pill }}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {llm.progress}%
                                        </Typography>
                                    </Paper>
                                )}

                                {/* M1 — suggested prompts, rendered before the model loads. */}
                                {showEmptyState && (
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {llm.ready
                                                ? 'Ask anything about the experience, projects or skills on this page.'
                                                : 'Pick a question now — it sends itself the moment the model is ready.'}
                                        </Typography>
                                        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                            {prompts.map((prompt) => (
                                                <Chip
                                                    key={prompt}
                                                    data-testid="chat-suggested-prompt"
                                                    label={prompt}
                                                    variant="outlined"
                                                    clickable
                                                    onClick={() => submit(prompt)}
                                                    sx={{
                                                        borderRadius: RADIUS.chip,
                                                        height: 'auto',
                                                        py: 0.75,
                                                        '& .MuiChip-label': { whiteSpace: 'normal', px: 1.25 },
                                                        transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                )}

                                {messages.map((msg, i) => (
                                    <Box key={i} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                                // All four corners explicit — B2.
                                                borderRadius: RADIUS.card,
                                                borderTopRightRadius: msg.role === 'user' ? RADIUS.tail : RADIUS.card,
                                                borderTopLeftRadius: msg.role === 'assistant' ? RADIUS.tail : RADIUS.card,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                                            {/* The model's deliberation, already separated from the
                                                answer by the hook's parser. Disclosed, never shown by
                                                default: the answer is what was asked for, and reasoning
                                                shown inline would read as the assistant thinking out
                                                loud at a reader who wanted a fact. `<details>` is used
                                                natively so it is keyboard- and screen-reader-operable
                                                without any state of our own. */}
                                            {msg.reasoning && (
                                                <Box component="details" sx={{ mt: 1 }}>
                                                    <Box
                                                        component="summary"
                                                        sx={{
                                                            cursor: 'pointer',
                                                            typography: 'caption',
                                                            color: 'text.secondary',
                                                        }}
                                                    >
                                                        Reasoning
                                                    </Box>
                                                    <Typography
                                                        variant="caption"
                                                        component="p"
                                                        color="text.secondary"
                                                        sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                                                    >
                                                        {msg.reasoning}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Paper>
                                    </Box>
                                ))}

                                {queued && (
                                    <Box sx={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                                        <Paper
                                            elevation={0}
                                            data-testid="chat-queued"
                                            sx={{
                                                p: 1.5,
                                                bgcolor: 'action.hover',
                                                color: 'text.primary',
                                                borderRadius: RADIUS.card,
                                                borderTopRightRadius: RADIUS.tail,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{queued}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {STATUS_QUEUED}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )}

                                {(streamingContent || busy) && (
                                    <Box aria-hidden="true" sx={{ alignSelf: 'flex-start', maxWidth: '85%', minWidth: 40 }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 1.5,
                                                bgcolor: 'action.hover',
                                                borderRadius: RADIUS.card,
                                                borderTopLeftRadius: RADIUS.tail,
                                            }}
                                        >
                                            {streamingContent ? (
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{streamingContent}</Typography>
                                            ) : (
                                                /* A reasoning pass emits no answer tokens, so without
                                                   this the panel shows a motionless "Thinking…" for the
                                                   whole deliberation and reads as a hung model. Showing
                                                   the tail of the live reasoning proves work is
                                                   happening; it is `aria-hidden` with the rest of this
                                                   placeholder, so the live region still announces only
                                                   the finished answer (D7). */
                                                <Typography variant="body2" color="text.secondary">
                                                    {thinking && streamingReasoning
                                                        ? `Reasoning… ${streamingReasoning.slice(-140)}`
                                                        : STATUS_THINKING}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Box>
                                )}

                                <div ref={messagesEndRef} />
                            </Box>

                            {/* D7 — the only live region: complete units, never a
                                partially-streamed one. */}
                            <Box
                                data-testid="chat-announcer"
                                aria-live="polite"
                                aria-atomic="true"
                                sx={VISUALLY_HIDDEN}
                            >
                                {announcement}
                            </Box>

                            {/* Input Bar */}
                            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton
                                        data-testid="chat-mic"
                                        aria-label={recorder.recording ? 'Stop recording and send' : 'Record a voice message'}
                                        color={recorder.recording ? 'error' : 'primary'}
                                        onClick={handleMic}
                                        disabled={!llm.ready || (busy && !recorder.recording)}
                                        sx={{ transition: FADE_150 }}
                                    >
                                        {recorder.recording ? <StopIcon /> : <MicIcon />}
                                    </IconButton>
                                    <TextField
                                        fullWidth
                                        inputRef={inputRef}
                                        placeholder={
                                            recorder.recording
                                                ? 'Recording… tap stop to send'
                                                : llm.ready
                                                    ? 'Ask about his experience…'
                                                    : 'Type now — it sends when the model is ready'
                                        }
                                        size="small"
                                        variant="outlined"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                submit(input);
                                            }
                                        }}
                                        disabled={recorder.recording}
                                        slotProps={{ htmlInput: { 'aria-label': 'Your question' } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: RADIUS.pill, bgcolor: 'action.hover' } }}
                                    />
                                    {/* Always mounted so the TextField never reflows mid-word (M4).
                                        While the worker is generating this is the way out (D6). */}
                                    <IconButton
                                        data-testid={busy ? 'chat-stop' : 'chat-send'}
                                        aria-label={busy ? 'Stop generating' : 'Send'}
                                        color={busy ? 'error' : 'primary'}
                                        onClick={() => (busy ? stopGeneration() : submit(input))}
                                        disabled={busy ? false : (!input.trim() || recorder.recording)}
                                        sx={{
                                            transition: FADE_150,
                                            '&.Mui-disabled': { opacity: 0.4 },
                                        }}
                                    >
                                        {busy ? <StopIcon /> : <SendIcon />}
                                    </IconButton>
                                </Box>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
