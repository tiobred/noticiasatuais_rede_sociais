import prisma from '../lib/db';
import { writeFileSync } from 'fs';

async function main() {
    const out: Record<string, unknown>[] = [];

    const configs = await prisma.systemConfig.findMany({
        where: { key: 'SCHEDULER_TRIGGERS' },
        orderBy: { updatedAt: 'desc' }
    });

    const others = await prisma.systemConfig.findMany({
        where: {
            key: { in: ['CRON_SCHEDULE', 'POSTING_TIMES', 'SCHEDULER_ENABLED', 'POSTING_SCHEDULE'] }
        },
        orderBy: { accountId: 'asc' }
    });

    const result = { scheduler_triggers: configs, other_schedule_configs: others };
    writeFileSync('C:/temp/triggers-dump.json', JSON.stringify(result, null, 2), 'utf8');
    console.log('Salvo em C:/temp/triggers-dump.json');
    await prisma.$disconnect();
}

main().catch(console.error);
