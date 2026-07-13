import type { Metadata } from 'next';
import { TruthPage } from '@/components/truth/TruthPage';

export const metadata: Metadata = {
  title: 'Truth — Reflections on Faith & Reason | Addawah',
  description:
    'Passages where science, philosophy, and revelation meet — on time, consciousness, design, and the unseen, each returning to the Creator behind creation.',
};

/** Internal app-shell Truth. Served at URL /truth via middleware rewrite when signed in. */
export default function AppTruth() {
  return <TruthPage variant="app" />;
}
