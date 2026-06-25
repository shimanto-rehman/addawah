import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const data = await listNotifications(user!.id);
  return jsonOk(data);
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read_all') }),
  z.object({ action: z.literal('read'), notificationId: z.string() }),
]);

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = patchSchema.parse(await req.json());

    if (body.action === 'read_all') {
      await markAllNotificationsRead(user!.id);
      const data = await listNotifications(user!.id);
      return jsonOk(data);
    }

    await markNotificationRead(user!.id, body.notificationId);
    const data = await listNotifications(user!.id);
    return jsonOk(data);
  } catch {
    return jsonError('Failed to update notifications', 400);
  }
}
