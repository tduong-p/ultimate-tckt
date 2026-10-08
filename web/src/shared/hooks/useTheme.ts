import { useState, useEffect, useCallback } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens/set-global-theme';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'tckt_theme';
const THEME_EVENT = 'tckt-theme-change';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // ignore local storage restrictions
  }
  return 'light';
}

export function applyGlobalTheme(theme: ThemeMode) {
  try {
    setGlobalTheme({ colorMode: theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    // ignore
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyGlobalTheme(theme);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail && (customEvent.detail === 'light' || customEvent.detail === 'dark')) {
        setThemeState(customEvent.detail);
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeChange);
    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
    };
  }, [theme]);

  const toggleTheme = useCallback((targetTheme?: ThemeMode) => {
    setThemeState((current) => {
      const next = targetTheme ?? (current === 'light' ? 'dark' : 'light');
      applyGlobalTheme(next);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme, setTheme: toggleTheme };
}
