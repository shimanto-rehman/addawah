import { PrismaClient, Prayer } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  SEED_FRIEND_USERNAMES,
  SEED_USER_PASSWORD,
  SEED_USER_PROFILES,
  isSeedUserEmail,
} from '../lib/seed-users';
import { startOfDay } from '../lib/salah-utils';

const prisma = new PrismaClient();

async function upsertSeedUsers() {
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);
  const users: Record<string, { id: string; username: string | null }> = {};

  for (const profile of SEED_USER_PROFILES) {
    const user = await prisma.user.upsert({
      where: { email: profile.email },
      create: {
        name: profile.name,
        username: profile.username,
        email: profile.email,
        mobile: profile.mobile,
        passwordHash,
        avatarColor: profile.avatarColor,
        city: profile.city,
        country: profile.country,
        goldCoins: profile.goldCoins,
      },
      update: {
        name: profile.name,
        username: profile.username,
        avatarColor: profile.avatarColor,
        city: profile.city,
        country: profile.country,
        goldCoins: profile.goldCoins,
      },
      select: { id: true, username: true },
    });
    users[profile.username] = user;
  }

  return users;
}

async function resolveDevUser() {
  const email = process.env.SEED_DEV_EMAIL?.trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`SEED_DEV_EMAIL not found: ${email}`);
    return user;
  }

  const user = await prisma.user.findFirst({
    where: { NOT: { email: { endsWith: '@addawah.dev' } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    throw new Error(
      'No dev user found. Register an account first, or set SEED_DEV_EMAIL in .env',
    );
  }

  return user;
}

async function linkFriends(
  devUserId: string,
  seedUsers: Record<string, { id: string; username: string | null }>,
) {
  for (const username of SEED_FRIEND_USERNAMES) {
    const friend = seedUsers[username];
    if (!friend) continue;

    await prisma.friendship.upsert({
      where: {
        userId_friendId: { userId: devUserId, friendId: friend.id },
      },
      create: {
        userId: devUserId,
        friendId: friend.id,
        status: 'ACCEPTED',
      },
      update: { status: 'ACCEPTED' },
    });
  }
}

async function seedTodaySalah(
  seedUsers: Record<string, { id: string; username: string | null }>,
) {
  const today = startOfDay(new Date());

  const prayedToday: Partial<Record<string, Prayer[]>> = {
    fatima_k: ['FAJR', 'DHUHR'],
    yusuf_a: ['FAJR'],
    ibrahim_m: ['FAJR'],
  };

  for (const [username, prayers] of Object.entries(prayedToday)) {
    const user = seedUsers[username];
    if (!user || !prayers?.length) continue;

    for (const prayer of prayers) {
      await prisma.salahRecord.upsert({
        where: {
          userId_date_prayer_kind_unit: {
            userId: user.id,
            date: today,
            prayer,
            kind: 'FARD',
            unit: 0,
          },
        },
        create: {
          userId: user.id,
          date: today,
          prayer,
          kind: 'FARD',
          unit: 0,
          completed: true,
        },
        update: { completed: true },
      });
    }
  }
}

async function main() {
  const seedUsers = await upsertSeedUsers();
  const devUser = await resolveDevUser();

  if (isSeedUserEmail(devUser.email)) {
    throw new Error('SEED_DEV_EMAIL must be your real account, not a demo user');
  }

  await linkFriends(devUser.id, seedUsers);
  await seedTodaySalah(seedUsers);

  console.log(`Seeded ${SEED_USER_PROFILES.length} demo users (@addawah.dev)`);
  console.log(`Linked ${SEED_FRIEND_USERNAMES.length} friends to ${devUser.email}`);
  console.log(`Demo password: ${SEED_USER_PASSWORD}`);
  console.log(`Suggestions only: aisha_r (search & connect to test invites)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
