import { prisma } from '../lib/prisma';
import { seedSampleNotifications } from '../lib/notifications';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npx tsx scripts/seed-notifications-for-user.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const result = await seedSampleNotifications(user.id);
  const count = await prisma.notification.count({ where: { userId: user.id } });

  console.log(`Seeded ${result.created} sample notifications for ${user.name} (${user.email})`);
  console.log(`Total notifications in database for this user: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
