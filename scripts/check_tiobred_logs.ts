import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Detailed logs for tiobred:");
    const logs = await prisma.auditLog.findMany({
        where: {
            details: {
                path: ['accountId'],
                equals: 'tiobred'
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    console.dir(logs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
