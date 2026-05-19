'use client';
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline, Box, IconButton, Fade, Paper, Typography } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// ─── Theme variant definitions ───────────────────────────────────────────────

export type ThemeVariant = 'a' | 'b' | 'c' | 'd';

export interface ThemePalette {
    name: string;
    label: string;
    // Primary brand color
    primary: string;
    primaryLight: string;
    primaryDark: string;
    // Secondary accent
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
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
        primary: '#7C3AED',
        primaryLight: '#A78BFA',
        primaryDark: '#5B21B6',
        secondary: '#06B6D4',
        secondaryLight: '#67E8F9',
        secondaryDark: '#0E7490',
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
        primary: '#F59E0B',
        primaryLight: '#FCD34D',
        primaryDark: '#D97706',
        secondary: '#10B981',
        secondaryLight: '#6EE7B7',
        secondaryDark: '#059669',
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
        primary: '#2563EB',
        primaryLight: '#60A5FA',
        primaryDark: '#1D4ED8',
        secondary: '#16A34A',
        secondaryLight: '#4ADE80',
        secondaryDark: '#15803D',
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
        primary: '#A855F7',
        primaryLight: '#D8B4FE',
        primaryDark: '#7C3AED',
        secondary: '#22D3EE',
        secondaryLight: '#67E8F9',
        secondaryDark: '#06B6D4',
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

const VARIANT_LABELS: Record<ThemeVariant, string> = {
    a: 'A — Purple Glow',
    b: 'B — Deep Slate',
    c: 'C — Clean Minimal',
    d: 'D — Neon Cyber',
};

// ─── Theme factory ───────────────────────────────────────────────────────────

function createThemeForVariant(variant: ThemeVariant, mode: PaletteMode) {
    const p = THEME_PALETTES[variant];
    // Force dark mode for theme d, or use mode if explicitly 'dark'
    const forcedMode: PaletteMode = variant === 'd' ? 'dark' : mode;
    const isDark = variant === 'd' || forcedMode === 'dark';

    return createTheme({
        palette: {
            mode: forcedMode,
            primary: {
                main: p.primary,
                light: p.primaryLight,
                dark: p.primaryDark,
                contrastText: isDark ? '#000000' : '#FFFFFF',
            },
            secondary: {
                main: p.secondary,
                light: p.secondaryLight,
                dark: p.secondaryDark,
                contrastText: '#FFFFFF',
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
            fontFamily: '"Amarante", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h1: { fontWeight: 400, letterSpacing: '-0.02em' },
            h2: { fontWeight: 400, letterSpacing: '-0.01em' },
            h3: { fontWeight: 400 },
            h4: { fontWeight: 400 },
            h5: { fontWeight: 400 },
            h6: { fontWeight: 400 },
            button: { textTransform: 'none', fontWeight: 400 },
        },
        shape: { borderRadius: 16 },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 24,
                        padding: '10px 24px',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
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
                        borderRadius: 16,
                        border: `1px solid ${p.cardBorder}`,
                        boxShadow: p.cardShadow,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            boxShadow: `0 20px 32px ${isDark ? 'rgba(0,0,0,0.5)' : `${p.primary}15`}`,
                            transform: 'translateY(-2px)',
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 8, fontWeight: 500 },
                    outlined: {
                        borderColor: isDark ? `${p.primary}55` : `${p.primary}44`,
                        '&:hover': {
                            backgroundColor: isDark ? `${p.primary}25` : `${p.primary}15`,
                            borderColor: p.primary,
                        },
                    },
                    colorSecondary: {
                        borderColor: isDark ? `${p.secondary}60` : `${p.secondary}50`,
                        '&:hover': {
                            backgroundColor: isDark ? `${p.secondary}25` : `${p.secondary}15`,
                        },
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        borderRight: 'none',
                        backgroundColor: isDark ? '#0D0D14' : '#FFFFFF',
                        boxShadow: isDark
                            ? '4px 0 24px rgba(0,0,0,0.5)'
                            : '4px 0 24px rgba(0,0,0,0.05)',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? 'rgba(15,15,20,0.85)' : 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: `0 1px 0 0 ${isDark ? 'rgba(167,139,250,0.12)' : `${p.cardBorder}`}`,
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
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

// Legacy COLORS export — alias for Theme A palette for backward compatibility
export const COLORS = {
    purple: THEME_PALETTES.a,
    cyan: { main: THEME_PALETTES.a.secondary, light: THEME_PALETTES.a.secondaryLight, dark: THEME_PALETTES.a.secondaryDark },
};

// ─── Provider ────────────────────────────────────────────────────────────────

const VARIANT_STORAGE_KEY = 'kk-theme-variant';
const COLOR_STORAGE_KEY = 'kk-color-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [variant, setVariantState] = useState<ThemeVariant>('a');
    const [mode, setMode] = useState<PaletteMode>('light');
    const [showPanel, setShowPanel] = useState(false);

    // Load persisted state
    useEffect(() => {
        const savedVariant = localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null;
        if (savedVariant && ['a', 'b', 'c', 'd'].includes(savedVariant)) {
            setVariantState(savedVariant);
        }
        const savedMode = localStorage.getItem(COLOR_STORAGE_KEY) as PaletteMode | null;
        if (savedMode === 'dark' || savedMode === 'light') {
            setMode(savedMode);
        } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setMode('dark');
        }
    }, []);

    const setVariant = useCallback((v: ThemeVariant) => {
        setVariantState(v);
        localStorage.setItem(VARIANT_STORAGE_KEY, v);
    }, []);

    const toggleColorMode = useCallback(() => {
        setMode((prev) => {
            const next: PaletteMode = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(COLOR_STORAGE_KEY, next);
            return next;
        });
    }, []);

    const theme = useMemo(() => createThemeForVariant(variant, mode), [variant, mode]);
    const isDark = variant === 'd' || mode === 'dark';

    return (
        <ThemeContext.Provider value={{ variant, setVariant, mode, toggleColorMode, isDark }}>
            <MUIThemeProvider theme={theme}>
                <CssBaseline />
                {children}
                {/* Theme Switcher Panel */}
                <ThemeSwitcherPanel
                    show={showPanel}
                    setShow={setShowPanel}
                    variant={variant}
                    setVariant={setVariant}
                    isDark={isDark}
                />
                {/* Floating toggle button */}
                <IconButton
                    onClick={() => setShowPanel((p) => !p)}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1300,
                        width: 48,
                        height: 48,
                        bgcolor: 'primary.main',
                        color: 'white',
                        boxShadow: 4,
                        '&:hover': { bgcolor: 'primary.dark' },
                        transition: 'all 0.2s',
                    }}
                    aria-label="switch theme"
                >
                    <ColorLensIcon />
                </IconButton>
            </MUIThemeProvider>
        </ThemeContext.Provider>
    );
}

// ─── Theme Switcher Panel ────────────────────────────────────────────────────

function ThemeSwitcherPanel({
    show,
    setShow,
    variant,
    setVariant,
    isDark,
}: {
    show: boolean;
    setShow: (v: boolean) => void;
    variant: ThemeVariant;
    setVariant: (v: ThemeVariant) => void;
    isDark: boolean;
}) {
    return (
        <Fade in={show} timeout={300}>
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: { xs: 80, md: 100 },
                    right: { xs: 16, md: 20 },
                    left: { xs: 16, sm: 'auto' },
                    zIndex: 1300,
                    p: { xs: 1.5, md: 2 },
                    borderRadius: 3,
                    boxShadow: 8,
                    border: '1px solid',
                    borderColor: 'divider',
                    minWidth: { xs: 'calc(100vw - 32px)', sm: 200 },
                    maxWidth: 240,
                }}
            >
                <Typography
                    variant="overline"
                    sx={{
                        display: 'block',
                        mb: 1.5,
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                    }}
                >
                    THEME
                </Typography>
                {(['a', 'b', 'c', 'd'] as ThemeVariant[]).map((v) => {
                    const p = THEME_PALETTES[v];
                    const isActive = v === variant;
                    return (
                        <Box
                            key={v}
                            onClick={() => setVariant(v)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: 1.25,
                                borderRadius: 2,
                                mb: 0.75,
                                cursor: 'pointer',
                                border: '1.5px solid',
                                borderColor: isActive ? p.primary : 'transparent',
                                backgroundColor: isActive ? `${p.primary}12` : 'transparent',
                                transition: 'all 0.15s',
                                '&:hover': {
                                    backgroundColor: `${p.primary}08`,
                                },
                            }}
                        >
                            {/* Color swatch */}
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${p.primary} 0%, ${p.secondary} 100%)`,
                                    flexShrink: 0,
                                    border: '2px solid',
                                    borderColor: isActive ? p.primary : 'transparent',
                                }}
                            />
                            <Box sx={{ flex: 1 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: isActive ? 700 : 500,
                                        color: 'text.primary',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {p.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    {VARIANT_LABELS[v]}
                                </Typography>
                            </Box>
                            {isActive && (
                                <CheckCircleIcon
                                    sx={{
                                        fontSize: 18,
                                        color: p.primary,
                                        flexShrink: 0,
                                    }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Paper>
        </Fade>
    );
}
