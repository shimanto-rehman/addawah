'use client';

import { AnalyticsHub } from '@/components/analytics/AnalyticsHub';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Worship Analytics"
        subtitle="Reflect deeply — every prayer shapes your journey."
        arabicLabel="الإحصاء"
      />
      <AnalyticsHub />
    </>
  );
}
