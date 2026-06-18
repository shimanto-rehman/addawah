'use client';

import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';

export default function AnalyticsPage() {
  return (
    <>
      <h1 className="dawa-page-title">Worship Analytics</h1>
      <p className="dawa-page-sub">Reflect on your journey — every prayer counts.</p>
      <AnalyticsCharts />
    </>
  );
}
