'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IslamicBackdrop } from '@/components/layout/IslamicBackdrop';
import { AppHeader, MobileTabBar } from '@/components/layout/AppHeader';
import { ConfettiScript } from '@/components/layout/ConfettiScript';
import { AppProvider, useApp } from '@/components/providers/AppProvider';
import { ThemeSync } from '@/components/providers/ThemeSync';

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, refresh } = useApp();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [refresh]);

  useEffect(() => {
    if (!loading && user) {
      window.dispatchEvent(new CustomEvent('appAuthReady'));
    }
  }, [loading, user]);

  return (
    <>
      <ConfettiScript />
      <IslamicBackdrop />
      <div className="dawa-shell">
        <AppHeader />
        <main className="dawa-main">
          {loading ? (
            <p className="dawa-page-loading">Loading your sanctuary…</p>
          ) : user ? (
            children
          ) : null}
        </main>
        <MobileTabBar />
      </div>
    </>
  );
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ThemeSync />
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
