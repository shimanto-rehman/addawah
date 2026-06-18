import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';

const schema = z.object({
  city: z.string().max(80).optional(),
  themeColor: z.enum(['green', 'blue', 'gold', 'purple', 'silver', 'pink']).optional(),
  themeMode: z.enum(['dark', 'light']).optional(),
});

export async function PATCH(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  try {
    const body = schema.parse(await req.json());
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        city: body.city?.trim() || null,
        themeColor: body.themeColor,
        themeMode: body.themeMode,
      },
    });
    return jsonOk({ ok: true });
  } catch {
    return jsonError('Failed to update profile', 500);
  }
}
