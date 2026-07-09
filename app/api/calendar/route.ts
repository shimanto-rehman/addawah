import { NextRequest } from 'next/server';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildCalendarPayload } from '@/lib/islamic-calendar';

/**
 * GET /api/calendar — calendar page payload for the authenticated user.
 *
 * Query params (optional):
 *   year  — Gregorian year to display in the month grid (e.g. 2026).
 *   month — Gregorian month to display, 1–12 (1 = January).
 *
 * When omitted, the grid anchors to the current month. `today`, the
 * next-event countdown, and the consistency window are always relative to
 * the real current date — only the grid view follows year/month.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const yearStr = sp.get('year');
  const monthStr = sp.get('month');

  let viewDate: Date | undefined;
  if (yearStr && monthStr) {
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10); // 1–12
    if (
      Number.isFinite(year) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12
    ) {
      viewDate = new Date(year, month - 1, 1);
    }
  }

  const payload = await buildCalendarPayload(user!.id, new Date(), viewDate);
  return jsonOk(payload);
}
