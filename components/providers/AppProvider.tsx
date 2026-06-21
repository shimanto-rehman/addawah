'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, ReactNode } from 'react';
import useSWR from 'swr';
import type { SessionUser } from '@/lib/auth';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => r.json());

type AppContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
};

const AppContext = createContext<AppContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
  logout: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR<{ user: SessionUser | null }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 0,
  });

  const refresh = useCallback(() => mutate(), [mutate]);

  const verifySession = useCallback(async () => {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    const next = (await res.json()) as { user: SessionUser | null };
    await mutate(next, false);
    return next.user;
  }, [mutate]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    await mutate({ user: null }, false);
    // replace (not href) so the dashboard is not kept in history for Back.
    window.location.replace('/login');
  }, [mutate]);

  // Bfcache can restore a pre-logout React tree; re-check the session cookie.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      void (async () => {
        const user = await verifySession();
        if (!user) window.location.replace('/login');
      })();
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [verifySession]);

  const value = useMemo(
    () => ({
      user: data?.user ?? null,
      loading: isLoading,
      refresh,
      logout,
    }),
    [data, isLoading, refresh, logout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
