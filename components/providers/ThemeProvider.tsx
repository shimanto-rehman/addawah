'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { ThemeColor } from '@/lib/constants';

type ThemeMode = 'dark' | 'light';

type ThemeContextValue = {
  mode: ThemeMode;
  color: ThemeColor;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
  setColor: (c: ThemeColor) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  color: 'gold',
  toggleMode: () => {},
  setMode: () => {},
  setColor: () => {},
});

function applyTheme(mode: ThemeMode, color: ThemeColor) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.setAttribute('data-color', color);
}

export function ThemeProvider({
  children,
  initialMode = 'dark',
  initialColor = 'gold',
}: {
  children: ReactNode;
  initialMode?: ThemeMode;
  initialColor?: ThemeColor;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  const [color, setColorState] = useState<ThemeColor>(initialColor);

  useEffect(() => {
    const savedMode = (localStorage.getItem('addawah-mode') as ThemeMode) || initialMode;
    const savedColor = (localStorage.getItem('addawah-color') as ThemeColor) || initialColor;
    setModeState(savedMode);
    setColorState(savedColor);
    applyTheme(savedMode, savedColor);
  }, [initialMode, initialColor]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem('addawah-mode', m);
    setColorState((c) => {
      applyTheme(m, c);
      return c;
    });
  }, []);

  const setColor = useCallback((c: ThemeColor) => {
    setColorState(c);
    localStorage.setItem('addawah-color', c);
    setModeState((m) => {
      applyTheme(m, c);
      return m;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('addawah-mode', next);
      setColorState((c) => {
        applyTheme(next, c);
        return c;
      });
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, color, toggleMode, setMode, setColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
