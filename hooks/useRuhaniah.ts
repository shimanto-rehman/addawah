'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/swr-fetcher';

export type RuhaniahTodayPayload = {
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
};

export function useRuhaniah() {
  return useSWR<RuhaniahTodayPayload>('/api/ruhaniah', swrFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
    refreshInterval: 0,
  });
}
