/**
 * Design tokens — the appearance table, the hue table, the surface table and
 * the page-grade table, with no React and no MUI theme construction.
 *
 * This module exists so that **skins** (`src/theme/skins/*`) can compose with
 * the same tables `ThemeProvider` builds from without importing the provider —
 * which would be a cycle, since the provider imports the skin registry.
 *
 * Nothing here was rewritten during the extraction. `ThemeProvider.tsx`
 * re-exports the public names so every existing import site keeps working.
 */
import type { PaletteMode } from "@mui/material";
import { alpha } from "@mui/material/styles";

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
export interface ModeSurfaces {
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

export const MODE_SURFACES: Record<Appearance, ModeSurfaces> = {
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
export function elevation(template: string, tint: string): string {
    return template
        .replace(/%TINT08%/g, alpha(tint, 0.08))
        .replace(/%TINT12%/g, alpha(tint, 0.12));
}

/** Per-mode strength of the page-wide grade consumed by `cinema.css`. */
export const PAGE_GRADE: Record<Appearance, { key: string; fill: string; amb: string }> = {
    // Roughly half the hero's own alphas, key-dominant like the hero. The first
    // pass sat at 0.09–0.11, which is below the perceptual floor on both #FAFAFA
    // and #12151C — architecturally correct and visually absent, so the page
    // still went flat below the fold.
    light: { key: '0.17', fill: '0.09', amb: '0.05' },
    dark: { key: '0.24', fill: '0.13', amb: '0.07' },
    coder: { key: '0.26', fill: '0.14', amb: '0.08' },
};

