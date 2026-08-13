'use client';

import { Box, Typography, Stack, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// E5: the whole sequence now finishes at t=2400ms, inside the median
// above-the-fold dwell window.
interface TerminalLine {
    prompt: string;
    text: string;
    delay: number;
    color?: 'cyan' | 'purple';
    cursor?: boolean;
}

const TERMINAL_LINES: TerminalLine[] = [
    { prompt: '$ ', text: 'whoami', delay: 0 },
    { prompt: '→ ', text: 'Kaushal Kanakamedala, Senior Software Engineer', delay: 300, color: 'cyan' },
    { prompt: '$ ', text: 'cat skills.txt', delay: 600 },
    { prompt: '→ ', text: 'Java · Spring Boot · Angular · React · Python · WebGPU', delay: 900, color: 'purple' },
    { prompt: '$ ', text: 'echo $CURRENT_ROLE', delay: 1200 },
    { prompt: '→ ', text: 'Full Stack Engineer @ Fidelity (Durham, NC)', delay: 1500, color: 'cyan' },
    { prompt: '$ ', text: 'ls interests/', delay: 1800 },
    { prompt: '→ ', text: 'on-device-ai/  browser-ML/  webgpu/  open-source/', delay: 2100, color: 'purple' },
    { prompt: '$ ', text: '█', delay: 2400, cursor: true },
];

function prefersReducedMotion() {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function TypewriterLine({ line, startDelay }: { line: TerminalLine; startDelay: number }) {
    const theme = useTheme();
    const [displayText, setDisplayText] = useState('');
    const [visible, setVisible] = useState(false);
    const reducedRef = useRef(false);

    useEffect(() => {
        const reduced = prefersReducedMotion();
        reducedRef.current = reduced;

        if (reduced) {
            setVisible(true);
            setDisplayText(line.text);
            return;
        }

        // E5: the interval id lives in the *effect* scope, so the effect's own
        // cleanup can clear it. Previously the cleanup was returned from the
        // setTimeout callback and therefore never ran.
        let typingInterval: ReturnType<typeof setInterval> | undefined;

        const showTimer = setTimeout(() => setVisible(true), startDelay);
        const typeTimer = setTimeout(() => {
            let i = 0;
            const fullText = line.text;
            typingInterval = setInterval(() => {
                setDisplayText(fullText.slice(0, i + 1));
                i++;
                if (i >= fullText.length && typingInterval) clearInterval(typingInterval);
            }, line.cursor ? 0 : 14);
        }, startDelay);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(typeTimer);
            if (typingInterval) clearInterval(typingInterval);
        };
    }, [line.text, line.cursor, startDelay]);

    const textColor =
        line.color === 'cyan'
            ? theme.palette.secondary.main
            : line.color === 'purple'
                ? theme.palette.primary.light
                : undefined;

    // E5: every line is in the DOM from t=0 — hidden, not absent — so the
    // terminal body never grows.
    return (
        <Box
            component="div"
            sx={{
                visibility: visible ? 'visible' : 'hidden',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: { xs: '0.82rem', sm: '0.94rem' },
                lineHeight: 1.8,
                display: 'flex',
                gap: 0.5,
            }}
        >
            <Box component="span" sx={{ color: 'primary.light', userSelect: 'none' }}>
                {line.prompt}
            </Box>
            <Box
                component="span"
                sx={{
                    color: textColor ?? 'inherit',
                    // N1: no infinite blink under reduced motion.
                    ...(line.cursor && {
                        '@media (prefers-reduced-motion: no-preference)': {
                            animation: 'blink 1s step-end infinite',
                        },
                    }),
                    '@keyframes blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                    },
                }}
            >
                {displayText || ' '}
            </Box>
        </Box>
    );
}

export default function HeroB() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { primary, background, error, warning, success } = theme.palette;

    const dotColor = primary.dark;

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 6, md: 8 },
            }}
        >
            {/* Background grid */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `radial-gradient(${alpha(dotColor, isDark ? 0.13 : 0.27)} 1px, transparent 1px)`,
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                    maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                style={{ position: 'relative', zIndex: 1, width: '100%' }}
            >
                <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
                    <Box
                        sx={{
                            maxWidth: 720,
                            mx: 'auto',
                            bgcolor: alpha(background.paper, 0.9),
                            border: '1px solid',
                            borderColor: alpha(primary.main, isDark ? 0.35 : 0.15),
                            borderRadius: '16px',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Title bar */}
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{
                                px: 2,
                                py: 1.25,
                                bgcolor: 'action.hover',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            {[error.main, warning.main, success.main].map((c, i) => (
                                <Box
                                    key={i}
                                    sx={{ width: 12, height: 12, borderRadius: '999px', bgcolor: c }}
                                />
                            ))}
                            <Typography
                                variant="caption"
                                sx={{
                                    ml: 1.5,
                                    fontFamily: 'var(--font-mono), monospace',
                                    color: 'text.secondary',
                                    fontSize: '0.8125rem',
                                }}
                            >
                                kaushal@portfolio ~ zsh
                            </Typography>
                        </Stack>

                        {/* Terminal body */}
                        <Box
                            sx={{
                                p: { xs: 2.5, sm: 3.5 },
                                minHeight: 320,
                                color: 'text.primary',
                            }}
                        >
                            {TERMINAL_LINES.map((line, i) => (
                                <TypewriterLine key={i} line={line} startDelay={line.delay} />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
}
