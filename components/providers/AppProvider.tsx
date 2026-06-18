'use client';

import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import useSWR from 'swr';
import type { SessionUser } from '@/lib/auth';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
    revalidateOnFocus: true,
  });

  const refresh = useCallback(() => mutate(), [mutate]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await mutate({ user: null }, false);
    window.location.href = '/login';
  }, [mutate]);

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
