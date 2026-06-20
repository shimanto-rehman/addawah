'use client';

import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Worship Analytics"
        subtitle="Reflect on your journey — every prayer counts."
        arabicLabel="الإحصاء"
      />
      <AnalyticsCharts />
    </>
  );
}
