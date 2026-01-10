'use client';
import { Box, Typography, Chip, Card, CardContent, Stack } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { ContentItem } from '@/lib/contentTypes';

interface ContentCardProps {
    item: ContentItem;
    variant?: 'timeline' | 'card';
}

export default function ContentCard({ item, variant = 'card' }: ContentCardProps) {
    const tags = item.tags || item.tools || [];

    if (variant === 'timeline') {
        return (
            <Box
                sx={{
                    position: 'relative',
                    pl: 4,
                    pb: 4,
                    borderLeft: '2px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderColor: 'transparent' },
                    '&:hover': {
                        '& .timeline-dot': {
                            backgroundColor: 'primary.main',
                            transform: 'scale(1.2)',
                        },
                    },
                }}
            >
                {/* Timeline dot */}
                <Box
                    className="timeline-dot"
                    sx={{
                        position: 'absolute',
                        left: -7,
                        top: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        border: '3px solid',
                        borderColor: 'primary.light',
                        transition: 'all 0.3s ease',
                    }}
                />

                {/* Period badge */}
                {item.period && (
                    <Chip
                        label={item.period}
                        size="small"
                        sx={{
                            mb: 1,
                            backgroundColor: 'rgba(124, 58, 237, 0.08)',
                            color: 'primary.main',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                        }}
                    />
                )}

                <Typography variant="h5" fontWeight={700} gutterBottom>
                    {item.title}
                </Typography>

                {item.subtitle && (
                    <Typography variant="h6" color="primary.main" fontWeight={500} sx={{ mb: 2 }}>
                        {item.subtitle}
                    </Typography>
                )}

                {tags.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                        {tags.map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                variant="outlined"
                                size="small"
                                sx={{
                                    fontSize: '0.75rem',
                                }}
                            />
                        ))}
                    </Stack>
                )}

                <Box
                    sx={{
                        color: 'text.secondary',
                        '& p': { my: 1 },
                        '& ul': { pl: 3, my: 1 },
                        '& li': { my: 0.5 },
                    }}
                    dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                />

                {item.quote && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 2,
                            borderLeft: '3px solid',
                            borderColor: 'primary.light',
                            backgroundColor: 'rgba(124, 58, 237, 0.04)',
                            borderRadius: 1,
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                        }}
                    >
                        <FormatQuoteIcon sx={{ color: 'primary.light', opacity: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                            {item.quote}
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    }

    // Card variant
    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        {item.title}
                    </Typography>
                    {item.link && (
                        <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', display: 'flex' }}
                        >
                            <OpenInNewIcon sx={{ fontSize: 20, color: 'text.secondary', '&:hover': { color: 'primary.main' } }} />
                        </a>
                    )}
                </Box>

                {item.subtitle && (
                    <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ mb: 1 }}>
                        {item.subtitle}
                    </Typography>
                )}

                {item.period && (
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ mb: 2, display: 'block' }}>
                        {item.period}
                    </Typography>
                )}

                {tags.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
                        {tags.slice(0, 4).map((tag) => (
                            <Chip
                                key={tag}
                                label={tag}
                                variant="outlined"
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                            />
                        ))}
                        {tags.length > 4 && (
                            <Chip
                                label={`+${tags.length - 4}`}
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                            />
                        )}
                    </Stack>
                )}

                <Box
                    sx={{
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        '& p': { my: 0.5 },
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                />
            </CardContent>
        </Card>
    );
}
