'use client';

import useSWR from 'swr';
import { swrFetcher } from '@/lib/swr-fetcher';

type TaqwaEntry = { date: string; score: number };
type BarakahEntry = {
  date: string;
  timeScore: number;
  rizqScore: number;
  healthScore: number;
  heartScore: number;
};

export type RuhaniahHistoryPayload = {
  taqwaHistory: TaqwaEntry[];
  barakahHistory: BarakahEntry[];
};

export function useRuhaniahHistory() {
  return useSWR<RuhaniahHistoryPayload>('/api/ruhaniah/history', swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });
}
