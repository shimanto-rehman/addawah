'use client';

import { useEffect } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { ThemeColor } from '@/lib/constants';

const COLORS: ThemeColor[] = ['green', 'blue', 'gold', 'purple', 'silver', 'pink'];

export function ThemeSync() {
  const { user } = useApp();
  const { setColor, setMode } = useTheme();

  useEffect(() => {
    if (!user) return;
    if (COLORS.includes(user.themeColor as ThemeColor)) {
      setColor(user.themeColor as ThemeColor);
    }
    if (user.themeMode === 'dark' || user.themeMode === 'light') {
      setMode(user.themeMode);
    }
  }, [user, setColor, setMode]);

  return null;
}
