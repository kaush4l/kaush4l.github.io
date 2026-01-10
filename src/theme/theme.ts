'use client';
import { createTheme } from '@mui/material/styles';

// Modern color palette - white and purple aesthetic
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#7C3AED', // Purple 600
            light: '#A78BFA', // Purple 400
            dark: '#5B21B6', // Purple 800
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#8B5CF6', // Purple 500
            light: '#C4B5FD', // Purple 300
            dark: '#6D28D9', // Purple 700
        },
        background: {
            default: '#FAFAFA',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1F2937', // Gray 800
            secondary: '#6B7280', // Gray 500
        },
        divider: 'rgba(124, 58, 237, 0.12)',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 800,
            letterSpacing: '-0.02em',
        },
        h2: {
            fontWeight: 700,
            letterSpacing: '-0.01em',
        },
        h3: {
            fontWeight: 600,
        },
        h4: {
            fontWeight: 600,
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 24,
                    padding: '10px 24px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                        boxShadow: '0 20px 25px -5px rgba(124, 58, 237, 0.1), 0 8px 10px -6px rgba(124, 58, 237, 0.1)',
                        transform: 'translateY(-2px)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                },
                outlined: {
                    borderColor: 'rgba(124, 58, 237, 0.3)',
                    '&:hover': {
                        backgroundColor: 'rgba(124, 58, 237, 0.08)',
                        borderColor: '#7C3AED',
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRight: 'none',
                    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.05)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                },
            },
        },
    },
});

export default theme;
