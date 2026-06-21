import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { hashPassword } from './password';
import { isEmailConfigured, sendPasswordResetOtpEmail } from './email';
import { sanitizeEmail } from './validation';
import { createPasswordResetToken, verifyPasswordResetToken } from './password-reset-token';
import {
  RESET_OTP_MAX_ATTEMPTS,
  RESET_OTP_MAX_SENDS,
  RESET_OTP_RESEND_COOLDOWN_MS,
  RESET_OTP_TTL_MS,
  generateResetOtpCode,
  maskEmail,
} from './password-reset';

const userPreviewSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatarColor: true,
  avatarUrl: true,
} as const;

export async function sendPasswordResetOtp(emailRaw: string) {
  if (!isEmailConfigured()) {
    return { ok: false as const, error: 'Password reset email is not configured on this server' };
  }

  const email = sanitizeEmail(emailRaw);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  // Always respond as if sent — do not reveal whether the email is registered.
  if (!user) {
    return { ok: true as const, emailMasked: maskEmail(email) };
  }

  const existing = await prisma.passwordResetOtp.findUnique({ where: { userId: user.id } });
  const now = Date.now();

  if (existing) {
    if (existing.sendCount >= RESET_OTP_MAX_SENDS) {
      return { ok: false as const, error: 'Too many codes sent. Try again later or contact support.' };
    }
    if (now - existing.lastSentAt.getTime() < RESET_OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (RESET_OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000,
      );
      return { ok: false as const, error: `Wait ${waitSec}s before requesting another code` };
    }
  }

  const code = generateResetOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now + RESET_OTP_TTL_MS);

  await prisma.passwordResetOtp.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      codeHash,
      expiresAt,
      sendCount: 1,
      lastSentAt: new Date(now),
    },
    update: {
      codeHash,
      expiresAt,
      attempts: 0,
      sendCount: { increment: 1 },
      lastSentAt: new Date(now),
    },
  });

  const sent = await sendPasswordResetOtpEmail({
    to: user.email,
    name: user.name,
    code,
  });

  if (!sent) {
    await prisma.passwordResetOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return { ok: false as const, error: 'Could not send verification email' };
  }

  return { ok: true as const, emailMasked: maskEmail(user.email) };
}

export async function verifyPasswordResetOtp(emailRaw: string, code: string) {
  const email = sanitizeEmail(emailRaw);
  const user = await prisma.user.findUnique({
    where: { email },
    select: userPreviewSelect,
  });

  if (!user) {
    return { ok: false as const, error: 'Incorrect verification code' };
  }

  const record = await prisma.passwordResetOtp.findUnique({ where: { userId: user.id } });
  if (!record) return { ok: false as const, error: 'Request a verification code first' };
  if (record.expiresAt < new Date()) {
    await prisma.passwordResetOtp.delete({ where: { userId: user.id } }).catch(() => {});
    return { ok: false as const, error: 'Code expired — request a new one' };
  }
  if (record.attempts >= RESET_OTP_MAX_ATTEMPTS) {
    return { ok: false as const, error: 'Too many incorrect attempts — request a new code' };
  }

  const valid = await bcrypt.compare(code.trim(), record.codeHash);
  if (!valid) {
    await prisma.passwordResetOtp.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: 'Incorrect verification code' };
  }

  await prisma.passwordResetOtp.delete({ where: { userId: user.id } });

  const resetToken = await createPasswordResetToken(user.id);
  return {
    ok: true as const,
    resetToken,
    user: {
      name: user.name,
      username: user.username,
      avatarColor: user.avatarColor,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function getPasswordResetPreview(resetToken: string) {
  const userId = await verifyPasswordResetToken(resetToken);
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: userPreviewSelect,
  });
}

export async function confirmPasswordReset(resetToken: string, password: string) {
  const userId = await verifyPasswordResetToken(resetToken);
  if (!userId) {
    return { ok: false as const, error: 'Reset link expired — start again from forgot password' };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.passwordResetOtp.deleteMany({ where: { userId } }),
  ]);

  return { ok: true as const };
}
