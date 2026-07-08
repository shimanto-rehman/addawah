import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { prisma } from './prisma';
import { kvGetJson, kvSetJson, kvDel } from './kv';

const COOKIE_NAME = 'addawah-session';
const SESSION_DAYS = 30;
const SESSION_CACHE_TTL_S = 30;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  avatarColor: string;
  avatarUrl: string | null;
  themeColor: string;
  themeMode: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string | null;
};

function asSessionUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== 'object') return null;
  const id = (value as SessionUser).id;
  return typeof id === 'string' && id.length > 0 ? (value as SessionUser) : null;
}

export async function createSession(userId: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setIssuedAt()
    .sign(getSecret());

  await prisma.session.create({
    data: { userId, token, expiresAt },
  });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function destroySession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await kvDel(`session:${tokenHash(token)}`).catch(() => {});
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookies().set(COOKIE_NAME, '', { httpOnly: true, expires: new Date(0), path: '/' });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  // L1: Check Redis cache (shared across serverless instances)
  const cacheKey = `session:${tokenHash(token)}`;
  const cached = await kvGetJson<SessionUser>(cacheKey);
  const cachedUser = asSessionUser(cached);
  if (cachedUser) return cachedUser;
  if (cached) await kvDel(cacheKey).catch(() => {});

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    if (!userId) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            mobile: true,
            gender: true,
            avatarColor: true,
            avatarUrl: true,
            themeColor: true,
            themeMode: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
            timeZone: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date() || !session.user) {
      await destroySession();
      return null;
    }

    const user = asSessionUser(session.user);
    if (!user) {
      await destroySession();
      return null;
    }

    // Cache in Redis for 30 seconds
    await kvSetJson(cacheKey, user, SESSION_CACHE_TTL_S);
    return user;
  } catch {
    return null;
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
