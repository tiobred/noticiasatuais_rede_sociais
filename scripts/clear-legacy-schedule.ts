import prisma from '../lib/db';

async function main() {
    console.log('🧹 Removendo POSTING_TIMES legados do banco...\n');

    const deleted = await prisma.systemConfig.deleteMany({
        where: { key: 'POSTING_TIMES' }
    });

    console.log(`✅ ${deleted.count} registro(s) POSTING_TIMES removidos.`);

    // Confirmar o que sobrou de configs de agendamento
    const remaining = await prisma.systemConfig.findMany({
        where: {
            key: { in: ['SCHEDULER_TRIGGERS', 'POSTING_TIMES', 'CRON_SCHEDULE', 'POSTING_SCHEDULE'] }
        },
        orderBy: { accountId: 'asc' }
    });

    console.log('\n📋 Configs de agendamento restantes:');
    for (const c of remaining) {
        console.log(`  key=${c.key}, accountId=${c.accountId ?? '(global)'}, value=${JSON.stringify(c.value)}`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
