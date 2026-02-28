'use client';

import { Box, Typography, Paper, Link as MuiLink, useTheme } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { motion } from 'framer-motion';
import type { ContentItem } from '@/lib/contentTypes';
import { COLORS } from '@/theme/theme';

const ICON_MAP: Record<string, React.ReactNode> = {
    github: <GitHubIcon sx={{ fontSize: 32 }} />,
    linkedin: <LinkedInIcon sx={{ fontSize: 32 }} />,
    email: <EmailIcon sx={{ fontSize: 32 }} />,
};

const LABEL_MAP: Record<string, string> = {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
};

interface ContactSectionProps {
    id?: string;
    items: ContentItem[];
}

export default function ContactSection({ id = 'contact', items }: ContactSectionProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

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
                        mb: 1,
                        background: `linear-gradient(135deg, ${COLORS.purple.main} 0%, ${COLORS.cyan.main} 100%)`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block',
                    }}
                >
                    Contact
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Let&apos;s connect. Find me on any of the platforms below.
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 3,
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                    }}
                >
                    {items.map((item, i) => {
                        const iconKey = item.icon ?? (item.title ?? '').toLowerCase();
                        const icon = ICON_MAP[iconKey] ?? <OpenInNewIcon sx={{ fontSize: 32 }} />;
                        const label = LABEL_MAP[iconKey] ?? item.title ?? 'Link';
                        const isPurple = i % 2 === 0;

                        return (
                            <motion.div
                                key={item.slug}
                                whileHover={{ y: -4, scale: 1.03 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <MuiLink
                                    href={item.url ?? '#'}
                                    target={item.url?.startsWith('mailto') ? undefined : '_blank'}
                                    rel="noopener noreferrer"
                                    underline="none"
                                >
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            width: 160,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            borderRadius: 3,
                                            border: '1px solid',
                                            borderColor: isDark
                                                ? isPurple ? 'rgba(124,58,237,0.3)' : 'rgba(6,182,212,0.3)'
                                                : isPurple ? 'rgba(124,58,237,0.2)' : 'rgba(6,182,212,0.2)',
                                            background: isDark
                                                ? isPurple ? 'rgba(124,58,237,0.06)' : 'rgba(6,182,212,0.06)'
                                                : isPurple ? 'rgba(124,58,237,0.04)' : 'rgba(6,182,212,0.04)',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                borderColor: isPurple ? COLORS.purple.main : COLORS.cyan.main,
                                                boxShadow: isPurple
                                                    ? `0 8px 24px ${isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)'}`
                                                    : `0 8px 24px ${isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.12)'}`,
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                color: isPurple ? COLORS.purple.main : COLORS.cyan.main,
                                            }}
                                        >
                                            {icon}
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            fontWeight={600}
                                            sx={{ color: 'text.primary' }}
                                        >
                                            {label}
                                        </Typography>
                                    </Paper>
                                </MuiLink>
                            </motion.div>
                        );
                    })}
                </Box>
            </motion.div>
        </Box>
    );
}
