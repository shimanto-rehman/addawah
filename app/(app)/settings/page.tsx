'use client';

import { useState } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useApp } from '@/components/providers/AppProvider';
import { THEME_COLORS, THEME_COLOR_LABELS, type ThemeColor } from '@/lib/constants';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

export default function SettingsPage() {
  const { mode, color, toggleMode, setColor } = useTheme();
  const { user, refresh } = useApp();
  const [city, setCity] = useState(user?.city ?? '');
  const [saved, setSaved] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, themeColor: color, themeMode: mode }),
    });
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <h1 className="dawa-page-title">Settings</h1>
      <p className="dawa-page-sub">Personalise your sanctuary.</p>

      <div className="dawa-panel">
        <h2 className="dawa-panel__title">Theme & appearance</h2>
        <p className="dawa-panel__sub">Pick a sacred palette and light or dark mode — changes apply instantly across the app.</p>
        <div style={{ marginBottom: 20 }}>
          <ThemeSwitcher />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
          {THEME_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c as ThemeColor)}
              style={{
                padding: '12px 10px',
                borderRadius: 'var(--radius-sm)',
                border: color === c ? '2px solid var(--accent-bright)' : '1px solid var(--border-soft)',
                background: color === c ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: 'var(--text-soft)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {THEME_COLOR_LABELS[c as ThemeColor]}
            </button>
          ))}
        </div>
        <button type="button" className="dawa-btn dawa-btn--outline" style={{ marginTop: 16 }} onClick={toggleMode}>
          Switch to {mode === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </div>

      <form className="dawa-panel" onSubmit={saveProfile}>
        <h2 className="dawa-panel__title">Profile</h2>
        <p className="dawa-panel__sub">Your city for future prayer time features</p>
        <div className="dawa-field">
          <label className="dawa-label" htmlFor="city">City</label>
          <input id="city" className="dawa-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dhaka" />
        </div>
        <button type="submit" className="dawa-btn dawa-btn--primary">{saved ? 'Saved ✓' : 'Save profile'}</button>
      </form>
    </>
  );
}
