'use client';

import { Box, Typography, Avatar, Paper, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import type { ContentItem } from '@/lib/contentTypes';
import { COLORS } from '@/theme/theme';

interface AboutSectionProps {
    id?: string;
    items: ContentItem[];
}

export default function AboutSection({ id = 'about', items }: AboutSectionProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const bio = items[0];

    if (!bio) return null;

    return (
        <Box
            component="section"
            id={id}
            sx={{ py: 8, scrollMarginTop: 80 }}
        >
            <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
            >
                <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                        mb: 4,
                        background: `linear-gradient(135deg, ${COLORS.purple.main} 0%, ${COLORS.cyan.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block',
                    }}
                >
                    About
                </Typography>

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, md: 4 },
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)',
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(6,182,212,0.06) 100%)'
                            : 'linear-gradient(135deg, rgba(124,58,237,0.04) 0%, rgba(6,182,212,0.04) 100%)',
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 4,
                        alignItems: { xs: 'center', md: 'flex-start' },
                    }}
                >
                    {/* Avatar */}
                    <Box sx={{ flexShrink: 0 }}>
                        <Avatar
                            sx={{
                                width: 120,
                                height: 120,
                                fontSize: '3rem',
                                background: `linear-gradient(135deg, ${COLORS.purple.main} 0%, ${COLORS.cyan.main} 100%)`,
                                fontWeight: 700,
                            }}
                        >
                            KK
                        </Avatar>
                    </Box>

                    {/* Bio text */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {bio.title && (
                            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                                {bio.title}
                            </Typography>
                        )}
                        {bio.description && (
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{ mb: 2, fontStyle: 'italic' }}
                            >
                                {bio.description}
                            </Typography>
                        )}
                        <Box
                            className="prose-content"
                            dangerouslySetInnerHTML={{ __html: bio.contentHtml }}
                            sx={{
                                '& ul': { pl: 2 },
                                '& li': { mb: 0.5 },
                                '& strong': { color: isDark ? COLORS.purple.light : COLORS.purple.main },
                            }}
                        />
                    </Box>
                </Paper>
            </motion.div>
        </Box>
    );
}
