import { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { DEVELOPER } from '@/lib/constants';
import { isEmailConfigured, sendTruthContactEmail } from '@/lib/email';
import { getClientIp } from '@/lib/get-client-ip';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
  sanitizeNameInput,
} from '@/lib/validation';

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  message: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(`rl:truth-contact:${getClientIp(req)}`, 5, 60 * 60);
  if (!rl.allowed) {
    return jsonError('Too many messages. Please try again later.', 429);
  }

  if (!isEmailConfigured()) {
    return jsonError('Messaging is temporarily unavailable. Please try again later.', 503);
  }

  try {
    const body = schema.parse(await req.json());
    const name = sanitizeName(sanitizeNameInput(body.name));
    const email = sanitizeEmail(body.email);
    const message = body.message.trim().replace(/\s+/g, ' ').slice(0, 2000);

    if (!isValidName(name)) {
      return jsonError('Enter a valid name (letters only, no numbers).');
    }
    if (!isValidEmail(email)) {
      return jsonError('Enter a valid email address.');
    }
    if (message.length < 10) {
      return jsonError('Please share a bit more in your message.');
    }

    const sent = await sendTruthContactEmail({
      to: DEVELOPER.contactEmail,
      name,
      email,
      message,
    });

    if (!sent) {
      logger.error({ route: '/api/truth/contact' }, 'Truth contact email failed to send');
      return jsonError('Could not send your message. Please try again.', 500);
    }

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(e.errors[0]?.message ?? 'Invalid input');
    }
    logger.error({ route: '/api/truth/contact', err: e }, 'Truth contact failed');
    return jsonError('Could not send your message. Please try again.', 500);
  }
}
