import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const accountId = 'Tiobred';
    const key = 'IG_MONITOR_TARGETS';

    const current = await prisma.systemConfig.findUnique({
        where: { key_accountId: { key, accountId } }
    });

    let targets = (current?.value as any[]) || [];
    if (!Array.isArray(targets)) targets = [];

    if (!targets.some((t: any) => t.username === 'jornadatop')) {
        targets.push({ username: 'jornadatop', minLikes: 50, minComments: 0 });
        await prisma.systemConfig.upsert({
            where: { key_accountId: { key, accountId } },
            update: { value: targets },
            create: { key, value: targets, accountId }
        });
        console.log('✅ @jornadatop adicionado aos alvos de Tiobred.');
    } else {
        console.log('ℹ️ @jornadatop já está nos alvos de Tiobred.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
