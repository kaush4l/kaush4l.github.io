'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, ButtonGroup, Button, Tooltip } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';

// Lazy-load each hero to keep initial bundle lean
const HeroA = dynamic(() => import('./HeroA'), { ssr: false });
const HeroB = dynamic(() => import('./HeroB'), { ssr: false });
const HeroD = dynamic(() => import('./HeroD'), { ssr: false });

export type HeroVariant = 'A' | 'B' | 'D';

const HEROES: Record<HeroVariant, React.ComponentType> = { A: HeroA, B: HeroB, D: HeroD };
const HERO_LABELS: Record<HeroVariant, string> = {
    A: 'Gradient Hero',
    B: 'Terminal',
    D: 'Particle Canvas',
};

function getInitialVariant(): HeroVariant {
    // Env var set at build time selects the default
    const envVariant = process.env.NEXT_PUBLIC_HERO_VARIANT as HeroVariant | undefined;
    if (envVariant && ['A', 'B', 'D'].includes(envVariant)) return envVariant;
    return 'A';
}

export default function HeroSwitcher() {
    const [variant, setVariant] = useState<HeroVariant>(getInitialVariant);
    const isDev = process.env.NODE_ENV === 'development';

    const Hero = HEROES[variant];

    return (
        <Box sx={{ position: 'relative' }}>
            <Hero />

            {/* Dev-mode floating variant picker */}
            {isDev && (
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 80,
                        right: 20,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        p: 0.75,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                >
                    <Tooltip title="Hero variant" placement="left">
                        <TuneIcon sx={{ fontSize: 18, color: 'text.secondary', ml: 0.5 }} />
                    </Tooltip>
                    <ButtonGroup size="small" variant="outlined">
                        {(['A', 'B', 'D'] as HeroVariant[]).map((v) => (
                            <Tooltip key={v} title={HERO_LABELS[v]} placement="top">
                                <Button
                                    key={v}
                                    onClick={() => setVariant(v)}
                                    variant={variant === v ? 'contained' : 'outlined'}
                                    sx={{
                                        minWidth: 32,
                                        fontWeight: 700,
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
