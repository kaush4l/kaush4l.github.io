'use client';
import { createTheme, type PaletteMode } from '@mui/material/styles';

// ─── Brand tokens ────────────────────────────────────────────────────────────
export const COLORS = {
    purple: {
        50:   '#F5F3FF',
        100:  '#EDE9FE',
        300:  '#C4B5FD',
        400:  '#A78BFA',
        500:  '#8B5CF6',
        600:  '#7C3AED',
        700:  '#6D28D9',
        800:  '#5B21B6',
        900:  '#4C1D95',
        // Convenience aliases
        main:  '#7C3AED',
        light: '#A78BFA',
        dark:  '#5B21B6',
    },
    cyan: {
        50:   '#ECFEFF',
        100:  '#CFFAFE',
        300:  '#67E8F9',
        400:  '#22D3EE',
        500:  '#06B6D4',
        600:  '#0891B2',
        700:  '#0E7490',
        // Convenience aliases
        main:  '#06B6D4',
        light: '#67E8F9',
        dark:  '#0E7490',
    },
} as const;

// ─── Theme factory ───────────────────────────────────────────────────────────

export function createAppTheme(mode: PaletteMode = 'light') {
    const isDark = mode === 'dark';

    return createTheme({
        palette: {
            mode,
            primary: {
                main:         COLORS.purple[600],
                light:        COLORS.purple[400],
                dark:         COLORS.purple[800],
                contrastText: '#FFFFFF',
            },
            secondary: {
                main:  COLORS.cyan[500],
                light: COLORS.cyan[300],
                dark:  COLORS.cyan[700],
                contrastText: '#FFFFFF',
            },
            background: {
                default: isDark ? '#0F0F14' : '#FAFAFA',
                paper:   isDark ? '#16161E' : '#FFFFFF',
            },
            text: {
                primary:   isDark ? '#F1F0F9' : '#1F2937',
                secondary: isDark ? '#9CA3AF' : '#6B7280',
            },
            divider: isDark
                ? 'rgba(167, 139, 250, 0.12)'
                : 'rgba(124, 58, 237, 0.12)',
            // Surface accent used for chip and banner backgrounds
            action: {
                hover:    isDark ? 'rgba(124, 58, 237, 0.12)' : 'rgba(124, 58, 237, 0.06)',
                selected: isDark ? 'rgba(124, 58, 237, 0.2)'  : 'rgba(124, 58, 237, 0.1)',
            },
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h1: { fontWeight: 800, letterSpacing: '-0.02em' },
            h2: { fontWeight: 700, letterSpacing: '-0.01em' },
            h3: { fontWeight: 600 },
            h4: { fontWeight: 600 },
            h5: { fontWeight: 600 },
            h6: { fontWeight: 600 },
            button: { textTransform: 'none', fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 24,
                        padding: '10px 24px',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 14px ${isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.22)'}`,
                        },
                    },
                    containedPrimary: {
                        background: `linear-gradient(135deg, ${COLORS.purple[600]} 0%, ${COLORS.purple[500]} 100%)`,
                    },
                    containedSecondary: {
                        background: `linear-gradient(135deg, ${COLORS.cyan[600]} 0%, ${COLORS.cyan[400]} 100%)`,
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                        border: `1px solid ${isDark ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.06)'}`,
                        boxShadow: isDark
                            ? '0 4px 24px rgba(0,0,0,0.4)'
                            : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                            boxShadow: isDark
                                ? '0 20px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.3)'
                                : '0 20px 25px -5px rgba(124,58,237,0.1), 0 8px 10px -6px rgba(124,58,237,0.1)',
                            transform: 'translateY(-2px)',
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 8, fontWeight: 500 },
                    outlined: {
                        borderColor: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.3)',
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
                            borderColor: COLORS.purple[600],
                        },
                    },
                    // Cyan variant for secondary chips
                    colorSecondary: {
                        borderColor: isDark ? `rgba(6,182,212,0.4)` : `rgba(6,182,212,0.35)`,
                        '&:hover': {
                            backgroundColor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.08)',
                        },
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        borderRight: 'none',
                        backgroundColor: isDark ? '#12121A' : '#FFFFFF',
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
                        boxShadow: `0 1px 0 0 ${isDark ? 'rgba(167,139,250,0.12)' : 'rgba(124,58,237,0.1)'}`,
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

// Default export (light) — kept for any import that hasn't been migrated yet
export default createAppTheme('light');

