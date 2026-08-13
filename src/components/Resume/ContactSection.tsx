'use client';

import { useState } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Link as MuiLink, Stack } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { motion } from 'framer-motion';
import type { ContentItem } from '@/lib/contentTypes';
import SectionHeading from './SectionHeading';
import { SectionIcon } from '@/components/icons';
import { RADIUS } from '@/theme/ThemeProvider';

interface ContactSectionProps {
    id?: string;
    title?: string;
    icon?: string;
    accent?: 'primary' | 'secondary';
    /** Opening line from the section's `_section.md`. Nothing is rendered without it. */
    intro?: string;
    items: ContentItem[];
}

export default function ContactSection({
    id = 'contact',
    title = 'Contact',
    icon = 'contact',
    accent,
    intro,
    items,
}: ContactSectionProps) {
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const copy = async (slug: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedSlug(slug);
            window.setTimeout(() => setCopiedSlug((s) => (s === slug ? null : s)), 1800);
        } catch {
            /* Clipboard unavailable (insecure context) — the address is still selectable. */
        }
    };

    return (
        <Box component="section" id={id} sx={{ py: { xs: 6, md: 10 } }}>
            <SectionHeading icon={icon} title={title} accent={accent} />

            {/* The last prose before the footer is content, not a component string. */}
            {intro && (
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: '60ch' }}>
                    {intro}
                </Typography>
            )}

            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    justifyContent: { xs: 'center', sm: 'flex-start' },
                }}
            >
                {items.map((item) => {
                    const iconKey = item.icon ?? (item.title ?? '').toLowerCase();
                    const label = item.title ?? 'Link';
                    // A `mailto:` (or `tel:`) target is a literal string a recruiter
                    // needs to paste into an ATS — offer a copy control for it.
                    const copyable = Boolean(item.subtitle && item.url?.includes('mailto:'));
                    const copied = copiedSlug === item.slug;

                    return (
                        <motion.div
                            key={item.slug}
                            whileHover={{ y: -4 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    // Wide enough that the full address sits on one
                                    // line beside its copy button from `sm` up.
                                    width: { xs: '100%', sm: 260, md: 280 },
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 1,
                                    borderRadius: RADIUS.card,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    bgcolor: 'background.paper',
                                    transition:
                                        'transform 150ms cubic-bezier(0.2,0,0,1), box-shadow 150ms cubic-bezier(0.2,0,0,1), border-color 150ms linear',
                                    '&:hover': { borderColor: 'primary.main' },
                                }}
                            >
                                <MuiLink
                                    href={item.url ?? '#'}
                                    target={item.url?.startsWith('mailto') ? undefined : '_blank'}
                                    rel="noopener noreferrer"
                                    underline="none"
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 1,
                                        color: 'primary.main',
                                    }}
                                >
                                    <SectionIcon name={iconKey} fallback="link" sx={{ fontSize: 32 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                        {label}
                                    </Typography>
                                </MuiLink>

                                {item.subtitle && (
                                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ maxWidth: '100%' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                userSelect: 'all',
                                                textAlign: 'center',
                                                // Only break when there is genuinely no
                                                // room — never mid-word in an address
                                                // that fits, and never hyphenated.
                                                overflowWrap: 'anywhere',
                                                hyphens: 'none',
                                            }}
                                        >
                                            {item.subtitle}
                                        </Typography>
                                        {copyable && (
                                            <Tooltip title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}>
                                                <IconButton
                                                    size="small"
                                                    aria-label={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
                                                    onClick={() => copy(item.slug, item.subtitle as string)}
                                                    sx={{ color: copied ? 'success.main' : 'text.secondary' }}
                                                >
                                                    {copied ? (
                                                        <CheckIcon sx={{ fontSize: 16 }} />
                                                    ) : (
                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>
                                )}

                                {/* The authored body — what this channel is actually
                                    for. Three identical tiles become three offers. */}
                                {item.contentHtml && (
                                    <Box
                                        className="prose-content"
                                        dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                                        sx={{
                                            mt: 0.5,
                                            color: 'text.secondary',
                                            fontSize: '0.75rem',
                                            lineHeight: 1.5,
                                            textAlign: 'center',
                                            textWrap: 'balance',
                                            '& p': { m: 0 },
                                        }}
                                    />
                                )}
                            </Paper>
                        </motion.div>
                    );
                })}
            </Box>
        </Box>
    );
}
