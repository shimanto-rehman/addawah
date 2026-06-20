import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { deleteStoredAvatar } from './avatar-storage';
import {
  DELETE_OTP_MAX_ATTEMPTS,
  DELETE_OTP_MAX_SENDS,
  DELETE_OTP_RESEND_COOLDOWN_MS,
  DELETE_OTP_TTL_MS,
  generateDeletionOtpCode,
  maskEmail,
} from './account-deletion';
import { isEmailConfigured, sendDeletionOtpEmail } from './email';

export async function getDeletionStatus(_userId: string, email: string) {
  return {
    otpRequired: isEmailConfigured(),
    emailMasked: maskEmail(email),
  };
}

export async function sendAccountDeletionOtp(userId: string) {
  if (!isEmailConfigured()) {
    return { ok: false as const, error: 'Email verification is not configured on this server' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return { ok: false as const, error: 'User not found' };

  const existing = await prisma.accountDeletionOtp.findUnique({ where: { userId } });
  const now = Date.now();

  if (existing) {
    if (existing.sendCount >= DELETE_OTP_MAX_SENDS) {
      return { ok: false as const, error: 'Too many codes sent. Try again later or contact support.' };
    }
    if (now - existing.lastSentAt.getTime() < DELETE_OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil(
        (DELETE_OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000,
      );
      return { ok: false as const, error: `Wait ${waitSec}s before requesting another code` };
    }
  }

  const code = generateDeletionOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now + DELETE_OTP_TTL_MS);

  await prisma.accountDeletionOtp.upsert({
    where: { userId },
    create: {
      userId,
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

  const sent = await sendDeletionOtpEmail({
    to: user.email,
    name: user.name,
    code,
  });

  if (!sent) {
    await prisma.accountDeletionOtp.delete({ where: { userId } }).catch(() => {});
    return { ok: false as const, error: 'Could not send verification email' };
  }

  return { ok: true as const };
}

export async function verifyAccountDeletionOtp(userId: string, code: string) {
  const record = await prisma.accountDeletionOtp.findUnique({ where: { userId } });
  if (!record) return { ok: false as const, error: 'Request a verification code first' };
  if (record.expiresAt < new Date()) {
    await prisma.accountDeletionOtp.delete({ where: { userId } }).catch(() => {});
    return { ok: false as const, error: 'Code expired — request a new one' };
  }
  if (record.attempts >= DELETE_OTP_MAX_ATTEMPTS) {
    return { ok: false as const, error: 'Too many incorrect attempts — request a new code' };
  }

  const valid = await bcrypt.compare(code.trim(), record.codeHash);
  if (!valid) {
    await prisma.accountDeletionOtp.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: 'Incorrect verification code' };
  }

  await prisma.accountDeletionOtp.delete({ where: { userId } });
  return { ok: true as const };
}

export async function purgeUserAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (!user) return false;

  if (user.avatarUrl) {
    await deleteStoredAvatar(userId, user.avatarUrl).catch(() => {});
  }

  await prisma.user.delete({ where: { id: userId } });
  return true;
}
