'use client';

import { HeroStats } from '@/components/dashboard/HeroStats';
import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn';
import { SalahTracker } from '@/components/dashboard/SalahTracker';
import { DailyChallenge } from '@/components/dashboard/DailyChallenge';
import { DashboardDataProvider } from '@/components/dashboard/DashboardDataProvider';
import { HijriCalendar } from '@/components/dashboard/HijriCalendar';
import { InspirationCard } from '@/components/dashboard/InspirationCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { LocationPrompt } from '@/components/location/LocationPrompt';
import { useApp } from '@/components/providers/AppProvider';

export default function DashboardPage() {
  const { user } = useApp();

  return (
    <DashboardDataProvider>
      <PageHeader
        variant="home"
        greeting="السَّلَامُ عَلَيْكُمْ"
        title={user?.name?.split(' ')[0] ?? 'Friend'}
      />

      {user && <LocationPrompt user={user} />}

      <HeroStats />
      <SalahTracker />
      <DailyChallenge />

      <div className="dawa-duo">
        <HijriCalendar />
        <InspirationCard />
      </div>
    </DashboardDataProvider>
  );
}
