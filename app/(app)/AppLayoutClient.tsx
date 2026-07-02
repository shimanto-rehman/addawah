'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IslamicBackdrop } from '@/components/layout/IslamicBackdrop';
import { AppHeader, MobileTabBar } from '@/components/layout/AppHeader';
import { ConfettiScript } from '@/components/layout/ConfettiScript';
import { AppProvider, useApp } from '@/components/providers/AppProvider';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { Shimmer } from '@/components/ui/Shimmer';

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
            <div className="dawa-page-loading">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
                {/* Hero shimmer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <Shimmer variant="stat-value" width="120px" height="64px" borderRadius="12px" />
                  <Shimmer variant="text" width="200px" />
                  <Shimmer variant="text-sm" width="300px" />
                </div>
                {/* Stats shimmer */}
                <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px' }}>
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Shimmer variant="stat-value" />
                      <Shimmer variant="stat-label" />
                    </div>
                  ))}
                </div>
                {/* Chart shimmer */}
                <Shimmer variant="card" height="180px" />
              </div>
            </div>
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
