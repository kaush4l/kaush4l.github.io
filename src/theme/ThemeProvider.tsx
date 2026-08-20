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

// The token tables moved to `./tokens` so the skin layer can compose with the
// same data without importing this provider (which would be a cycle). They are
// re-exported below: every existing `@/theme/ThemeProvider` import still works.
import {
    type Appearance,
    APPEARANCES,
    type ThemeVariant,
    type ThemePalette,
    THEME_PALETTES,
    type ModeSurfaces,
    MODE_SURFACES,
    elevation,
    PAGE_GRADE,
} from "./tokens";

export { APPEARANCES, THEME_PALETTES };
export type { Appearance, ThemeVariant, ThemePalette, ModeSurfaces };

// The third axis. See `src/skins/types.ts` for what a skin is allowed to own.
import { SKINS, DEFAULT_SKIN, isSkinId } from "@/skins/registry";
import { SKIN_TOKEN_KEYS, type Skin, type SkinId } from "@/skins/types";
export type { SkinId };


// ─── Theme factory ───────────────────────────────────────────────────────────

function createThemeForVariant(variant: ThemeVariant, appearance: Appearance, skin: Skin) {
    const p = THEME_PALETTES[variant];
    const m = MODE_SURFACES[appearance];
    const a = m.alphas;
    // The hue channels this mode reads. Chosen by table lookup, not by ternary.
    const tint = p[m.tintKey];
    const chrome = p[m.chromeAccentKey];
    const cardBorder = alpha(chrome, a.border);
    const cardShadow = elevation(m.cardShadow, tint);
    const cardHoverShadow = elevation(m.cardHoverShadow, tint);

    const base = createTheme({
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

    // The skin is applied LAST and by deep merge, so it never has to restate
    // the palette: the appearance still owns surfaces and the hue still owns
    // colour, and a skin that only wants a display face changes only that.
    const options = skin.theme?.(base, { appearance, hue: p });
    return options ? createTheme(base, options) : base;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ThemeContextType {
    /** The appearance actually in force — a pinning skin resolves to its own. */
    appearance: Appearance;
    setAppearance: (a: Appearance) => void;
    /** `appearance !== "light"` — the *resolved* darkness, never the request (M6). */
    isDark: boolean;
    /** `appearance === "coder"`. */
    coder: boolean;
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
    /** The third axis — atmosphere, hero and motion story. */
    skin: SkinId;
    setSkin: (s: SkinId) => void;
    /** The resolved skin record, so a consumer never re-looks-up the table. */
    skinDef: Skin;
    /**
     * True when the current skin pins the appearance. The appearance menu reads
     * this and says so, rather than offering three rows two of which are inert
     * — a control that visibly does nothing is worse than a control that
     * explains why it is currently owned by something else.
     */
    appearancePinned: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    appearance: 'light',
    setAppearance: () => {},
    isDark: false,
    coder: false,
    variant: 'a',
    setVariant: () => {},
    skin: DEFAULT_SKIN,
    setSkin: () => {},
    skinDef: SKINS[DEFAULT_SKIN],
    appearancePinned: false,
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
/** The perspective skin. Absent ⇒ `professional`, the identity skin. */
const SKIN_STORAGE_KEY = 'kk-skin';

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
function applyTokens(appearance: Appearance, p: ThemePalette, skin: Skin) {
    if (typeof document === 'undefined') return;
    const m = MODE_SURFACES[appearance];
    const s = document.documentElement.style;
    const chrome = p[m.chromeAccentKey];
    // Links and `--glow` take the tonal channel that opposes the ground —
    // `…Light` on dark/coder, `…Dark` on light — decided by the mode table.
    const link = p[m.linkKey];
    const glow = p[m.glowKey];

    // M29 extends to the skin axis: clear the WHOLE declared key list FIRST, so
    // a property one skin sets and the next omits falls back to the stylesheet
    // default instead of surviving the switch as a stranded value. It must run
    // before the base write below — clearing after it would delete the ground
    // this pass just produced, since a skin may own `--bg` too.
    for (const key of SKIN_TOKEN_KEYS) s.removeProperty(key);

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
    // A third, very large, very faint wash centred on the viewport. Without it
    // the two corner lamps leave the whole middle of the frame unlit, which is
    // exactly where the reader is looking.
    s.setProperty('--hc-page-amb-a', PAGE_GRADE[appearance].amb);

    // ── The skin's own tokens ─────────────────────────────────────────────────
    // Applied LAST so a skin can override a ground the base pass just wrote —
    // which a skin that pins the appearance must do, or the document shifts
    // colour between the pre-painted frame and hydration.
    const skinTokens = skin.tokens?.({ appearance, hue: p });
    if (skinTokens) {
        for (const [key, value] of Object.entries(skinTokens)) {
            if (value) s.setProperty(key, value);
        }
    }
}

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
function commitAppearance(
    appearance: Appearance,
    p: ThemePalette,
    skin: Skin,
    persist: boolean,
    /**
     * What to WRITE to storage, which is not always what we PAINT.
     *
     * A skin may pin the appearance (`Skin.pinAppearance`), and the painted
     * appearance is then the skin s, not the visitor s. Persisting the painted
     * value would silently overwrite a light-mode preference the moment they
     * looked at a black skin, and they would be returned to a dark professional
     * page afterwards having never asked for one. So the DOM takes the resolved
     * appearance and storage takes the request.
     */
    requested: Appearance = appearance,
) {
    if (typeof document === 'undefined') return;
    const m = MODE_SURFACES[appearance];
    const el = document.documentElement;
    el.dataset.theme = m.stamp;
    // Present only for a non-default skin — `delete`d, never set to a sentinel,
    // so `[data-skin]` rules are genuinely inert on the professional skin. Same
    // convention `data-effects` uses, for the same reason.
    if (skin.id === DEFAULT_SKIN) {
        delete el.dataset.skin;
    } else {
        el.dataset.skin = skin.id;
    }
    // Present ONLY in coder mode — removed, never set to "none". The effects
    // stylesheet keys every rule off the attribute's presence.
    if (appearance === 'coder') {
        el.dataset.effects = 'coder';
    } else {
        delete el.dataset.effects;
    }
    el.style.colorScheme = m.scheme;
    applyTokens(appearance, p, skin);
    applyThemeColorMeta(appearance);
    if (!persist) return;
    try {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, requested);
        localStorage.setItem(SKIN_STORAGE_KEY, skin.id);
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
    /**
     * M41 applies here verbatim: the skin MUST start at the value the server
     * rendered. Reading `data-skin` (or storage) in this initializer would make
     * React s first client render disagree with the static markup, and React
     * keeps the SERVER attributes while hydrating — so Emotion s inlined
     * `mui-*` classes would freeze on the professional skin permanently, over a
     * correctly-skinned ground. The pre-paint script has already stamped
     * `data-skin`, so the visitor s *ground and atmosphere* are right on frame
     * one; what this costs is one frame of default chrome.
     */
    const [skinId, setSkinState] = useState<SkinId>(DEFAULT_SKIN);

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
        try {
            const savedSkin = localStorage.getItem(SKIN_STORAGE_KEY);
            if (isSkinId(savedSkin)) setSkinState(savedSkin);
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
    const setSkin = useCallback((next: SkinId) => setSkinState(next), []);

    const skinDef = SKINS[skinId];
    /**
     * The resolved appearance. A skin that pins one wins over the stored
     * request — resolved-not-requested, the same rule `isDark` already follows
     * (M6). `appearance` in the context is this value, so no consumer has to
     * know the pin exists.
     */
    const effectiveAppearance = skinDef.pinAppearance ?? appearance;

    const theme = useMemo(
        () => createThemeForVariant(variant, effectiveAppearance, skinDef),
        [variant, effectiveAppearance, skinDef],
    );

    useEffect(() => {
        commitAppearance(effectiveAppearance, THEME_PALETTES[variant], skinDef, true, appearance);
    }, [effectiveAppearance, appearance, variant, skinDef]);

    const value = useMemo<ThemeContextType>(
        () => ({
            appearance: effectiveAppearance,
            setAppearance,
            isDark: effectiveAppearance !== 'light',
            coder: effectiveAppearance === 'coder',
            variant,
            setVariant,
            skin: skinId,
            setSkin,
            skinDef,
            appearancePinned: skinDef.pinAppearance !== undefined,
        }),
        [effectiveAppearance, setAppearance, variant, setVariant, skinId, setSkin, skinDef],
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
