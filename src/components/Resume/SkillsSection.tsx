'use client';

import { Box, Typography, Chip, Paper } from '@mui/material';
import type { ContentItem } from '@/lib/contentTypes';
import SectionHeading from './SectionHeading';
import { SectionIcon } from '@/components/icons';
import { RADIUS } from '@/theme/ThemeProvider';

interface SkillsSectionProps {
    id?: string;
    title?: string;
    icon?: string;
    accent?: 'primary' | 'secondary';
    items: ContentItem[];
}

export default function SkillsSection({
    id = 'skills',
    title = 'Skills',
    icon = 'build',
    accent,
    items,
}: SkillsSectionProps) {
    // Group by category; carry a display label (the entry title is friendlier
    // than the short category key, e.g. "Cloud & DevOps" vs "Cloud") and the
    // icon key the entry declares in its own frontmatter.
    const groups = items.reduce<Record<string, { label: string; icon: string; items: ContentItem[] }>>(
        (acc, item) => {
            const key = item.category ?? item.title ?? 'Other';
            if (!acc[key]) acc[key] = { label: item.title ?? key, icon: item.icon ?? icon, items: [] };
            acc[key].items.push(item);
            return acc;
        },
        {},
    );

    return (
        <Box component="section" id={id} sx={{ py: { xs: 6, md: 10 } }}>
            <SectionHeading icon={icon} title={title} accent={accent} />

            <Box
                sx={{
                    display: 'grid',
                    // Two columns, not three. Five categories in a 3-up grid
                    // leaves a 325x379 hole in the bottom-right corner, and
                    // stretched rows padded the shortest cards with up to 144px
                    // of empty space below their last chip. `start` lets every
                    // card be exactly as tall as its own content.
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    alignItems: 'start',
                    gap: { xs: 1.5, md: 2 },
                }}
            >
                {Object.entries(groups).map(([category, group]) => {
                    // Skills live in the `tags` frontmatter array; fall back to a
                    // comma-separated `description` for older entries.
                    const allSkills = group.items.flatMap((item) =>
                        item.tags && item.tags.length
                            ? item.tags
                            : (item.description ?? '')
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                    );

                    // The authored one-liner: the panel's voice, above the index.
                    const blurb = group.items.find((item) => item.contentHtml)?.contentHtml;

                    return (
                        <Paper
                            key={category}
                            elevation={0}
                            sx={{
                                p: 2.5,
                                height: '100%',
                                borderRadius: RADIUS.card,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                transition:
                                    'transform 150ms cubic-bezier(0.2,0,0,1), box-shadow 150ms cubic-bezier(0.2,0,0,1), border-color 150ms linear',
                                '&:hover': { borderColor: 'primary.main' },
                            }}
                        >
                            <Typography
                                variant="overline"
                                sx={{
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    letterSpacing: '0.08em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    mb: 1.5,
                                }}
                            >
                                <SectionIcon name={group.icon} sx={{ fontSize: 18, color: 'primary.main' }} />
                                {group.label}
                            </Typography>

                            {blurb && (
                                <Box
                                    className="prose-content"
                                    dangerouslySetInnerHTML={{ __html: blurb }}
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.875rem',
                                        lineHeight: 1.5,
                                        mb: 1.5,
                                        '& p': { m: 0 },
                                    }}
                                />
                            )}

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {allSkills.map((skill) => (
                                    <Chip
                                        key={skill}
                                        label={skill}
                                        size="small"
                                        sx={{
                                            bgcolor: 'action.hover',
                                            color: 'text.primary',
                                            fontWeight: 500,
                                            fontSize: '0.8125rem',
                                            borderRadius: RADIUS.chip,
                                            border: 'none',
                                            height: 28,
                                            px: 1.25,
                                        }}
                                    />
                                ))}
                            </Box>
                        </Paper>
                    );
                })}
            </Box>
        </Box>
    );
}
