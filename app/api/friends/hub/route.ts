import { NextRequest } from 'next/server';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildFriendsHubPayload, parseFriendsPageParams } from '@/lib/friends-hub';

export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const { cursor, limit } = parseFriendsPageParams(req.nextUrl.searchParams);
  const data = await buildFriendsHubPayload(user!.id, cursor, limit);
  return jsonOk(data);
}
