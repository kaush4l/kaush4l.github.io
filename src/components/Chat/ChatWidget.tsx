'use client';

// ChatWidget — on-device LLM chat with text + voice (multimodal) input.

import { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    TextField,
    IconButton,
    Paper,
    Avatar,
    Tooltip,
    Stack,
    CircularProgress,
    useTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useModelContext } from '@/context/ModelContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useChatAI } from '@/hooks/useChatAI';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function ChatWidget() {
    useTheme(); // keep dark-mode reactivity
    const [isOpen, setIsOpen] = useState(false);
    const { llm, autoLoadAll } = useModelContext();

    const {
        messages,
        streamingContent,
        busy,
        input,
        setInput,
        sendMessage,
        sendAudio,
        scrollContainerRef,
        messagesEndRef,
        shouldAutoScrollRef,
    } = useChatAI({ autoLoad: false });

    const recorder = useAudioRecorder();

    const handleOpen = () => {
        setIsOpen(true);
        if (!llm.ready && !llm.loading && !llm.error) {
            void autoLoadAll().catch(() => {});
        }
    };

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

    return (
        <>
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
                                    onClick={handleOpen}
                                    sx={{ width: 64, height: 64, bgcolor: 'primary.main', color: 'white', boxShadow: 6, '&:hover': { bgcolor: 'primary.dark' } }}
                                >
                                    <ChatIcon fontSize="large" />
                                </IconButton>
                                {(llm.loading || busy) && (
                                    <CircularProgress size={72} sx={{ position: 'absolute', top: -4, left: -4, color: busy ? 'secondary.main' : 'success.main', opacity: 0.6, pointerEvents: 'none' }} />
                                )}
                            </Box>
                        </Tooltip>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{ position: 'fixed', bottom: 24, right: 24, width: 'min(90vw, 400px)', height: 'min(80vh, 600px)', zIndex: 1200 }}
                    >
                        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 4, boxShadow: 24, border: '1px solid', borderColor: 'divider' }}>
                            {/* Header */}
                            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar sx={{ bgcolor: 'white', color: 'primary.main', width: 32, height: 32 }}>AI</Avatar>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>Chat with Kaushal</Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.8 }}>{llm.ready ? 'Online' : 'Loading…'}</Typography>
                                    </Box>
                                </Box>
                                <IconButton data-testid="chat-close" aria-label="close chat" size="small" color="inherit" onClick={() => setIsOpen(false)}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            {/* Messages */}
                            <Box
                                data-testid="chat-messages"
                                ref={scrollContainerRef}
                                onScroll={() => {
                                    const el = scrollContainerRef.current;
                                    if (!el) return;
                                    shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                                }}
                                sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 2 }}
                            >
                                {llm.error && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
                                        <Typography variant="body2">{llm.error}</Typography>
                                        <Button data-testid="chat-retry-models" size="small" variant="contained" color="inherit" sx={{ mt: 1 }} onClick={() => void autoLoadAll().catch(() => {})}>
                                            Retry loading model
                                        </Button>
                                    </Paper>
                                )}

                                {!llm.ready && !llm.error && (
                                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover' }}>
                                        <Typography variant="body2">Loading on-device model (WebGPU required)…</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            LLM {llm.loading ? `${llm.progress}%` : llm.ready ? '✓' : '…'}
                                        </Typography>
                                    </Paper>
                                )}

                                {messages.length === 0 && (
                                    <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 4 }}>
                                        <ChatIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                                        <Typography variant="body2">Ask me anything about my projects, experience, or skills.</Typography>
                                    </Box>
                                )}

                                {messages.map((msg, i) => (
                                    <Box key={i} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover', color: msg.role === 'user' ? 'white' : 'text.primary', borderTopRightRadius: msg.role === 'user' ? 0 : 3, borderTopLeftRadius: msg.role === 'assistant' ? 0 : 3 }}>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                                        </Paper>
                                    </Box>
                                ))}

                                {(streamingContent || busy) && (
                                    <Box sx={{ alignSelf: 'flex-start', maxWidth: '85%', minWidth: 40 }}>
                                        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: 'action.hover', borderTopLeftRadius: 0 }}>
                                            {streamingContent ? (
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{streamingContent}</Typography>
                                            ) : (
                                                <Stack direction="row" spacing={0.5} sx={{ p: 0.5 }}>
                                                    {[0, 0.16, 0.32].map((d) => (
                                                        <Box key={d} sx={{ width: 6, height: 6, bgcolor: 'text.secondary', borderRadius: '50%', animation: `bounce 1.4s infinite ease-in-out ${d}s` }} />
                                                    ))}
                                                    <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
                                                </Stack>
                                            )}
                                        </Paper>
                                    </Box>
                                )}

                                <div ref={messagesEndRef} />
                            </Box>

                            {/* Input Bar */}
                            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Tooltip title={recorder.recording ? 'Stop & send voice' : 'Record a voice message'} placement="top">
                                        <span>
                                            <IconButton
                                                data-testid="chat-mic"
                                                aria-label={recorder.recording ? 'stop recording' : 'record voice message'}
                                                color={recorder.recording ? 'error' : 'primary'}
                                                onClick={handleMic}
                                                disabled={!llm.ready || (busy && !recorder.recording)}
                                                sx={recorder.recording ? { animation: 'micpulse 1.2s infinite' } : undefined}
                                            >
                                                {recorder.recording ? <StopIcon /> : <MicIcon />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <TextField
                                        fullWidth
                                        placeholder={recorder.recording ? 'Recording… tap stop to send' : !llm.ready ? 'Loading model…' : 'Type or speak…'}
                                        size="small"
                                        variant="outlined"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                        disabled={!llm.ready || busy || recorder.recording}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'action.hover' } }}
                                    />
                                    {input.trim() ? (
                                        <IconButton color="primary" onClick={() => sendMessage()} disabled={busy}>
                                            <SendIcon />
                                        </IconButton>
                                    ) : null}
                                </Box>
                                <style>{`@keyframes micpulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                            </Box>
                        </Paper>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
