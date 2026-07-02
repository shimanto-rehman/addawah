'use client';

import { createContext, useContext, type ReactNode } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { swrFetcher } from '@/lib/swr-fetcher';
import { useApp } from '@/components/providers/AppProvider';

export type RuhaniahPayload = {
  completed: boolean;
  taqwaScore: number | null;
  barakahScores: {
    timeScore: number;
    rizqScore: number;
    healthScore: number;
    heartScore: number;
  } | null;
  verse: {
    ayahRef: string;
    arabic: string;
    translation: string;
    tafsir: string;
    reflectionText: string;
    dawahText: string;
    signals: Record<string, unknown>;
  } | null;
  fahmProfile: {
    totalQuestions: number;
    categoryScores: Record<string, number>;
    overallQAS: number;
    strongest: string | null;
    weakest: string | null;
    trend: string;
  } | null;
  insights: {
    taqwaHistory: { date: string; score: number }[];
    barakahHistory: { date: string; timeScore: number; rizqScore: number; healthScore: number; heartScore: number }[];
    duaStats: { total: number; answered: number; waiting: number; stored: number };
    duaTimeline: { text: string; category: string; status: string; daysToAccept: number; dateStarted: string; dateResolved: string }[];
    duaList: { id: string; text: string; category: string; status: string; dateStarted: string; dateResolved: string | null; daysWaiting: number | null }[];
  } | null;
};

type RuhaniahContextValue = {
  data: RuhaniahPayload | undefined;
  isLoading: boolean;
  mutate: KeyedMutator<RuhaniahPayload>;
};

const RuhaniahContext = createContext<RuhaniahContextValue | null>(null);

export function RuhaniahDataProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useApp();
  const { data, isLoading, mutate } = useSWR<RuhaniahPayload>(
    user && !loading ? '/api/ruhaniah' : null,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    },
  );

  return (
    <RuhaniahContext.Provider value={{ data, isLoading, mutate }}>
      {children}
    </RuhaniahContext.Provider>
  );
}

export function useRuhaniahData() {
  return useContext(RuhaniahContext);
}
