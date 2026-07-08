import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiRequireAuth, jsonError, jsonOk } from '@/lib/api-helpers';
import { getDailyChallenge, toggleChallengeTask, CHALLENGE_TASK_COUNT } from '@/lib/challenge-data';

const toggleSchema = z.object({
  taskIndex: z.number().int().min(0).max(CHALLENGE_TASK_COUNT - 1),
});

/** GET /api/challenge — today's state */
export async function GET() {
  const { user, error } = await apiRequireAuth();
  if (error) return error;
  const state = await getDailyChallenge(user!.id);
  return jsonOk(state);
}

/** POST /api/challenge — toggle a task. Body: { taskIndex: number } */
export async function POST(req: NextRequest) {
  const { user, error } = await apiRequireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      `Validation failed: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      400,
    );
  }

  const state = await toggleChallengeTask(user!.id, parsed.data.taskIndex);
  return jsonOk(state);
}
