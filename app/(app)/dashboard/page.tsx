'use client';

import { HeroStats } from '@/components/dashboard/HeroStats';
import { SalahTracker } from '@/components/dashboard/SalahTracker';
import { HijriCalendar } from '@/components/dashboard/HijriCalendar';
import { InspirationCard } from '@/components/dashboard/InspirationCard';
import { useApp } from '@/components/providers/AppProvider';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user } = useApp();

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}
      >
        <p className="dawa-greeting">السَّلَامُ عَلَيْكُمْ</p>
        <h1 className="dawa-page-title">{user?.name?.split(' ')[0] ?? 'Friend'}</h1>
        <p className="dawa-page-sub">Track your prayers, nurture consistency, inspire your brothers and sisters.</p>
      </motion.header>

      <HeroStats />
      <SalahTracker />

      <div className="dawa-duo">
        <HijriCalendar />
        <InspirationCard />
      </div>
    </>
  );
}
