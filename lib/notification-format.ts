/** Human-readable timestamp for notification copy and UI. */
export function formatNotificationTime(
  date: Date | string,
  timeZone?: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatWaktEndTime(minutesFromMidnight: number, timeZone?: string): string {
  const h = Math.floor(minutesFromMidnight / 60) % 24;
  const m = minutesFromMidnight % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function notificationTimeSuffix(at: Date, timeZone?: string): string {
  return ` · ${formatNotificationTime(at, timeZone)}`;
}
