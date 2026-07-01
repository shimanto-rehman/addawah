'use client';

import { RuhaniahDataProvider } from '@/components/ruhaniah/RuhaniahDataProvider';
import { RuhaniahFlow } from '@/components/ruhaniah/RuhaniahFlow';

export default function RuhaniahPage() {
  return (
    <RuhaniahDataProvider>
      <RuhaniahFlow />
    </RuhaniahDataProvider>
  );
}
