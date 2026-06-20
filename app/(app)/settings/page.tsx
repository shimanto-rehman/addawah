'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/providers/ThemeProvider';
import { THEME_COLORS, THEME_COLOR_LABELS, type ThemeColor } from '@/lib/constants';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { PageHeader } from '@/components/layout/PageHeader';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';

export default function SettingsPage() {
  const { mode, color, toggleMode, setColor } = useTheme();
  const [saved, setSaved] = useState(false);

  async function saveTheme() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeColor: color, themeMode: mode }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Personalise your sanctuary." arabicLabel="الإعدادات" />

      <div className="dawa-panel">
        <h2 className="dawa-panel__title">Profile</h2>
        <p className="dawa-panel__sub">Update your photo, contact details, city, and country.</p>
        <Link href="/profile" className="dawa-btn dawa-btn--outline">
          Edit profile
        </Link>
      </div>

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
        <button type="button" className="dawa-btn dawa-btn--primary" style={{ marginTop: 12 }} onClick={saveTheme}>
          {saved ? 'Theme saved ✓' : 'Save theme preferences'}
        </button>
      </div>

      <DeleteAccountSection />
    </>
  );
}
