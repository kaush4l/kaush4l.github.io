'use client';

import { Box, Typography, Button, Stack, Chip, Divider } from '@mui/material';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const TAGS = ['Java', 'Spring Boot', 'Angular', 'React', 'WebGPU', 'Transformers.js'];
const ROLE_LABELS = [
    'Senior Software Engineer',
    'Full-Stack Architect',
    'On-Device AI Builder',
    'WebGPU Pioneer',
];

export default function HeroC() {
    const [roleIndex, setRoleIndex] = useState(0);

    useEffect(() => {
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
                minHeight: { xs: '70vh', md: '80vh' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                py: { xs: 6, md: 8 },
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ position: 'relative', zIndex: 1, width: '100%' }}
            >
                <Box
                    sx={{
                        maxWidth: 640,
                        mx: 'auto',
                        p: { xs: 3, sm: 4, md: 5 },
                        bgcolor: 'background.paper',
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                >
                    {/* Top meta */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
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
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                                    Durham, NC
                                </Typography>
                            </Box>
                        </Stack>
                    </motion.div>

                    <Divider sx={{ mb: 3 }} />

                    {/* Name */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
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
                    </motion.div>

                    {/* Role + tagline */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.25 }}
                    >
                        <motion.div
                            key={roleIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
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
                        </motion.div>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3, maxWidth: 500 }}
                        >
                            8+ years building production systems — from monoliths to microservices to on-device AI running in your browser.
                        </Typography>
                    </motion.div>

                    {/* Tags */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.35 }}
                    >
                        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 3.5 }}>
                            {TAGS.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        borderColor: 'divider',
                                        color: 'text.secondary',
                                    }}
                                />
                            ))}
                        </Stack>
                    </motion.div>

                    <Divider sx={{ mb: 3 }} />

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                    >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}
                                fullWidth
                                sx={{ fontWeight: 600 }}
                            >
                                View Experience
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                                fullWidth
                            >
                                See Projects
                            </Button>
                        </Stack>
                    </motion.div>
                </Box>
            </motion.div>
        </Box>
    );
}
