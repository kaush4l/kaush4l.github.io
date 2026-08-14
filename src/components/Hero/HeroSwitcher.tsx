'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, ButtonGroup, Button, Tooltip } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { RADIUS } from '@/theme/ThemeProvider';

// E1: HeroA is imported STATICALLY so it is present in the static export's HTML.
// `dynamic(..., { ssr: false })` shipped a hero-less document, and the hero then
// mounted after hydration and shoved the whole page down ~85vh.
import HeroA from './HeroA';
import type { HeroProps } from './HeroA';

// B/C/D exist only for the dev-only variant picker, so they stay lazy.
// E4: this is only true because `./index.ts` does not re-export them — a barrel
// re-export puts them back in the page's module graph and defeats the split.
const HeroB = dynamic(() => import('./HeroB'), { ssr: false });
const HeroC = dynamic(() => import('./HeroC'), { ssr: false });
const HeroD = dynamic(() => import('./HeroD'), { ssr: false });

export type HeroVariant = 'A' | 'B' | 'C' | 'D';

const HEROES: Record<HeroVariant, React.ComponentType<HeroProps>> = {
    A: HeroA, B: HeroB, C: HeroC, D: HeroD,
};
const HERO_LABELS: Record<HeroVariant, string> = {
    A: 'Gradient Hero',
    B: 'Terminal',
    C: 'Minimalist',
    D: 'Particle Canvas',
};

function getInitialVariant(): HeroVariant {
    const envVariant = process.env.NEXT_PUBLIC_HERO_VARIANT as HeroVariant | undefined;
    if (envVariant && ['A', 'B', 'C', 'D'].includes(envVariant)) return envVariant;
    return 'A';
}

/**
 * F1: the about item travels `page.tsx` → here → the rendered hero, so the
 * fold's copy is authored in `content/01-about/01-bio.md` like everything else.
 */
export default function HeroSwitcher({ about }: HeroProps) {
    const [variant, setVariant] = useState<HeroVariant>(getInitialVariant);
    const isDev = process.env.NODE_ENV === 'development';

    const Hero = HEROES[variant];

    return (
        // E1: the height is reserved on the wrapper, so swapping variants (or a
        // lazy variant arriving late) can never reflow the document.
        <Box sx={{ position: 'relative', minHeight: { xs: '75vh', md: '85vh' } }}>
            <Hero about={about} />

            {/* E7: dev-only variant picker (the theme picker is gated the same way) */}
            {isDev && (
                <Box
                    sx={{
                        position: 'fixed',
                        // Bottom-left so it never collides with the chat FAB (bottom-right).
                        bottom: { xs: 16, md: 20 },
                        left: { xs: 16, md: 20 },
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: RADIUS.floating,
                        p: 0.75,
                        transform: { xs: 'scale(0.85)', md: 'scale(1)' },
                        transformOrigin: 'left bottom',
                    }}
                >
                    <Tooltip title="Hero variant" placement="left">
                        <TuneIcon sx={{ fontSize: 18, color: 'text.secondary', ml: 0.5 }} />
                    </Tooltip>
                    <ButtonGroup size="small" variant="outlined">
                        {(['A', 'B', 'C', 'D'] as HeroVariant[]).map((v) => (
                            <Tooltip key={v} title={HERO_LABELS[v]} placement="top">
                                <Button
                                    onClick={() => setVariant(v)}
                                    variant={variant === v ? 'contained' : 'outlined'}
                                    sx={{
                                        minWidth: 32,
                                        fontWeight: 500,
                                        fontSize: '0.75rem',
                                        px: 0,
                                    }}
                                >
                                    {v}
                                </Button>
                            </Tooltip>
                        ))}
                    </ButtonGroup>
                </Box>
            )}
        </Box>
    );
}
