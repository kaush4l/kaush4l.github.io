'use client';

import { Box, Typography, Stack, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { COLORS } from '@/theme/theme';

const TERMINAL_LINES = [
    { prompt: '$ ', text: 'whoami', delay: 0 },
    { prompt: '→ ', text: 'Kaushal Kanakamedala, Senior Software Engineer', delay: 1000, color: 'cyan' },
    { prompt: '$ ', text: 'cat skills.txt', delay: 2200 },
    { prompt: '→ ', text: 'Java · Spring Boot · Angular · React · Python · WebGPU', delay: 3200, color: 'purple' },
    { prompt: '$ ', text: 'echo $CURRENT_ROLE', delay: 4400 },
    { prompt: '→ ', text: 'Full Stack Engineer @ Fidelity (Durham, NC)', delay: 5200, color: 'cyan' },
    { prompt: '$ ', text: 'ls interests/', delay: 6300 },
    { prompt: '→ ', text: 'on-device-ai/  browser-ML/  webgpu/  open-source/', delay: 7100, color: 'purple' },
    { prompt: '$ ', text: '█', delay: 8200, cursor: true },
];

function TypewriterLine({ line, startDelay }: { line: typeof TERMINAL_LINES[0]; startDelay: number }) {
    const [displayText, setDisplayText] = useState('');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const showTimer = setTimeout(() => setVisible(true), startDelay);
        const typeTimer = setTimeout(() => {
            let i = 0;
            const fullText = line.text;
            const typingInterval = setInterval(() => {
                setDisplayText(fullText.slice(0, i + 1));
                i++;
                if (i >= fullText.length) clearInterval(typingInterval);
            }, line.cursor ? 0 : 32);
            return () => clearInterval(typingInterval);
        }, startDelay);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(typeTimer);
        };
    }, [line.text, line.cursor, startDelay]);

    if (!visible) return null;

    const textColor = line.color === 'cyan'
        ? COLORS.cyan[400]
        : line.color === 'purple'
            ? COLORS.purple[400]
            : undefined;

    return (
        <Box
            component="div"
            sx={{
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                fontSize: { xs: '0.82rem', sm: '0.94rem' },
                lineHeight: 1.8,
                display: 'flex',
                gap: 0.5,
            }}
        >
            <Box component="span" sx={{ color: COLORS.purple[400], userSelect: 'none' }}>
                {line.prompt}
            </Box>
            <Box
                component="span"
                sx={{
                    color: textColor ?? 'inherit',
                    animation: line.cursor ? 'blink 1s step-end infinite' : undefined,
                    '@keyframes blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                    },
                }}
            >
                {displayText}
            </Box>
        </Box>
    );
}

export default function HeroB() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                minHeight: { xs: '70vh', md: '80vh' },
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
                    backgroundImage: isDark
                        ? `radial-gradient(${COLORS.purple[900]}22 1px, transparent 1px)`
                        : `radial-gradient(${COLORS.purple[300]}44 1px, transparent 1px)`,
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                    maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
                }}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                style={{ position: 'relative', zIndex: 1, width: '100%' }}
            >
                <Box
                    sx={{
                        maxWidth: 720,
                        mx: 'auto',
                        bgcolor: isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.92)',
                        border: `1px solid ${isDark ? COLORS.purple[900] : COLORS.purple[100]}`,
                        borderRadius: 4,
                        boxShadow: isDark
                            ? `0 0 0 1px ${COLORS.purple[900]}, 0 32px 64px rgba(0,0,0,0.6)`
                            : `0 0 0 1px ${COLORS.purple[100]}, 0 32px 64px rgba(124,58,237,0.08)`,
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
                            bgcolor: isDark ? COLORS.purple[900] + '40' : COLORS.purple[50],
                            borderBottom: `1px solid ${isDark ? COLORS.purple[900] : COLORS.purple[100]}`,
                        }}
                    >
                        {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
                            <Box key={i} sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: c }} />
                        ))}
                        <Typography
                            variant="caption"
                            sx={{
                                ml: 1.5,
                                fontFamily: 'monospace',
                                color: 'text.secondary',
                                fontSize: '0.78rem',
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
            </motion.div>
        </Box>
    );
}
