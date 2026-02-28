'use client';
import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, CssBaseline } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { createAppTheme } from './theme';

// ─── Color mode context ───────────────────────────────────────────────────────

interface ColorModeContextType {
    mode: PaletteMode;
    toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
    mode: 'light',
    toggleColorMode: () => {},
});

export function useColorMode() {
    return useContext(ColorModeContext);
}

// ─── Provider ────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = 'kk-color-mode';

export function ThemeProvider({ children }: ThemeProviderProps) {
    // Start with 'light' on server to avoid hydration mismatch; swap after mount
    const [mode, setMode] = useState<PaletteMode>('light');

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as PaletteMode | null;
        if (saved === 'dark' || saved === 'light') {
            setMode(saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setMode('dark');
        }
    }, []);

    const toggleColorMode = () => {
        setMode((prev) => {
            const next: PaletteMode = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    };

    const theme = useMemo(() => createAppTheme(mode), [mode]);

    return (
        <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
            <MUIThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MUIThemeProvider>
        </ColorModeContext.Provider>
    );
}

