import { SignJWT, jwtVerify } from 'jose';
import { RESET_TOKEN_TTL_MIN } from './password-reset';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export async function createPasswordResetToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${RESET_TOKEN_TTL_MIN}m`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== 'password-reset' || typeof payload.sub !== 'string') return null;
    return payload.sub;
  } catch {
    return null;
  }
}
