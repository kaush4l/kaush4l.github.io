'use client';

import { Box, Typography, Avatar, Paper, Stack } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import type { ContentItem } from '@/lib/contentTypes';
import SectionHeading from './SectionHeading';
import { RADIUS } from '@/theme/ThemeProvider';

interface AboutSectionProps {
    id?: string;
    title?: string;
    icon?: string;
    accent?: 'primary' | 'secondary';
    items: ContentItem[];
}

/** Derive avatar initials from content rather than hardcoding them. */
function initialsFrom(name: string | undefined): string {
    if (!name) return '';
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export default function AboutSection({
    id = 'about',
    title = 'About',
    icon = 'person',
    accent,
    items,
}: AboutSectionProps) {
    const bio = items[0];

    if (!bio) return null;

    return (
        <Box component="section" id={id} sx={{ py: { xs: 6, md: 10 } }}>
            <SectionHeading icon={icon} title={title} accent={accent} />

            <Paper
                elevation={0}
                sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: RADIUS.card,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 4,
                    alignItems: { xs: 'center', md: 'flex-start' },
                }}
            >
                {/* Avatar */}
                <Box
                    sx={{
                        flexShrink: 0,
                        mb: { xs: 2, md: 0 },
                        alignSelf: { xs: 'center', md: 'flex-start' },
                    }}
                >
                    <Avatar
                        alt={bio.title}
                        sx={{
                            width: { xs: 80, md: 120 },
                            height: { xs: 80, md: 120 },
                            fontSize: { xs: '1.8rem', md: '3rem' },
                            fontWeight: 600,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                        }}
                    >
                        {initialsFrom(bio.title)}
                    </Avatar>
                </Box>

                {/* Bio text — the name is already in the header and the hero; it does
                    not get a third slot here. */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {bio.location && (
                        <Stack
                            direction="row"
                            alignItems="center"
                            spacing={0.5}
                            sx={{ mb: 1.5, color: 'text.secondary' }}
                        >
                            <PlaceIcon sx={{ fontSize: 18 }} />
                            <Typography variant="caption" sx={{ letterSpacing: '0.02em' }}>
                                {bio.location}
                            </Typography>
                        </Stack>
                    )}
                    <Box
                        className="prose-content"
                        dangerouslySetInnerHTML={{ __html: bio.contentHtml }}
                        sx={{
                            color: 'text.primary',
                            maxWidth: '68ch',
                            // M33 — no `& strong` override, matching ContentCard.
                            // Emphasis colour is owned by
                            // `.prose-content strong { color: var(--link) }` in
                            // globals.css, which is the only mode-aware source.
                        }}
                    />
                </Box>
            </Paper>
        </Box>
    );
}
