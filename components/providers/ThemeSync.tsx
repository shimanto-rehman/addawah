'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { ThemeColor } from '@/lib/constants';

const COLORS: ThemeColor[] = ['green', 'blue', 'gold', 'purple', 'silver', 'pink'];

function readLocalMode(): 'dark' | 'light' | null {
  if (typeof window === 'undefined') return null;
  const mode = localStorage.getItem('addawah-mode');
  return mode === 'light' || mode === 'dark' ? mode : null;
}

function readLocalColor(): ThemeColor | null {
  if (typeof window === 'undefined') return null;
  const color = localStorage.getItem('addawah-color');
  return COLORS.includes(color as ThemeColor) ? (color as ThemeColor) : null;
}

async function saveThemeToProfile(mode: 'dark' | 'light', color: ThemeColor) {
  await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeMode: mode, themeColor: color }),
  });
}

export function ThemeSync() {
  const { user, refresh } = useApp();
  const { mode, color, setColor, setMode } = useTheme();
  const hydrated = useRef(false);
  const skipSave = useRef(true);
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      hydrated.current = false;
      skipSave.current = true;
      syncedUserId.current = null;
      return;
    }

    if (syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;

    const localMode = readLocalMode();
    const localColor = readLocalColor();
    const modeToApply =
      localMode ?? (user.themeMode === 'light' || user.themeMode === 'dark' ? user.themeMode : 'dark');
    const colorToApply =
      localColor ??
      (COLORS.includes(user.themeColor as ThemeColor) ? (user.themeColor as ThemeColor) : 'gold');

    skipSave.current = true;
    setMode(modeToApply);
    setColor(colorToApply);
    hydrated.current = true;

    const needsServerSync =
      modeToApply !== user.themeMode || colorToApply !== user.themeColor;

    if (needsServerSync) {
      saveThemeToProfile(modeToApply, colorToApply)
        .then(() => refresh())
        .finally(() => {
          skipSave.current = false;
        });
    } else {
      skipSave.current = false;
    }
  }, [user, setColor, setMode, refresh]);

  useEffect(() => {
    if (!user || !hydrated.current || skipSave.current) return;
    if (user.themeMode === mode && user.themeColor === color) return;

    const timer = window.setTimeout(() => {
      saveThemeToProfile(mode, color).then(() => refresh());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [user, mode, color, refresh]);

  return null;
}
