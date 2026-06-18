'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IslamicBackdrop } from '@/components/layout/IslamicBackdrop';
import { AppHeader, MobileTabBar } from '@/components/layout/AppHeader';
import { AppProvider, useApp } from '@/components/providers/AppProvider';
import { ThemeSync } from '@/components/providers/ThemeSync';

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useApp();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="dawa-auth" style={{ flexDirection: 'column' }}>
        <IslamicBackdrop />
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
            position: 'relative',
            zIndex: 1,
          }}
        />
        <p style={{ color: 'var(--text-soft)', marginTop: 16, position: 'relative', zIndex: 1 }}>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <IslamicBackdrop />
      <div className="dawa-shell">
        <AppHeader />
        <main className="dawa-main">{children}</main>
        <MobileTabBar />
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ThemeSync />
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
