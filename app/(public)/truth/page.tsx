import type { Metadata } from 'next';
import { TruthPage } from '@/components/truth/TruthPage';

export const metadata: Metadata = {
  title: 'Truth — Reflections on Faith & Reason | Addawah',
  description:
    'Fifteen passages where science, philosophy, and revelation meet — on time, consciousness, design, and the unseen, each returning to the Creator behind creation.',
};

export default function Truth() {
  return <TruthPage />;
}
