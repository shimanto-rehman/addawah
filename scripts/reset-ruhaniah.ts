/**
 * Reset Ruhaniah data for a user.
 * Run: npx tsx scripts/reset-ruhaniah.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const USERNAME = 'shimanto_rehman';

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: USERNAME },
    select: { id: true, name: true },
  });

  if (!user) {
    console.error(`User "${USERNAME}" not found.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  const [taqwa, fahmResp, fahmProfile, barakah, dua, verse] = await Promise.all([
    prisma.taqwaPulse.deleteMany({ where: { userId: user.id } }),
    prisma.fahmResponse.deleteMany({ where: { userId: user.id } }),
    prisma.userFahmProfile.deleteMany({ where: { userId: user.id } }),
    prisma.barakahLog.deleteMany({ where: { userId: user.id } }),
    prisma.duaEntry.deleteMany({ where: { userId: user.id } }),
    prisma.ruhaniahVerse.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log('Deleted:');
  console.log(`  TaqwaPulse:      ${taqwa.count}`);
  console.log(`  FahmResponse:    ${fahmResp.count}`);
  console.log(`  UserFahmProfile: ${fahmProfile.count}`);
  console.log(`  BarakahLog:      ${barakah.count}`);
  console.log(`  DuaEntry:        ${dua.count}`);
  console.log(`  RuhaniahVerse:   ${verse.count}`);
  console.log('\nDone — Ruhaniah data reset for fresh testing.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
