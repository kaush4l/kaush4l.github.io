'use client';

import { Box } from '@mui/material';
import { useThemeContext } from '@/theme/ThemeProvider';

/**
 * Mounts the current skin's `Atmosphere`, if it has one, in a fixed,
 * pointer-transparent, `z-index: -1` frame behind the whole document.
 *
 * The frame is owned here rather than by each skin so that four skins cannot
 * disagree about the one thing they must not disagree about: whether the
 * atmosphere can ever intercept a pointer event or outrank the content. A skin
 * supplies paint; it does not get to choose its own stacking context.
 *
 * `aria-hidden` and `@media print { display: none }` are likewise non-negotiable
 * and therefore not delegated — atmosphere is decoration, and decoration is
 * neither read aloud nor printed.
 */
export default function SkinAtmosphere() {
    const { skinDef } = useThemeContext();
    const Atmosphere = skinDef.Atmosphere;
    if (!Atmosphere) return null;

    return (
        <Box
            aria-hidden
            className="no-print skin-atmosphere"
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: -1,
                pointerEvents: 'none',
                overflow: 'hidden',
                '@media print': { display: 'none' },
            }}
        >
            <Atmosphere />
        </Box>
    );
}
