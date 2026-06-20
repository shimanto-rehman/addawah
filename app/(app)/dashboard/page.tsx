'use client';

import { HeroStats } from '@/components/dashboard/HeroStats';
import { PrayerInsights } from '@/components/dashboard/PrayerInsights';
import { SalahTracker } from '@/components/dashboard/SalahTracker';
import { HijriCalendar } from '@/components/dashboard/HijriCalendar';
import { InspirationCard } from '@/components/dashboard/InspirationCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useApp } from '@/components/providers/AppProvider';

export default function DashboardPage() {
  const { user } = useApp();

  return (
    <>
      <PageHeader
        variant="home"
        greeting="السَّلَامُ عَلَيْكُمْ"
        title={user?.name?.split(' ')[0] ?? 'Friend'}
      />

      <HeroStats />
      <PrayerInsights />
      <SalahTracker />

      <div className="dawa-duo">
        <HijriCalendar />
        <InspirationCard />
      </div>
    </>
  );
}
