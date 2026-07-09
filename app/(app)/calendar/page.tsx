'use client';

import { IslamicCalendar } from '@/components/calendar/IslamicCalendar';
import { PageHeader } from '@/components/layout/PageHeader';

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Islamic Calendar"
        subtitle="Walk the sacred year — every blessed day, every sunnah."
        arabicLabel="التقويم الإسلامي"
      />
      <IslamicCalendar />
    </>
  );
}
