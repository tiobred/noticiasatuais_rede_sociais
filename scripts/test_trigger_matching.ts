import prisma from '../lib/db';
import cronParser from 'cron-parser';

function matchesCron(expression: string): boolean {
    try {
        const interval = cronParser.parseExpression(expression, { tz: 'America/Sao_Paulo' });
        const now = new Date();
        const prev = interval.prev().toDate();
        const diffMs = Math.abs(now.getTime() - prev.getTime());
        return diffMs < 58000;
    } catch (e) {
        return false;
    }
}

async function main() {
    const brTime = "14:40"; // Simulando horário alvo
    const [brH, brM] = brTime.split(':').map(Number);

    const configs = await prisma.systemConfig.findMany({
        where: { key: 'SCHEDULER_TRIGGERS' }
    });

    const globalTriggersObj = configs.find(c => c.accountId === 'global');
    const localTriggersObj = configs.find(c => c.accountId === 'tiobred');

    const parseTriggers = (val: any) => {
        if (!val) return [];
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        return Array.isArray(parsed) ? parsed : [parsed];
    };

    const triggers = [
        ...parseTriggers(globalTriggersObj?.value),
        ...parseTriggers(localTriggersObj?.value)
    ];

    console.log(`\n--- Simulação para 14:40 ---`);
    for (const trigger of triggers) {
        let match = false;
        if (trigger.type === 'minutes') {
            const mins = parseInt(trigger.value);
            match = (mins > 0 && brM % mins === 0);
        } else if (trigger.type === 'hours') {
            const hrs = parseInt(trigger.value);
            match = (hrs > 0 && brH % hrs === 0 && brM === 0);
        } else if (trigger.type === 'days') {
            match = (trigger.value === brTime);
        } else if (trigger.type === 'cron') {
             // Cron match depende do 'now' real
            match = matchesCron(trigger.value);
        }
        console.log(`Trigger: [${trigger.type}] -> ${trigger.value} | Match: ${match}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
