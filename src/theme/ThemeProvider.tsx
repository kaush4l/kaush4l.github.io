'use client';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline, Box, IconButton, Menu, MenuItem, ListItemText, Tooltip, Typography } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Expose a first-class mono family on the theme so components never hardcode a
// monospace stack. Populated below from the `--font-mono` next/font variable.
declare module '@mui/material/styles' {
    interface TypographyVariants {
        fontFamilyMono: string;
    }
    interface TypographyVariantsOptions {
        fontFamilyMono?: string;
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

// ─── Theme variant definitions ───────────────────────────────────────────────

export type ThemeVariant = 'a' | 'b' | 'c' | 'd';

export interface ThemePalette {
    name: string;
    label: string;
    /**
     * True when `bg`/`surface` are dark. The palettes carry their own surfaces,
     * so darkness is a property of the *variant*, not of the light/dark toggle —
     * `isDark` below is `dark || mode === 'dark'`.
     */
    dark: boolean;
    // ─── Color-usage contract (read before adding a call site) ───────────────
    // `primary`/`secondary` are FILL colors: backgrounds, bars, dots, icons on
    // a neutral surface at ≥ 3:1. They are NOT text colors — `secondary` in
    // particular is a saturated cyan/green that measures ~2.4:1 as body text on
    // a light surface.
    // For TEXT and small icons use the tonal channel that opposes the surface:
    //   light surface → `…Dark`   |   dark surface → `…Light`
    // Both channels are verified ≥ 4.5:1 against this palette's own
    // `bg`/`surface` (see the ratios noted per variant).
    // When a fill is used *behind* text, the text takes `contrastText` — never
    // a hardcoded `#fff`, and never a mode-derived guess (see D2).
    // Primary brand color
    primary: string;
    primaryLight: string;
    primaryDark: string;
    /** Text/icon color on a `primary` fill. Verified ≥ 4.5:1 per variant. */
    primaryContrast: string;
    // Secondary accent
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    /** Text/icon color on a `secondary` fill. Verified ≥ 4.5:1 per variant. */
    secondaryContrast: string;
    // Surface/background
    bg: string;
    bgAlt: string;
    surface: string;
    surfaceAlt: string;
    // Text
    text: string;
    textMuted: string;
    // Gradients
    heroGradient: string;
    // Card/tile borders and shadows
    cardBorder: string;
    cardShadow: string;
    // Scrollbar
    scrollbarThumb: string;
    scrollbarHover: string;
    // Chip colors
    chipBg: string;
    chipColor: string;
}

export const THEME_PALETTES: Record<ThemeVariant, ThemePalette> = {
    // A: Purple Glow — current refined theme
    a: {
        name: 'a',
        label: 'Purple Glow',
        dark: false,
        primary: '#7C3AED',
        primaryLight: '#A78BFA',
        primaryDark: '#5B21B6',
        primaryContrast: '#FFFFFF', // 5.70:1 on #7C3AED
        secondary: '#06B6D4',
        secondaryLight: '#67E8F9',
        secondaryDark: '#0E7490', // text channel — 5.13:1 on #FAFAFA, 5.36:1 on #FFFFFF
        secondaryContrast: '#062A32', // 6.25:1 on #06B6D4 (white would be 2.43:1)
        bg: '#FAFAFA',
        bgAlt: '#F3F0FF',
        surface: '#FFFFFF',
        surfaceAlt: '#EDE9FE',
        text: '#1F2937',
        textMuted: '#6B7280',
        heroGradient: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 50%, #06B6D4 100%)',
        cardBorder: 'rgba(124,58,237,0.12)',
        cardShadow: '0 4px 24px rgba(124,58,237,0.08)',
        scrollbarThumb: '#C4B5FD',
        scrollbarHover: '#7C3AED',
        chipBg: 'rgba(124,58,237,0.1)',
        chipColor: '#5B21B6',
    },
    // B: Deep Slate — dark slate with amber
    b: {
        name: 'b',
        label: 'Deep Slate',
        dark: true,
        primary: '#F59E0B',
        primaryLight: '#FCD34D', // text channel (dark palette) — 12.38:1 on #0F172A
        primaryDark: '#D97706',
        primaryContrast: '#231A02', // 8.01:1 on #F59E0B (white would be 2.15:1)
        secondary: '#10B981',
        secondaryLight: '#6EE7B7', // text channel (dark palette) — 11.71:1 on #0F172A, 9.60:1 on #1E293B
        secondaryDark: '#059669',
        secondaryContrast: '#04231A', // 6.57:1 on #10B981
        bg: '#0F172A',
        bgAlt: '#1E293B',
        surface: '#1E293B',
        surfaceAlt: '#334155',
        text: '#F8FAFC',
        textMuted: '#94A3B8',
        heroGradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 50%, #10B981 100%)',
        cardBorder: 'rgba(245,158,11,0.15)',
        cardShadow: '0 4px 24px rgba(0,0,0,0.3)',
        scrollbarThumb: '#D97706',
        scrollbarHover: '#F59E0B',
        chipBg: 'rgba(245,158,11,0.15)',
        chipColor: '#FCD34D',
    },
    // C: Clean Minimalist — clean white with green accents
    c: {
        name: 'c',
        label: 'Clean Minimal',
        dark: false,
        primary: '#2563EB',
        primaryLight: '#60A5FA',
        primaryDark: '#1D4ED8', // text channel — 6.70:1 on #FFFFFF
        primaryContrast: '#FFFFFF', // 5.17:1 on #2563EB
        secondary: '#16A34A',
        secondaryLight: '#4ADE80',
        secondaryDark: '#15803D', // text channel — 5.02:1 on #FFFFFF
        secondaryContrast: '#04231A', // 5.06:1 on #16A34A (white would be 3.30:1)
        bg: '#FFFFFF',
        bgAlt: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceAlt: '#F1F5F9',
        text: '#0F172A',
        textMuted: '#64748B',
        heroGradient: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #16A34A 100%)',
        cardBorder: 'rgba(37,99,235,0.1)',
        cardShadow: '0 2px 8px rgba(0,0,0,0.06)',
        scrollbarThumb: '#BFDBFE',
        scrollbarHover: '#2563EB',
        chipBg: 'rgba(37,99,235,0.08)',
        chipColor: '#1D4ED8',
    },
    // D: Neon Cyber — dark with neon purple + green
    d: {
        name: 'd',
        label: 'Neon Cyber',
        dark: true,
        primary: '#A855F7',
        primaryLight: '#D8B4FE', // text channel (dark palette) — 11.17:1 on #0A0A0F
        primaryDark: '#7C3AED',
        primaryContrast: '#12071F', // 4.93:1 on #A855F7 (white would be 3.96:1)
        secondary: '#22D3EE',
        secondaryLight: '#67E8F9', // text channel (dark palette) — 13.63:1 on #0A0A0F
        secondaryDark: '#06B6D4', // 8.14:1 on #0A0A0F
        secondaryContrast: '#062A32', // 8.39:1 on #22D3EE (white would be 1.81:1)
        bg: '#0A0A0F',
        bgAlt: '#111118',
        surface: '#111118',
        surfaceAlt: '#1A1A2E',
        text: '#E2E8F0',
        textMuted: '#94A3B8',
        heroGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #22D3EE 100%)',
        cardBorder: 'rgba(168,85,247,0.2)',
        cardShadow: '0 4px 32px rgba(168,85,247,0.15), 0 0 0 1px rgba(168,85,247,0.1)',
        scrollbarThumb: '#7C3AED',
        scrollbarHover: '#A855F7',
        chipBg: 'rgba(168,85,247,0.15)',
        chipColor: '#C084FC',
    },
};

// ─── Theme factory ───────────────────────────────────────────────────────────

function createThemeForVariant(variant: ThemeVariant, mode: PaletteMode) {
    const p = THEME_PALETTES[variant];
    // A palette that ships dark surfaces is dark regardless of the toggle.
    const forcedMode: PaletteMode = p.dark ? 'dark' : mode;
    const isDark = p.dark || forcedMode === 'dark';

    return createTheme({
        palette: {
            mode: forcedMode,
            primary: {
                main: p.primary,
                light: p.primaryLight,
                dark: p.primaryDark,
                // Mode-independent: `contrastText` describes the fill it sits
                // on, not the page mode. Deriving it from `isDark` is what put
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
                default: p.bg,
                paper: p.surface,
            },
            text: {
                primary: p.text,
                secondary: p.textMuted,
            },
            divider: isDark
                ? 'rgba(167, 139, 250, 0.12)'
                : `${p.cardBorder}`,
            action: {
                hover: isDark ? 'rgba(168,85,247,0.12)' : `${p.chipBg}`,
                selected: isDark ? 'rgba(168,85,247,0.2)' : `${p.chipBg}`,
            },
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
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: RADIUS.pill,
                        padding: '10px 24px',
                        transition: TRANSITION,
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 14px ${isDark ? `${p.primary}55` : `${p.primary}38`}`,
                        },
                        '&:focus-visible': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 14px ${isDark ? `${p.primary}55` : `${p.primary}38`}`,
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
                        border: `1px solid ${p.cardBorder}`,
                        boxShadow: p.cardShadow,
                        transition: TRANSITION,
                        '&:hover': {
                            boxShadow: `0 20px 32px ${isDark ? 'rgba(0,0,0,0.5)' : `${p.primary}15`}`,
                            transform: 'translateY(-2px)',
                        },
                        '&:focus-within': {
                            boxShadow: `0 20px 32px ${isDark ? 'rgba(0,0,0,0.5)' : `${p.primary}15`}`,
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
                        borderColor: isDark ? `${p.primary}55` : `${p.primary}44`,
                        '&:hover': {
                            backgroundColor: isDark ? `${p.primary}25` : `${p.primary}15`,
                            borderColor: p.primary,
                        },
                        '&:focus-visible': {
                            backgroundColor: isDark ? `${p.primary}25` : `${p.primary}15`,
                            borderColor: p.primary,
                        },
                    },
                    colorSecondary: {
                        borderColor: isDark ? `${p.secondary}60` : `${p.secondary}50`,
                        '&:hover': {
                            backgroundColor: isDark ? `${p.secondary}25` : `${p.secondary}15`,
                        },
                        '&:focus-visible': {
                            backgroundColor: isDark ? `${p.secondary}25` : `${p.secondary}15`,
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

interface ThemeContextType {
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
    mode: PaletteMode;
    toggleColorMode: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    variant: 'a',
    setVariant: () => {},
    mode: 'light',
    toggleColorMode: () => {},
    isDark: false,
});

export function useThemeContext() {
    return useContext(ThemeContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

const VARIANT_STORAGE_KEY = 'kk-theme-variant';
const COLOR_STORAGE_KEY = 'kk-color-mode';

/**
 * Reads the mode the pre-paint script in `layout.tsx` already stamped onto
 * `<html>`, so React's first render agrees with the painted document instead of
 * assuming light and repainting after hydration.
 */
function readStampedMode(): PaletteMode {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * The stylesheet-layer tokens `globals.css` consumes (focus ring, `li::marker`,
 * prose links, both scrollbar colors, the root background/foreground).
 *
 * `globals.css` declares literals for these, but only as the **pre-hydration
 * default** — they are variant `a`. There are four palettes, so once React is
 * alive the resolved palette must write the real values here or a reader on
 * variant `b` gets amber surfaces with purple focus rings (E5).
 */
function applyPaletteTokens(p: ThemePalette, isDark: boolean) {
    if (typeof document === 'undefined') return;
    const s = document.documentElement.style;
    s.setProperty('--primary', p.primary);
    // Fill-only — its single consumer is the `.gradient-text` utility.
    s.setProperty('--secondary', p.secondary);
    // Links are body text — take the tonal channel that opposes the surface,
    // never `primary` itself.
    s.setProperty('--link', isDark ? p.primaryLight : p.primaryDark);
    s.setProperty('--scrollbar-thumb', p.scrollbarThumb);
    s.setProperty('--scrollbar-hover', p.scrollbarHover);
    s.setProperty('--bg', p.bg);
    s.setProperty('--text', p.text);
}

/** Keeps the document, the stylesheet tokens and localStorage in one state. */
function applyColorMode(next: PaletteMode) {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
        localStorage.setItem(COLOR_STORAGE_KEY, next);
    } catch {
        /* private mode — the in-memory state still holds */
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [variant, setVariantState] = useState<ThemeVariant>('a');
    const [mode, setMode] = useState<PaletteMode>(readStampedMode);

    // Load persisted state
    useEffect(() => {
        try {
            const savedVariant = localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null;
            if (savedVariant && ['a', 'b', 'c', 'd'].includes(savedVariant)) {
                setVariantState(savedVariant);
            }
        } catch {
            /* private mode */
        }
        // The blocking script has already resolved storage + media query; adopt
        // whatever it stamped in case the static markup hydrated as light.
        setMode(readStampedMode());
    }, []);

    const setVariant = useCallback((v: ThemeVariant) => {
        setVariantState(v);
        try {
            localStorage.setItem(VARIANT_STORAGE_KEY, v);
        } catch {
            /* private mode */
        }
    }, []);

    const toggleColorMode = useCallback(() => {
        setMode((prev) => {
            const next: PaletteMode = prev === 'light' ? 'dark' : 'light';
            applyColorMode(next);
            return next;
        });
    }, []);

    const theme = useMemo(() => createThemeForVariant(variant, mode), [variant, mode]);
    const isDark = THEME_PALETTES[variant].dark || mode === 'dark';

    // Dark palettes ('b', 'd') render dark regardless of `mode`; keep the
    // stylesheet token layer and the native color-scheme aligned with what is
    // actually painted, and re-derive the tokens whenever the palette changes.
    useEffect(() => {
        document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
        applyPaletteTokens(THEME_PALETTES[variant], isDark);
    }, [isDark, variant]);

    return (
        <ThemeContext.Provider value={{ variant, setVariant, mode, toggleColorMode, isDark }}>
            <MUIThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MUIThemeProvider>
        </ThemeContext.Provider>
    );
}

// ─── Theme Variant Switcher (header-anchored) ─────────────────────────────────

/**
 * A compact theme-palette picker meant to live in the header next to the
 * light/dark toggle. UX rationale: a page should have a single primary floating
 * action (the chat FAB). Secondary, infrequent controls like theme selection
 * belong with related controls in the header, not stacked as a competing FAB.
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
                slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: '20px', p: 0.5 } } }}
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
                            sx={{ borderRadius: '8px', gap: 1.5, mx: 0.5, my: 0.25 }}
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
