import { NextRequest } from 'next/server';
import { apiRequireAuth, jsonOk } from '@/lib/api-helpers';
import { buildFriendsHubPayload, parseFriendsPageParams } from '@/lib/friends-hub';

/** Paginated board rows — prefer GET /api/friends/hub for combined load. */
export async function GET(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  const { cursor, limit } = parseFriendsPageParams(req.nextUrl.searchParams);
  const data = await buildFriendsHubPayload(user!.id, cursor, limit);

  return jsonOk({
    board: data.board,
    page: data.page,
    summary: data.summary,
    updatedAt: data.updatedAt,
  });
}
