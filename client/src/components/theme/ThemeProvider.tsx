import { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from './types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>({
    variant: 'vibrant',
    primary: 'hsl(250 95% 60%)',
    appearance: 'light',
    radius: 0.75
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme variant
    root.setAttribute('data-theme-variant', theme.variant);
    
    // Update appearance
    if (theme.appearance === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme.appearance);
    }
    
    // Update other theme properties
    root.style.setProperty('--radius', `${theme.radius}rem`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
