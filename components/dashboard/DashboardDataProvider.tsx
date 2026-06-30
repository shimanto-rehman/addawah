'use client';

import { createContext, useContext, type ReactNode } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import type { DashboardPayload } from '@/lib/dashboard-data';
import { DASHBOARD_KEY } from '@/lib/swr-revalidate';
import { swrFetcher } from '@/lib/swr-fetcher';
import { useApp } from '@/components/providers/AppProvider';

export { DASHBOARD_KEY };

type DashboardContextValue = {
  data: DashboardPayload | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<DashboardPayload>;
};

const DashboardDataContext = createContext<DashboardContextValue | null>(null);

const swrOpts = {
  refreshInterval: 60_000,
  revalidateOnFocus: false,
  revalidateIfStale: true,
};

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useApp();
  const { data, isLoading, mutate } = useSWR<DashboardPayload>(
    user && !loading ? DASHBOARD_KEY : null,
    swrFetcher,
    swrOpts,
  );

  return (
    <DashboardDataContext.Provider value={{ data, isLoading, mutate }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}
