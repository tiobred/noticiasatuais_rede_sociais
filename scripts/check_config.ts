import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log('--- All Configs ---');
  for (const c of configs) {
    if (c.key === 'SCHEDULER_TRIGGERS') {
      console.log(`Key: ${c.key}`);
      console.log(`Value:`, c.value);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
