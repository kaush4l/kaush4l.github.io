import type { ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import type { SkinTokens } from './types';
import { SKIN_PREPAINT } from './preload';
import type { SkinId } from './types';

/**
 * A skin's ground, declared once and published to BOTH consumers.
 *
 * There are two independent colour systems on this page and a skin that pins
 * the appearance has to satisfy both of them or it is visibly broken:
 *
 *   1. the CSS custom properties (`--bg`, `--text`, …), which colour the
 *      document, `globals.css`, `cinema.css` and every hand-written rule; and
 *   2. MUI's `palette.background` / `palette.text`, which colour every
 *      Emotion-classed surface — AppBar, Drawer, Paper, Card, Menu, Chip.
 *
 * Setting only (1) gives a black page with dark-grey MUI cards from the shared
 * dark theme sitting on it; setting only (2) gives correctly-coloured cards on
 * a ground that never changed. Both failure modes look like a bug rather than a
 * skin, so this helper refuses to let a skin declare the pair separately.
 *
 * The `bg` is not passed in: it is read from `SKIN_PREPAINT`, which is the same
 * table the blocking pre-paint script serialises. That is the whole point — the
 * ground the first frame paints and the ground hydration settles on are, by
 * construction, one value.
 */
export interface Ground {
    /** One step off the ground. Section bands, inset wells. */
    bgAlt: string;
    /** Cards, menus, the drawer. */
    surface: string;
    surfaceAlt: string;
    /** Body copy. Must clear 4.5:1 on `surface` AND on the ground. */
    text: string;
    /** Secondary copy. Must clear 4.5:1 — it is text, not decoration. */
    textMuted: string;
    /** Hairline. An alpha of the accent, usually. */
    border: string;
    /** Links and small text accents. Must clear 4.5:1 on the ground. */
    link: string;
    /** The single hue allowed to glow (M16). */
    glow: string;
    /** Focus indicator. Must clear 3:1 against every fill it can land on. */
    focusRing: string;
}

/** The CSS-custom-property half. */
export function groundTokens(id: SkinId, g: Ground): SkinTokens {
    const bg = SKIN_PREPAINT[id]?.bg;
    if (!bg) throw new Error(`skin "${id}" declares a ground but has no SKIN_PREPAINT entry`);
    return {
        '--bg': bg,
        '--bg-alt': g.bgAlt,
        '--surface': g.surface,
        '--surface-alt': g.surfaceAlt,
        '--text': g.text,
        '--text-muted': g.textMuted,
        '--border': g.border,
        '--link': g.link,
        '--glow': g.glow,
        '--focus-ring': g.focusRing,
    };
}

/** The MUI half. Deep-merged over the base theme by the provider. */
export function groundTheme(id: SkinId, g: Ground): ThemeOptions {
    const bg = SKIN_PREPAINT[id]?.bg;
    if (!bg) throw new Error(`skin "${id}" declares a ground but has no SKIN_PREPAINT entry`);
    return {
        palette: {
            background: { default: bg, paper: g.surface },
            text: { primary: g.text, secondary: g.textMuted },
            divider: g.border,
        },
        components: {
            // Paper is the base every elevated surface inherits from, so it is
            // the one place the skin's surface has to land. `backgroundImage`
            // is MUI's dark-mode elevation overlay — a white wash that lifts
            // every card off the ground by lightening it. On a near-black skin
            // that overlay is the single most damaging default: it turns an
            // intentional void into grey boxes.
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: 'none', backgroundColor: g.surface },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: { backgroundColor: g.surface, borderColor: g.border },
                },
            },
        },
    };
}

/** Convenience for the common `alpha(accent, n)` hairline. */
export function hairline(accent: string, a: number): string {
    return alpha(accent, a);
}
