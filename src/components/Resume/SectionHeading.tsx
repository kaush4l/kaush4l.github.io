'use client';

/**
 * SectionHeading — the single landmark treatment for every section on the page.
 *
 * There is exactly one heading system: accent bar → section icon → title.
 * `accent` is content metadata (`_section.md`) resolved against the live
 * palette, so theme variants and dark mode carry through with no per-section
 * code. Nothing here knows the name of any section.
 */

import { Box, Typography, useTheme } from '@mui/material';
import { SectionIcon } from '@/components/icons';
import { RADIUS } from '@/theme/ThemeProvider';

export interface SectionHeadingProps {
    /** Icon registry key from the section's `_section.md` (e.g. `work`). */
    icon: string;
    title: string;
    /** Palette channel the section accents against. Defaults to `primary`. */
    accent?: 'primary' | 'secondary';
}

export default function SectionHeading({ icon, title, accent = 'primary' }: SectionHeadingProps) {
    const theme = useTheme();
    // `main` is a FILL color (see the palette contract in ThemeProvider): the
    // 3px bar is decorative and may use it. The icon is a *glyph* and needs the
    // tonal channel that opposes the surface — `dark` on light, `light` on dark
    // — or `secondary`'s cyan lands at 2.35:1 on every section it accents.
    const accentColor = theme.palette[accent].main;
    const glyphColor = theme.palette[accent][theme.palette.tonal];

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                mb: { xs: 3, md: 4 },
            }}
        >
            <Box
                aria-hidden
                sx={{
                    flexShrink: 0,
                    width: 48,
                    height: '3px',
                    borderRadius: RADIUS.chip,
                    background: `linear-gradient(90deg, ${accentColor} 0%, transparent 100%)`,
                }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <SectionIcon name={icon} sx={{ fontSize: 24, color: glyphColor }} />
                <Typography
                    component="h2"
                    variant="h5"
                    sx={{
                        // The middle term carries a `rem` so the heading keeps
                        // scaling with browser zoom; a pure `vw` term collapses
                        // every heading to the 1.5rem floor at 200%.
                        fontSize: 'clamp(1.5rem, 1.25rem + 0.8vw, 1.875rem)',
                        fontWeight: 600,
                        color: 'text.primary',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                    }}
                >
                    {title}
                </Typography>
            </Box>
        </Box>
    );
}
