import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { PageHeader } from '@/components/layout/PageHeader';

export default function NotificationsPage() {
  return (
    <div className="dawa-notif-page">
      <PageHeader
        title="Notifications"
        subtitle="Dawah, brotherhood, and wakt reminders — all in one place."
        arabicLabel="الإشعارات"
      />
      <section className="dawa-glass dawa-notif-page__panel">
        <NotificationPanel variant="page" showSeedSamples />
      </section>
    </div>
  );
}
