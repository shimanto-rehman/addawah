import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE_NAME = 'addawah-session';
const SESSION_DAYS = 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  themeColor: string;
  themeMode: string;
  city: string | null;
  country: string;
};

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
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  cookies().set(COOKIE_NAME, '', { httpOnly: true, expires: new Date(0), path: '/' });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    if (!userId) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarColor: true,
            themeColor: true,
            themeMode: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      await destroySession();
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
