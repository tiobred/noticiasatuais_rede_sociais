import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up old SCHEDULER_TRIGGERS for specific accounts...');
  const result = await prisma.systemConfig.deleteMany({
    where: {
      key: 'SCHEDULER_TRIGGERS',
      accountId: { not: 'global' },
    },
  });
  console.log(`Deleted ${result.count} per-account trigger overrides. Now only global triggers will apply.`);
  
  // also, in case global had some garbage format, let's reset it to [] if the user said "está sem nenhum agendamento"
  // but configs.json already shows global is `[]`.
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
