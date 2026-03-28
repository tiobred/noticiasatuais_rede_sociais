import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  fs.writeFileSync('configs.json', JSON.stringify(configs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
