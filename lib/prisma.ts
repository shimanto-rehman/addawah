import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Use Neon's pooled DATABASE_URL in production (hostname contains "-pooler").
 * DIRECT_URL is for migrations only. Optional pool tuning on DATABASE_URL:
 *   ?connection_limit=5&pool_timeout=10
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
