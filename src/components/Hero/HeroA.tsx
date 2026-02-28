'use client';

import { Box, Typography, Button, Stack, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BoltIcon from '@mui/icons-material/Bolt';
import { COLORS } from '@/theme/theme';

const ROLE_LABELS = [
    'Senior Software Engineer',
    'Full-Stack Architect',
    'On-Device AI Builder',
    'WebGPU Pioneer',
];

const HIGHLIGHTS = ['Java', 'Spring Boot', 'Angular', 'React', 'WebGPU', 'Transformers.js'];

// ─── Floating orbs (pure CSS, no external libs) ──────────────────────────────
const orbs = [
    { size: 320, top: '-6%', right: '-5%', color: COLORS.purple[600], delay: 0 },
    { size: 200, bottom: '5%', left: '-3%', color: COLORS.cyan[500], delay: 1.2 },
    { size: 150, top: '40%', right: '8%', color: COLORS.purple[400], delay: 0.6 },
];

export default function HeroA() {
    const scrollToContent = () => {
        document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                pt: { xs: 4, md: 6 },
                pb: { xs: 6, md: 8 },
            }}
        >
            {/* Background orbs */}
            {orbs.map((orb, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        width: orb.size,
                        height: orb.size,
                        borderRadius: '50%',
                        bgcolor: orb.color,
                        opacity: 0.12,
                        filter: 'blur(60px)',
                        top: orb.top,
                        right: orb.right,
                        bottom: orb.bottom,
                        left: orb.left,
                        pointerEvents: 'none',
                        animation: `float ${6 + i * 1.5}s ease-in-out infinite alternate`,
                        animationDelay: `${orb.delay}s`,
                        '@keyframes float': {
                            from: { transform: 'translateY(0) scale(1)' },
                            to:   { transform: 'translateY(-18px) scale(1.07)' },
                        },
                    }}
                />
            ))}

            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 780 }}>
                {/* Eyebrow pill */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Chip
                        icon={<BoltIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label="Available for opportunities"
                        size="small"
                        color="secondary"
                        sx={{
                            mb: 3,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            bgcolor: 'rgba(6,182,212,0.12)',
                            color: 'secondary.main',
                            borderColor: 'rgba(6,182,212,0.3)',
                            border: '1px solid',
                        }}
                        variant="outlined"
                    />
                </motion.div>

                {/* Name */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                            fontWeight: 900,
                            lineHeight: 1.05,
                            mb: 1,
                            background: `linear-gradient(135deg, ${COLORS.purple[600]} 0%, ${COLORS.cyan[500]} 100%)`,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Kaushal
                    </Typography>
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
                            fontWeight: 800,
                            color: 'text.primary',
                            lineHeight: 1.1,
                            mb: 3,
                        }}
                    >
                        Kanakamedala
                    </Typography>
                </motion.div>

                {/* Rotating role label */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                            mb: 4,
                            fontSize: { xs: '1.1rem', md: '1.35rem' },
                        }}
                    >
                        {ROLE_LABELS[0]}
                        <Box
                            component="span"
                            sx={{ color: 'secondary.main', fontWeight: 700 }}
                        >
                            {' // '}Durham, NC
                        </Box>
                    </Typography>
                </motion.div>

                {/* Skill highlights */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 5 }}>
                        {HIGHLIGHTS.map((tag, i) => (
                            <motion.div
                                key={tag}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + i * 0.06 }}
                            >
                                <Chip
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        fontSize: '0.78rem',
                                        fontWeight: 500,
                                        borderColor: i % 2 === 0
                                            ? 'rgba(124,58,237,0.35)'
                                            : 'rgba(6,182,212,0.35)',
                                        color: i % 2 === 0 ? 'primary.main' : 'secondary.main',
                                    }}
                                />
                            </motion.div>
                        ))}
                    </Stack>
                </motion.div>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
                            sx={{ fontWeight: 700, px: 4, py: 1.5 }}
                        >
                            View Experience
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            color="secondary"
                            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                            sx={{ fontWeight: 600, px: 4, py: 1.5 }}
                        >
                            See Projects
                        </Button>
                    </Stack>
                </motion.div>
            </Box>

            {/* Scroll indicator */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    animation: 'bounceDown 2s ease-in-out infinite',
                    '@keyframes bounceDown': {
                        '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
                        '50%':      { transform: 'translateX(-50%) translateY(8px)' },
                    },
                    cursor: 'pointer',
                    opacity: 0.5,
                }}
                onClick={scrollToContent}
            >
                <KeyboardArrowDownIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
            </Box>
        </Box>
    );
}
