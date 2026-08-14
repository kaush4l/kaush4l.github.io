'use client';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline, Box, IconButton, Menu, MenuItem, ListItemText, Tooltip, Typography } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { createTheme, alpha } from '@mui/material/styles';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { mixChannels, rgbChannels } from '@/lib/motion';

// Expose a first-class mono family on the theme so components never hardcode a
// monospace stack. Populated below from the `--font-mono` next/font variable.
declare module '@mui/material/styles' {
    interface TypographyVariants {
        fontFamilyMono: string;
    }
    interface TypographyVariantsOptions {
        fontFamilyMono?: string;
    }
    /**
     * `tonal` names the channel (`light` | `dark`) that opposes the current
     * mode's ground, so `theme.palette[accent][theme.palette.tonal]` is always
     * the text-safe tone. One owner, set from `MODE_SURFACES[…].linkKey`.
     */
    interface Palette {
        tonal: 'light' | 'dark';
    }
    interface PaletteOptions {
        tonal?: 'light' | 'dark';
    }
}

// ─── Design tokens ───────────────────────────────────────────────────────────

/** Font stacks. The variables are defined by next/font in `layout.tsx`. */
const FONT_SANS = 'var(--font-sans), system-ui, -apple-system, sans-serif';
const FONT_MONO = 'var(--font-mono), ui-monospace, monospace';

/**
 * Amarante is the site's default face, by explicit choice — it is the brand.
 *
 * It ships **one weight (400) and no italic**, so weight-based hierarchy is not
 * available: asking for 600 would make the browser synthesise a smeared faux
 * bold. `font-synthesis: none` in `globals.css` forbids that, so every heading
 * below renders at 400 and hierarchy is carried by **size, letter-spacing and
 * colour** instead. Inter stays in the stack as the metric fallback so the page
 * is still well-set if Amarante fails to load.
 */
const FONT_DISPLAY = 'var(--font-display), var(--font-sans), Georgia, serif';

/**
 * Corner-radius scale — the single source of corner geometry.
 * `shape.borderRadius` stays at MUI's default base of 4 — every
 * `sx={{ borderRadius: n }}` in the codebase was written against that
 * multiplier. Component surfaces use explicit px from this scale and nothing
 * else; import it (`import { RADIUS } from '@/theme/ThemeProvider'`) rather
 * than re-declaring or writing px literals.
 *
 * `tail` is the squared-off corner a speech bubble turns toward its author.
 *
 * RADIUS is shared across all three appearances (M37 is not fixed here): coder
 * mode expresses its difference through **ground and border**, not geometry.
 */
export const RADIUS = {
    tail: '4px',
    chip: '8px',
    card: '16px',
    floating: '20px',
    pill: '999px',
} as const;

/** Named-property transitions only — never `all`. Decelerate curve, 150ms. */
const TRANSITION =
    'transform 150ms cubic-bezier(0.2,0,0,1), box-shadow 150ms cubic-bezier(0.2,0,0,1), border-color 150ms linear';

// ─── Appearance (the user-facing mode) ───────────────────────────────────────

/**
 * M1/M4 — the three appearances the user picks between. `coder` is a *superset
 * of dark*: it stamps `data-theme="dark"` and its surface table is a darker,
 * hairline-ruled variation on the dark one.
 *
 * **INVARIANT (M4, M1):** every colour coder mode needs lives in
 * `MODE_SURFACES.coder` below. The effects layer (`src/app/coder.css`, scoped
 * entirely under `[data-effects="coder"]`) owns *only* glow, motion and
 * decoration. Delete `coder.css` outright and the page must still read as a
 * correct, complete dark theme — never a broken one. Nothing in this file may
 * depend on that stylesheet existing.
 */
export type Appearance = 'light' | 'dark' | 'coder';

/**
 * The single source of the appearance menu's copy. The header renders from this
 * — do not re-declare the labels at the call site (M3).
 *
 * `Coder`'s hint promises *machine state*, not "glow and animations": a promise
 * that names decoration invites the reader to judge it as decoration (M3/M17).
 */
export const APPEARANCES: ReadonlyArray<{ value: Appearance; label: string; hint: string }> = [
    { value: 'light', label: 'Light', hint: 'Bright surfaces, soft shadows' },
    { value: 'dark', label: 'Dark', hint: 'Dim surfaces, hairline edges' },
    { value: 'coder', label: 'Coder', hint: 'Terminal surfaces, live machine state' },
] as const;

// ─── Hue table ───────────────────────────────────────────────────────────────

export type ThemeVariant = 'a' | 'b' | 'c' | 'd';

/**
 * M4 — the hue table owns **hue only**.
 *
 * It previously carried twelve surface/chrome fields per variant (`bg`,
 * `surface`, `text`, `textMuted`, `cardBorder`, `cardShadow`, `scrollbarThumb`,
 * `scrollbarHover`, `chipBg`, `chipColor`, `bgAlt`, `surfaceAlt`) plus a
 * `dark: boolean` flag. That made *darkness a property of the hue*, which is
 * the single structural reason "there is no dark mode": `createThemeForVariant`
 * set `palette.mode` from the toggle and then overwrote `background.*` and
 * `text.*` from the hue table on the next lines. Surfaces are now owned by
 * `MODE_SURFACES`; those fields are deleted, not moved.
 */
export interface ThemePalette {
    name: string;
    label: string;
    // ─── Color-usage contract (read before adding a call site) ───────────────
    // `primary`/`secondary` are FILL colors: backgrounds, bars, dots, icons on
    // a neutral surface at ≥ 3:1. They are NOT text colors — `secondary` in
    // particular is a saturated cyan/green that measures ~2.4:1 as body text on
    // a light surface.
    // For TEXT and small icons use the tonal channel that opposes the surface:
    //   light surface → `…Dark`   |   dark surface → `…Light`
    // Which one that is, is decided by `MODE_SURFACES[appearance].linkKey` /
    // `.glowKey` — never by an `isDark` ternary at the call site.
    // When a fill is used *behind* text, the text takes `contrastText` — never
    // a hardcoded `#fff`, and never a mode-derived guess (see D2).
    primary: string;
    primaryLight: string;
    primaryDark: string;
    /** Text/icon color on a `primary` fill. Verified ≥ 4.5:1 per variant. */
    primaryContrast: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    /** Text/icon color on a `secondary` fill. Verified ≥ 4.5:1 per variant. */
    secondaryContrast: string;
    /** Brand ramp for the hero/wordmark. Hue-owned; mode-independent today. */
    heroGradient: string;
}

export const THEME_PALETTES: Record<ThemeVariant, ThemePalette> = {
    // A: Purple Glow — the brand hue.
    a: {
        name: 'a',
        label: 'Purple Glow',
        primary: '#7C3AED',
        primaryLight: '#A78BFA', // text channel on dark grounds — 6.71:1 on #12151C, 7.26:1 on #0A0A0F
        primaryDark: '#5B21B6', // text channel on light grounds — 8.61:1 on #FAFAFA
        primaryContrast: '#FFFFFF', // 5.70:1 on #7C3AED
        secondary: '#06B6D4',
        secondaryLight: '#67E8F9', // coder accent / dark text channel
        secondaryDark: '#0E7490', // text channel — 5.13:1 on #FAFAFA, 5.36:1 on #FFFFFF
        secondaryContrast: '#062A32', // 6.25:1 on #06B6D4 (white would be 2.43:1)
        heroGradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #06B6D4 100%)',
    },
    // B: Amber / emerald.
    b: {
        name: 'b',
        label: 'Deep Slate',
        primary: '#F59E0B',
        primaryLight: '#FCD34D',
        primaryDark: '#B45309', // text channel on light grounds
        primaryContrast: '#231A02', // 8.01:1 on #F59E0B (white would be 2.15:1)
        secondary: '#10B981',
        secondaryLight: '#6EE7B7',
        secondaryDark: '#047857',
        secondaryContrast: '#04231A', // 6.57:1 on #10B981
        heroGradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 50%, #10B981 100%)',
    },
    // C: Blue / green.
    c: {
        name: 'c',
        label: 'Clean Minimal',
        primary: '#2563EB',
        primaryLight: '#93C5FD',
        primaryDark: '#1D4ED8', // text channel — 6.70:1 on #FFFFFF
        primaryContrast: '#FFFFFF', // 5.17:1 on #2563EB
        secondary: '#16A34A',
        secondaryLight: '#86EFAC',
        secondaryDark: '#15803D', // text channel — 5.02:1 on #FFFFFF
        secondaryContrast: '#04231A', // 5.06:1 on #16A34A (white would be 3.30:1)
        heroGradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #16A34A 100%)',
    },
    // D: Magenta / cyan.
    d: {
        name: 'd',
        label: 'Neon Cyber',
        primary: '#A855F7',
        primaryLight: '#D8B4FE',
        primaryDark: '#7E22CE',
        primaryContrast: '#12071F', // 4.93:1 on #A855F7 (white would be 3.96:1)
        secondary: '#22D3EE',
        secondaryLight: '#67E8F9',
        secondaryDark: '#0E7490',
        secondaryContrast: '#062A32', // 8.39:1 on #22D3EE (white would be 1.81:1)
        heroGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #22D3EE 100%)',
    },
};

// ─── Mode tables — surfaces are owned by the MODE, never by the hue (M4) ─────

/**
 * Three peer tables, authored top to bottom, **light first** (M25).
 *
 * Light is not "dark with the lights on" and is not derived from dark by
 * ternary: every one of its values — including its elevation language — is
 * authored here in its own block. The mechanical test for this is
 * a grep for an `isDark`-conditional expression in this file returning zero
 * hits. There is no such ternary anywhere below; branching is done by *looking
 * a value up* in this record. (The test string is deliberately not quoted here
 * — spelling it out would make the comment its own counterexample.)
 *
 * ── Measured contrast, computed (not estimated) for every ground ────────────
 * Formula: WCAG 2.1 relative luminance, (L1+0.05)/(L2+0.05).
 *
 * | appearance | ground              | body `text`         | `textMuted`        |
 * |------------|---------------------|---------------------|--------------------|
 * | light      | bg      #FAFAFA     | #1F2937 → 14.06:1   | #5B6472 →  5.73:1  |
 * | light      | surface #FFFFFF     | #1F2937 → 14.68:1   | #5B6472 →  5.98:1  |
 * | light      | surfAlt #F1F5F9     | #1F2937 → 13.40:1   | #5B6472 →  5.46:1  |
 * | dark       | bg      #12151C     | #E8EAF0 → 15.18:1   | #A2ACBD →  7.98:1  |
 * | coder      | bg      #0A0A0F     | #E6EAF2 → 16.38:1   | #B0BBCB → 10.17:1  |
 *
 * ── Why coder's muted is lifted to #B0BBCB (M24) ────────────────────────────
 * M24 measured `#94A3B8` on `#0A0A0F` at 7.70:1, falling to **4.45:1** — a
 * fail — once a 40% accent glow is layered near a card edge. That computation
 * used the purple accent (`#A855F7`, L 0.2153). Coder's single accent here is
 * the *cyan* `secondaryLight` (`#67E8F9`, L 0.6744), which is far brighter and
 * washes harder, so `#94A3B8` would fail sooner still. Recomputed against the
 * actual shipped accent, over the actual shipped ground:
 *
 * | muted   | on #0A0A0F | over 30% #67E8F9 | over 40% #67E8F9 |
 * |---------|------------|------------------|------------------|
 * | #94A3B8 |    7.70:1  |  4.05:1 — FAILS  |  2.95:1 — FAILS  |
 * | #B0BBCB |   10.17:1  |  4.75:1 — passes |  3.46:1 — FAILS  |
 *
 * Body `#E6EAF2` over the same 30% wash is 7.65:1. So: `#B0BBCB` clears AA with
 * headroom at the **0.30 resting-alpha ceiling M13 specifies**, and the 40%
 * column is the arithmetic proof that the ceiling is not arbitrary. The effects
 * layer must not exceed 0.30 at rest, and must never paint glow *behind* a
 * text-bearing box — edge glows only.
 *
 * ── Focus ring (M36) ────────────────────────────────────────────────────────
 * `focusRing` is a MODE field, never the hue. `--primary` is the documented
 * FILL channel, so a `--primary` ring on the sidebar's active item, a contained
 * button or the chat FAB was primary-on-primary — no visible indicator on three
 * of the page's most important controls. Measured against the worst case (a
 * `primary.main` fill on variant a, `#7C3AED`):
 *   light `#111318` vs `#7C3AED` → 3.26:1 ✓ (and 18.58:1 on #FFFFFF)
 *   dark/coder `#F5F7FF` vs `#7C3AED` → 5.33:1 ✓ (17.07:1 / 18.46:1 on ground)
 * The second tone is a `--bg`-coloured halo drawn outside the outline, so the
 * ring separates from *any* fill (see `globals.css`).
 */
interface ModeSurfaces {
    /** What `palette.mode` and `color-scheme` resolve to. Coder ⇒ dark. */
    scheme: PaletteMode;
    /** `data-theme` value stamped on `<html>`. Coder ⇒ `"dark"`. */
    stamp: 'light' | 'dark';
    bg: string;
    bgAlt: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    focusRing: string;
    /** Hue channel used for links / small text accents on this ground. */
    linkKey: 'primaryLight' | 'primaryDark';
    /** Hue channel used for `--glow` — the single accent that may be lit. */
    glowKey: 'secondaryLight' | 'secondaryDark';
    /** Hue channel that tints this mode's chrome (borders, hover, scrollbar). */
    tintKey: 'primary' | 'primaryLight' | 'primaryDark';
    /** Hue channel the *coder* accent system tints from. */
    chromeAccentKey: 'primary' | 'primaryLight' | 'secondaryLight' | 'secondaryDark';
    alphas: {
        divider: number;
        hover: number;
        selected: number;
        border: number;
        borderHover: number;
        scrollbarThumb: number;
        scrollbarHover: number;
        buttonHoverShadow: number;
        chipOutline: number;
        chipOutlineHover: number;
        chipSecondary: number;
        chipSecondaryHover: number;
    };
    /**
     * Elevation language — authored per mode (M26), never shared.
     * light: soft tinted shadow + near-zero border.
     * dark:  hairline + a neutral (black) shadow.
     * coder: hairline only, shadow removed entirely.
     * `%TINT%` is substituted with this mode's tinted shadow colour.
     */
    cardShadow: string;
    cardHoverShadow: string;
}

const MODE_SURFACES: Record<Appearance, ModeSurfaces> = {
    // ── LIGHT — the default, and the mode a recruiter sees. Designed first. ──
    // Elevation is a soft, hue-tinted shadow; the border is deliberately near
    // zero because on #FFFFFF the shadow is what carries the lift (M26).
    light: {
        scheme: 'light',
        stamp: 'light',
        bg: '#FAFAFA',
        bgAlt: '#F3F4F6',
        surface: '#FFFFFF',
        surfaceAlt: '#F1F5F9',
        text: '#1F2937',
        textMuted: '#5B6472',
        focusRing: '#111318',
        linkKey: 'primaryDark',
        glowKey: 'secondaryDark',
        tintKey: 'primary',
        chromeAccentKey: 'primary',
        alphas: {
            divider: 0.14,
            hover: 0.06,
            selected: 0.12,
            border: 0.08,
            borderHover: 0.18,
            scrollbarThumb: 0.35,
            scrollbarHover: 0.7,
            buttonHoverShadow: 0.28,
            chipOutline: 0.28,
            chipOutlineHover: 0.1,
            chipSecondary: 0.34,
            chipSecondaryHover: 0.1,
        },
        cardShadow: '0 1px 2px %TINT08%, 0 6px 20px %TINT08%',
        cardHoverShadow: '0 2px 6px %TINT12%, 0 16px 32px %TINT12%',
    },
    // ── DARK — dim, neutral, hairline-ruled. Shadows go black, not tinted:
    // a coloured shadow on a near-black ground reads as a stain, not a lift.
    dark: {
        scheme: 'dark',
        stamp: 'dark',
        bg: '#12151C',
        bgAlt: '#171B24',
        surface: '#171B24',
        surfaceAlt: '#212632',
        text: '#E8EAF0',
        textMuted: '#A2ACBD',
        focusRing: '#F5F7FF',
        linkKey: 'primaryLight',
        glowKey: 'secondaryLight',
        tintKey: 'primaryLight',
        chromeAccentKey: 'primaryLight',
        alphas: {
            divider: 0.14,
            hover: 0.1,
            selected: 0.18,
            border: 0.14,
            borderHover: 0.3,
            scrollbarThumb: 0.28,
            scrollbarHover: 0.55,
            buttonHoverShadow: 0.45,
            chipOutline: 0.34,
            chipOutlineHover: 0.16,
            chipSecondary: 0.36,
            chipSecondaryHover: 0.16,
        },
        cardShadow: '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.42)',
        cardHoverShadow: '0 2px 4px rgba(0,0,0,0.55), 0 14px 32px rgba(0,0,0,0.55)',
    },
    // ── CODER — a superset of dark, not a parallel design.
    // Near-black ground a full step below dark's, one lit hue (cyan) instead of
    // two, and **no shadow at all**: elevation is the hairline (M12). Because
    // every field here is a complete surface set, deleting `coder.css` leaves a
    // correct dark theme rather than a broken one.
    coder: {
        scheme: 'dark',
        stamp: 'dark',
        bg: '#0A0A0F',
        bgAlt: '#101017',
        surface: '#101017',
        surfaceAlt: '#16161F',
        text: '#E6EAF2',
        textMuted: '#B0BBCB',
        focusRing: '#F5F7FF',
        linkKey: 'primaryLight',
        glowKey: 'secondaryLight',
        tintKey: 'primaryLight',
        // One accent. Purple and cyan both lit is neon soup (M16); cyan reads
        // more "terminal" and is the better single choice.
        chromeAccentKey: 'secondaryLight',
        alphas: {
            divider: 0.18,
            hover: 0.08,
            selected: 0.16,
            border: 0.2,
            borderHover: 0.38,
            scrollbarThumb: 0.3,
            scrollbarHover: 0.55,
            buttonHoverShadow: 0.32,
            chipOutline: 0.3,
            chipOutlineHover: 0.12,
            chipSecondary: 0.32,
            chipSecondaryHover: 0.12,
        },
        cardShadow: 'none',
        cardHoverShadow: 'none',
    },
};

/** Resolves the shadow template's `%TINT..%` placeholders against the hue. */
function elevation(template: string, tint: string): string {
    return template
        .replace(/%TINT08%/g, alpha(tint, 0.08))
        .replace(/%TINT12%/g, alpha(tint, 0.12));
}

// ─── Theme factory ───────────────────────────────────────────────────────────

function createThemeForVariant(variant: ThemeVariant, appearance: Appearance) {
    const p = THEME_PALETTES[variant];
    const m = MODE_SURFACES[appearance];
    const a = m.alphas;
    // The hue channels this mode reads. Chosen by table lookup, not by ternary.
    const tint = p[m.tintKey];
    const chrome = p[m.chromeAccentKey];
    const cardBorder = alpha(chrome, a.border);
    const cardShadow = elevation(m.cardShadow, tint);
    const cardHoverShadow = elevation(m.cardHoverShadow, tint);

    return createTheme({
        palette: {
            // M4 — the mode owns `palette.mode`, and nothing below overwrites
            // `background.*` or `text.*` from the hue table afterwards.
            mode: m.scheme,
            primary: {
                main: p.primary,
                light: p.primaryLight,
                dark: p.primaryDark,
                // Mode-independent: `contrastText` describes the fill it sits
                // on, not the page mode. Deriving it from the mode is what put
                // black on #7C3AED at 3.69:1 (D2).
                contrastText: p.primaryContrast,
            },
            secondary: {
                main: p.secondary,
                light: p.secondaryLight,
                dark: p.secondaryDark,
                contrastText: p.secondaryContrast,
            },
            background: {
                default: m.bg,
                paper: m.surface,
            },
            text: {
                primary: m.text,
                secondary: m.textMuted,
            },
            // M31 — these were the literals `rgba(167,139,250,…)` and
            // `rgba(168,85,247,…)` in *every* dark configuration, i.e. variant
            // d's purple leaking into variant b's amber page and blocking
            // coder's cyan divider system entirely. Now derived from the
            // resolved hue channel and the resolved mode's alpha.
            divider: alpha(chrome, a.divider),
            action: {
                hover: alpha(chrome, a.hover),
                selected: alpha(chrome, a.selected),
            },
            // The tonal channel that OPPOSES this mode's ground, published so a
            // call site never re-derives it. `primary.main`/`secondary.main` are
            // FILL colors; text and small icons must take `…dark` on a light
            // ground and `…light` on a dark one. Every component that decided
            // this for itself was an independent chance to get it backwards —
            // and two of them did (HeroB shipped dark-ground channels as text on
            // a white panel at 2.43:1; HeroD's branch handed both modes the same
            // four colors). Read `theme.palette[accent][theme.palette.tonal]`.
            tonal: m.linkKey === 'primaryLight' ? 'light' : 'dark',
        },
        typography: {
            fontFamily: FONT_DISPLAY,
            fontFamilyMono: FONT_MONO,
            // Amarante has a single weight, so there is no weight scale to spend.
            // Hierarchy is carried by size and letter-spacing: headings tighten as
            // they grow (large display type needs negative tracking to look set
            // rather than spaced out), and the small labels open up so a
            // decorative face stays legible at caption sizes.
            h1: { fontWeight: 400, letterSpacing: '-0.02em' },
            h2: { fontWeight: 400, letterSpacing: '-0.015em' },
            h3: { fontWeight: 400, letterSpacing: '-0.01em' },
            h4: { fontWeight: 400, letterSpacing: '-0.01em' },
            h5: { fontWeight: 400, letterSpacing: '-0.005em' },
            h6: { fontWeight: 400 },
            subtitle1: { fontWeight: 400 },
            subtitle2: { fontWeight: 400 },
            overline: { letterSpacing: '0.1em' },
            caption: { letterSpacing: '0.01em' },
            button: { textTransform: 'none', fontWeight: 400, letterSpacing: '0.01em' },
        },
        shape: { borderRadius: 4 },
        components: {
            /**
             * M42 — the keyboard focus ring has to be authored HERE, not in a
             * stylesheet.
             *
             * `globals.css` has a perfectly good `:focus-visible` rule, and on
             * every MUI control it lost: emotion injects
             * `.mui-…-MuiButtonBase-root:focus-visible` (specificity 0,2,0) at
             * runtime, after the stylesheet, and ButtonBase resets `outline: 0`.
             * So the site's most important controls — the hero CTAs, the chat
             * FAB, the sidebar items, the appearance menu — had **no visible
             * focus indicator at all** (WCAG 2.4.7). Emitting the ring as part
             * of the same emotion layer is the only way it wins at equal weight.
             *
             * `--focus-ring` is a MODE token verified to clear 3:1 against a
             * `primary` fill as well as against the ground; the second,
             * `--bg`-coloured ring separates the outline from whatever it sits
             * on, including a saturated fill.
             */
            MuiButtonBase: {
                styleOverrides: {
                    root: {
                        '&:focus-visible': {
                            outline: `2px solid ${m.focusRing}`,
                            outlineOffset: 2,
                            boxShadow: `0 0 0 4px ${m.bg}`,
                        },
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: RADIUS.pill,
                        padding: '10px 24px',
                        transition: TRANSITION,
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 14px ${alpha(p.primary, a.buttonHoverShadow)}`,
                        },
                        // The lift is shared with hover; the RING is what makes
                        // this state distinguishable from hover, and it is set
                        // by the `MuiButtonBase` override above.
                        '&:focus-visible': {
                            transform: 'translateY(-1px)',
                        },
                    },
                    containedPrimary: {
                        background: p.primary,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: RADIUS.card,
                        border: `1px solid ${cardBorder}`,
                        boxShadow: cardShadow,
                        transition: TRANSITION,
                        '&:hover': {
                            borderColor: alpha(chrome, a.borderHover),
                            boxShadow: cardHoverShadow,
                            transform: 'translateY(-2px)',
                        },
                        '&:focus-within': {
                            borderColor: alpha(chrome, a.borderHover),
                            boxShadow: cardHoverShadow,
                            transform: 'translateY(-2px)',
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: RADIUS.chip,
                        fontWeight: 500,
                        transition: TRANSITION,
                    },
                    outlined: {
                        borderColor: alpha(p.primary, a.chipOutline),
                        '&:hover': {
                            backgroundColor: alpha(p.primary, a.chipOutlineHover),
                            borderColor: p.primary,
                        },
                        '&:focus-visible': {
                            backgroundColor: alpha(p.primary, a.chipOutlineHover),
                            borderColor: p.primary,
                        },
                    },
                    colorSecondary: {
                        borderColor: alpha(p.secondary, a.chipSecondary),
                        '&:hover': {
                            backgroundColor: alpha(p.secondary, a.chipSecondaryHover),
                        },
                        '&:focus-visible': {
                            backgroundColor: alpha(p.secondary, a.chipSecondaryHover),
                        },
                    },
                },
            },
            // No MuiDrawer / MuiAppBar overrides: `Sidebar.tsx` and `Header.tsx`
            // own those two surfaces via `sx`, which wins over theme-level
            // styleOverrides. Declaring them here only produced dead literals
            // that disagreed with the components (E6).
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                    // `rounded` (not `root`) so the AppBar and Drawer — which render
                    // square Papers — keep their flush edges.
                    rounded: {
                        borderRadius: RADIUS.card,
                    },
                },
            },
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        borderRadius: RADIUS.floating,
                    },
                },
            },
        },
    });
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ThemeContextType {
    appearance: Appearance;
    setAppearance: (a: Appearance) => void;
    /** `appearance !== 'light'` — the *resolved* darkness, never the request (M6). */
    isDark: boolean;
    /** `appearance === 'coder'`. */
    coder: boolean;
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    appearance: 'light',
    setAppearance: () => {},
    isDark: false,
    coder: false,
    variant: 'a',
    setVariant: () => {},
});

export function useThemeContext(): ThemeContextType {
    return useContext(ThemeContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

const VARIANT_STORAGE_KEY = 'kk-theme-variant';
/** Tri-state: `light` | `dark` | `coder`. */
const APPEARANCE_STORAGE_KEY = 'kk-appearance';
/** Two-state predecessor. Migrated once, then deleted. */
const LEGACY_COLOR_STORAGE_KEY = 'kk-color-mode';

function isAppearance(v: string | null): v is Appearance {
    return v === 'light' || v === 'dark' || v === 'coder';
}

/**
 * M22 — reads back **both** attributes the pre-paint script stamped, so React's
 * first render agrees with the painted document. The previous version returned
 * `'dark' | 'light'` from `data-theme` alone and could not round-trip `coder`,
 * which meant a stored coder user hydrated into plain dark.
 */
function readStampedAppearance(): Appearance {
    if (typeof document === 'undefined') return 'light';
    const el = document.documentElement;
    if (el.dataset.effects === 'coder') return 'coder';
    if (el.dataset.theme === 'dark') return 'dark';
    return 'light';
}

/**
 * Reads the persisted choice, migrating the two-state legacy key on first run.
 *
 * **Invariant (M18):** `coder` is reachable *only* from storage — i.e. only
 * after a deliberate selection. `prefers-color-scheme` may resolve to light or
 * dark and nothing else. An OS-dark visitor must never land in the most
 * opinionated design on the site before reading a word.
 */
function readStoredAppearance(): Appearance | null {
    try {
        const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (isAppearance(stored)) return stored;
        const legacy = localStorage.getItem(LEGACY_COLOR_STORAGE_KEY);
        if (legacy === 'light' || legacy === 'dark') {
            localStorage.setItem(APPEARANCE_STORAGE_KEY, legacy);
            localStorage.removeItem(LEGACY_COLOR_STORAGE_KEY);
            return legacy;
        }
        if (legacy !== null) localStorage.removeItem(LEGACY_COLOR_STORAGE_KEY);
    } catch {
        /* private mode — the in-memory state still holds */
    }
    return null;
}

/**
 * M29 / M30 — writes **every** stylesheet token for **every** appearance.
 *
 * These land as inline styles on `documentElement`, which beat any selector in
 * `globals.css`. That is why the previous version was a permanent bug: it wrote
 * `--bg`/`--text` from the *hue* table with no mode branch, so
 * `[data-theme="dark"] { --bg: … }` in `globals.css` was dead after hydration
 * and `html { background-color: var(--bg) }` painted a light ground behind a
 * dark page. `--scrollbar-thumb`/`--scrollbar-hover` had the same defect one
 * line later, giving variant a + dark a near-white `#C4B5FD` bar down a black
 * page.
 *
 * The rule this function must keep: **no token may be left stale from a
 * previous appearance.** Every property in the list is written on every call.
 */
function applyTokens(appearance: Appearance, p: ThemePalette) {
    if (typeof document === 'undefined') return;
    const m = MODE_SURFACES[appearance];
    const s = document.documentElement.style;
    const chrome = p[m.chromeAccentKey];
    // Links and `--glow` take the tonal channel that opposes the ground —
    // `…Light` on dark/coder, `…Dark` on light — decided by the mode table.
    const link = p[m.linkKey];
    const glow = p[m.glowKey];

    s.setProperty('--primary', p.primary);
    // Fill-only — its consumer is the `.gradient-text` utility.
    s.setProperty('--secondary', p.secondary);
    s.setProperty('--link', link);
    s.setProperty('--bg', m.bg);
    s.setProperty('--bg-alt', m.bgAlt);
    s.setProperty('--surface', m.surface);
    s.setProperty('--surface-alt', m.surfaceAlt);
    s.setProperty('--text', m.text);
    s.setProperty('--text-muted', m.textMuted);
    s.setProperty('--border', alpha(chrome, m.alphas.border));
    // The single coder accent. Exactly one hue glows on the page (M16).
    s.setProperty('--glow', glow);
    s.setProperty('--focus-ring', m.focusRing);
    s.setProperty('--scrollbar-thumb', alpha(chrome, m.alphas.scrollbarThumb));
    s.setProperty('--scrollbar-hover', alpha(chrome, m.alphas.scrollbarHover));

    // ── The cinematic grade's two lights, published document-wide ────────────
    // The hero sets these on itself, but the sections below it need the same
    // pair to carry the grade past the fold (`cinema.css`). They are raw `r, g,
    // b` channels rather than colours so a rule can pick its own alpha.
    // `primary` is the key, `secondary` is the fill — the complementary pair the
    // hue table already guarantees, in every variant.
    s.setProperty('--hc-key', rgbChannels(p.primary));
    // The bounce light is desaturated toward the ground in light mode only —
    // full-chroma cyan on #FAFAFA reads as mint candy at any visible alpha.
    s.setProperty('--hc-fill', appearance === 'light'
        ? mixChannels(p.secondary, m.bg, 0.42)
        : rgbChannels(p.secondary));
    // How strongly the pair lights the page as a whole. The key is dominant by
    // a factor of ~2 — that is what makes it read as one source with a bounce,
    // rather than two competing washes. Inverting them (the first cut had the
    // fill stronger) is why light mode's loudest element was a teal bloom in
    // the corner instead of the light on the subject.
    s.setProperty('--hc-page-key-a', PAGE_GRADE[appearance].key);
    s.setProperty('--hc-page-fill-a', PAGE_GRADE[appearance].fill);
}

/** Per-mode strength of the page-wide grade consumed by `cinema.css`. */
const PAGE_GRADE: Record<Appearance, { key: string; fill: string }> = {
    light: { key: '0.11', fill: '0.09' },
    dark: { key: '0.15', fill: '0.09' },
    coder: { key: '0.14', fill: '0.12' },
};

/**
 * M7 — mobile browser chrome follows the *user's choice*, not the OS.
 *
 * `viewport.themeColor` in `layout.tsx` is keyed to nothing but a static
 * default (it must be, for the first paint of a static export); the moment
 * React resolves the appearance, the same tag is rewritten here. Without this,
 * an OS-light visitor who picks dark keeps a white band above a black page —
 * the most-noticed dark-mode defect on mobile, and a large part of why a mode
 * switch reads as "the page recoloured" rather than "the system changed".
 */
function applyThemeColorMeta(appearance: Appearance) {
    if (typeof document === 'undefined') return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', MODE_SURFACES[appearance].bg);
}

/**
 * The single owner of every DOM + storage write for the appearance (M32).
 * Called from an effect only — never from a `setState` updater, which React 19
 * StrictMode invokes twice and which runs during render.
 */
function commitAppearance(appearance: Appearance, p: ThemePalette, persist: boolean) {
    if (typeof document === 'undefined') return;
    const m = MODE_SURFACES[appearance];
    const el = document.documentElement;
    el.dataset.theme = m.stamp;
    // Present ONLY in coder mode — removed, never set to "none". The effects
    // stylesheet keys every rule off the attribute's presence.
    if (appearance === 'coder') {
        el.dataset.effects = 'coder';
    } else {
        delete el.dataset.effects;
    }
    el.style.colorScheme = m.scheme;
    applyTokens(appearance, p);
    applyThemeColorMeta(appearance);
    if (!persist) return;
    try {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
    } catch {
        /* private mode — the in-memory state still holds */
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [variant, setVariantState] = useState<ThemeVariant>('a');
    /**
     * M41 — this MUST start at the value the server rendered (`light`), not at
     * `readStampedAppearance()`.
     *
     * Reading the stamp in the initializer looks like the careful thing to do,
     * and it was a silent, permanent bug. The initializer runs on the client
     * during *hydration*, so React's first client render produced coder/dark
     * markup against a server tree rendered light. React does not repair
     * attribute mismatches while hydrating — it warns and keeps the SERVER
     * attribute. Emotion had already inlined the light `mui-…` class into the
     * static HTML, so the AppBar, Drawer, Paper and Chip kept their light
     * classes **forever**, over a correctly-dark ground: a white header and
     * white cards on a near-black page, for every returning dark/coder visitor.
     * Only opening the appearance menu (a real, post-hydration re-render)
     * cleared it.
     *
     * Starting from the server's value makes hydration agree, and the effect
     * below is then an ordinary update — which does re-render and does re-emit
     * every themed class. The visitor's ground is already correct pre-paint
     * (the blocking script in `layout.tsx` stamps `data-theme`/`data-effects`
     * and `globals.css` colours the document off those), so what this costs is
     * one frame of light *chrome*, not a light page.
     */
    const [appearance, setAppearanceState] = useState<Appearance>('light');

    // Load persisted state. The blocking script has already resolved storage +
    // media query and painted; adopt what it stamped so the static markup and
    // the React tree agree, then re-commit for the tokens React owns.
    useEffect(() => {
        try {
            const savedVariant = localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null;
            if (savedVariant && ['a', 'b', 'c', 'd'].includes(savedVariant)) {
                setVariantState(savedVariant);
            }
        } catch {
            /* private mode */
        }
        setAppearanceState(readStoredAppearance() ?? readStampedAppearance());
    }, []);

    const setVariant = useCallback((v: ThemeVariant) => {
        setVariantState(v);
        try {
            localStorage.setItem(VARIANT_STORAGE_KEY, v);
        } catch {
            /* private mode */
        }
    }, []);

    // Pure updater — no DOM, no storage. The effect below owns those (M32).
    const setAppearance = useCallback((a: Appearance) => setAppearanceState(a), []);

    const theme = useMemo(() => createThemeForVariant(variant, appearance), [variant, appearance]);

    useEffect(() => {
        commitAppearance(appearance, THEME_PALETTES[variant], true);
    }, [appearance, variant]);

    const value = useMemo<ThemeContextType>(
        () => ({
            appearance,
            setAppearance,
            isDark: appearance !== 'light',
            coder: appearance === 'coder',
            variant,
            setVariant,
        }),
        [appearance, setAppearance, variant, setVariant],
    );

    return (
        <ThemeContext.Provider value={value}>
            <MUIThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MUIThemeProvider>
        </ThemeContext.Provider>
    );
}

// ─── Theme Variant Switcher (dev-only, header-anchored) ───────────────────────

/**
 * A compact hue picker. **Dev-only** — `Header.tsx` gates it behind
 * `process.env.NODE_ENV === 'development'`, because shipping a hue picker
 * beside an appearance picker is two appearance menus in one header (C6/E7/M5).
 */
export function ThemeVariantSwitcher() {
    const { variant, setVariant } = useThemeContext();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    return (
        <>
            <Tooltip title="Theme">
                <IconButton
                    color="primary"
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    aria-label="switch theme"
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                >
                    <ColorLensIcon />
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: RADIUS.floating, p: 0.5 } } }}
            >
                <Typography
                    variant="overline"
                    sx={{ display: 'block', px: 1.5, py: 0.5, fontWeight: 600, color: 'text.secondary', letterSpacing: '0.08em' }}
                >
                    Theme
                </Typography>
                {(['a', 'b', 'c', 'd'] as ThemeVariant[]).map((v) => {
                    const p = THEME_PALETTES[v];
                    const isActive = v === variant;
                    return (
                        <MenuItem
                            key={v}
                            selected={isActive}
                            onClick={() => { setVariant(v); setAnchorEl(null); }}
                            sx={{ borderRadius: RADIUS.chip, gap: 1.5, mx: 0.5, my: 0.25 }}
                        >
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)`,
                                    flexShrink: 0,
                                }}
                            />
                            <ListItemText
                                primary={p.label}
                                primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: '0.9rem' }}
                            />
                            {isActive && <CheckCircleIcon sx={{ fontSize: 18, color: p.primary }} />}
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
