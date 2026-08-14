'use client';

import { Box, Typography, Button, Stack, Chip, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { RADIUS } from '@/theme/ThemeProvider';
import { useState, useEffect } from 'react';
import type { HeroProps } from './HeroA';

const ROLE_LABELS = [
    'Senior Software Engineer',
    'Full-Stack Architect',
    'On-Device AI Builder',
    'WebGPU Pioneer',
];

function scrollTo(id: string) {
    const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

export default function HeroC({ about }: HeroProps) {
    const [roleIndex, setRoleIndex] = useState(0);
    // F1: authored in content/01-about/01-bio.md; no fallback list.
    const tags = (about?.highlights ?? []).filter((t) => t?.trim());
    const proof = about?.proof?.trim();

    useEffect(() => {
        // N1: the rotation is a continuous loop — do not run it under reduced motion.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const interval = setInterval(() => {
            setRoleIndex((prev) => (prev + 1) % ROLE_LABELS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                minHeight: { xs: '75vh', md: '85vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                py: { xs: 6, md: 8 },
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                style={{ position: 'relative', zIndex: 1, width: '100%' }}
            >
                <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', px: { xs: 2, md: 3 } }}>
                    <Box
                        sx={{
                            maxWidth: 640,
                            mx: 'auto',
                            p: { xs: 3, sm: 4, md: 5 },
                            bgcolor: 'background.paper',
                            borderRadius: RADIUS.card,
                            border: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        {/* Top meta */}
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: RADIUS.pill,
                                    border: '2px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 20,
                                }}
                            >
                                👨‍💻
                            </Box>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.88rem' }}>
                                    Kaushal Kanakamedala
                                </Typography>
                                {about?.location && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                                        {about.location}
                                    </Typography>
                                )}
                            </Box>
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        {/* Name */}
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: '2.4rem', sm: '3rem', md: '3.4rem' },
                                fontWeight: 400,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                mb: 1.5,
                                color: 'text.primary',
                            }}
                        >
                            Kaushal
                        </Typography>
                        <Typography
                            variant="h2"
                            sx={{
                                fontSize: { xs: '2.4rem', sm: '3rem', md: '3.4rem' },
                                fontWeight: 400,
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                mb: 2,
                                color: 'text.secondary',
                            }}
                        >
                            Kanakamedala
                        </Typography>

                        {/* Role + tagline */}
                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: { xs: '1rem', md: '1.1rem' },
                                color: 'text.primary',
                                fontWeight: 500,
                                mb: 0.5,
                            }}
                        >
                            {ROLE_LABELS[roleIndex]}
                        </Typography>
                        {proof && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
                                {proof}
                            </Typography>
                        )}

                        {/* Tags — one neutral treatment (J1). No tags, no row. */}
                        {tags.length > 0 && (
                        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 3.5 }}>
                            {tags.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    sx={{
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        borderRadius: RADIUS.chip,
                                        bgcolor: 'action.hover',
                                        color: 'text.primary',
                                    }}
                                />
                            ))}
                        </Stack>
                        )}

                        <Divider sx={{ mb: 3 }} />

                        {/* CTAs */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => scrollTo('experience')}
                                fullWidth
                                sx={{ fontWeight: 600, borderRadius: RADIUS.pill }}
                            >
                                View Experience
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => scrollTo('projects')}
                                fullWidth
                                sx={{ fontWeight: 500, borderRadius: RADIUS.pill }}
                            >
                                See Projects
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
}
