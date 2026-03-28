import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up old DB configs for specific accounts...');
  const result = await prisma.systemConfig.deleteMany({
    where: {
      key: 'schedulerEnabled',
    },
  });
  console.log(`Deleted ${result.count} occurrences of schedulerEnabled.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
