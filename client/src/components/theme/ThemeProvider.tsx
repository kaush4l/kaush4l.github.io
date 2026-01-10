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
    
    // Apply theme variant first
    root.setAttribute('data-theme-variant', theme.variant);
    
    // Apply dark/light mode to html element
    if (theme.appearance === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme.appearance);
    }
    
    // Update radius
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
