'use client';
import { Box, Typography, Grid } from '@mui/material';
import { ContentItem } from '@/lib/contentTypes';
import ContentCard from './ContentCard';
import WorkIcon from '@mui/icons-material/Work';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import { ReactNode } from 'react';

interface SectionProps {
    id: string;
    title: string;
    items: ContentItem[];
    variant?: 'timeline' | 'grid';
    icon?: ReactNode;
    color?: string;
}

const sectionIcons: Record<string, ReactNode> = {
    experience: <WorkIcon />,
    projects: <CodeIcon />,
    education: <SchoolIcon />,
};

const sectionColors: Record<string, string> = {
    experience: '#7C3AED', // Purple
    projects: '#8B5CF6', // Light purple
    education: '#A78BFA', // Even lighter purple
};

export default function Section({ id, title, items, variant = 'timeline', icon, color }: SectionProps) {
    const displayIcon = icon || sectionIcons[id.toLowerCase()] || <WorkIcon />;
    const displayColor = color || sectionColors[id.toLowerCase()] || '#7C3AED';

    return (
        <Box
            id={id}
            component="section"
            sx={{
                scrollMarginTop: 100,
                py: 6,
            }}
        >
            {/* Section Header */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 1.5, sm: 2 },
                    mb: { xs: 3, md: 4 },
                }}
            >
                <Box
                    sx={{
                        width: { xs: 36, sm: 40, md: 48 },
                        height: { xs: 3, sm: 4, md: 4 },
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${displayColor} 0%, transparent 100%)`,
                    }}
                />
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 0.75, sm: 1 },
                        color: displayColor,
                    }}
                >
                    {displayIcon}
                    <Typography
                        variant="h5"
                        sx={{
                            fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' },
                            fontWeight: 700,
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
            </Box>

            {/* Content */}
            {variant === 'grid' ? (
                <Grid container spacing={3}>
                    {items.map((item) => (
                        <Grid key={item.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                            <ContentCard item={item} variant="card" />
                        </Grid>
                    ))}
                </Grid>
            )            : (
                <Box
                    sx={{
                        pl: { xs: 1, sm: 2, md: 3 },
                        '& > div': { pl: { xs: 2.5, sm: 3, md: 4 } },
                    }}
                >
                    {items.map((item) => (
                        <ContentCard key={item.slug} item={item} variant="timeline" />
                    ))}
                </Box>
            )}
        </Box>
    );
}
