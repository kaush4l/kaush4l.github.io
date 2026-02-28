'use client';

import { Box, Typography, Chip, Paper, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import type { ContentItem } from '@/lib/contentTypes';
import { COLORS } from '@/theme/theme';

interface SkillsSectionProps {
    id?: string;
    items: ContentItem[];
}

const CATEGORY_ICONS: Record<string, string> = {
    Languages: '{ }',
    Frameworks: '⚛',
    'Cloud & DevOps': '☁',
    'AI & ML': '🤖',
    'Tools & Databases': '🛠',
};

const chipColorIndex = (i: number, isDark: boolean) => {
    const palettes = [
        { bg: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)', color: isDark ? COLORS.purple.light : COLORS.purple.dark },
        { bg: isDark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.1)', color: isDark ? COLORS.cyan.light : COLORS.cyan.dark },
    ];
    return palettes[i % 2];
};

export default function SkillsSection({ id = 'skills', items }: SkillsSectionProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    // Group by category
    const groups = items.reduce<Record<string, ContentItem[]>>((acc, item) => {
        const key = item.category ?? item.title ?? 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

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
                        background: `linear-gradient(135deg, ${COLORS.cyan.main} 0%, ${COLORS.purple.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block',
                    }}
                >
                    Skills
                </Typography>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
                        gap: 2,
                    }}
                >
                    {Object.entries(groups).map(([category, groupItems], groupIdx) => {
                        // Each item in the group may have comma-separated skills in description
                        const allSkills = groupItems.flatMap((item) =>
                            (item.description ?? item.title ?? '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                        );

                        return (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0, scale: 0.96 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: groupIdx * 0.08 }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        height: '100%',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)',
                                        background: isDark
                                            ? 'rgba(6,182,212,0.04)'
                                            : 'rgba(6,182,212,0.03)',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            borderColor: COLORS.cyan.main,
                                            boxShadow: `0 4px 20px ${isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.1)'}`,
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="overline"
                                        fontWeight={700}
                                        sx={{
                                            color: COLORS.cyan.main,
                                            letterSpacing: '0.08em',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.75,
                                            mb: 1.5,
                                        }}
                                    >
                                        <span>{CATEGORY_ICONS[category] ?? '◆'}</span>
                                        {category}
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {allSkills.map((skill, i) => {
                                            const palette = chipColorIndex(i, isDark);
                                            return (
                                                <Chip
                                                    key={skill}
                                                    label={skill}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: palette.bg,
                                                        color: palette.color,
                                                        fontWeight: 500,
                                                        fontSize: '0.72rem',
                                                        border: 'none',
                                                        height: 24,
                                                    }}
                                                />
                                            );
                                        })}
                                    </Box>
                                </Paper>
                            </motion.div>
                        );
                    })}
                </Box>
            </motion.div>
        </Box>
    );
}
