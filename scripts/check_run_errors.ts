import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Audit Logs for promo and tiobred:");
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
    });
    console.dir(logs, { depth: null });

    const pubErrs = await prisma.socialPublication.findMany({
        where: {
            status: 'FAILED',
            createdAt: { gte: new Date(Date.now() - 3600000) }
        }
    });
    console.log("\nRecent social publication failures:");
    console.dir(pubErrs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
