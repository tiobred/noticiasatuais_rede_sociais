import prisma from '../lib/db';

async function main() {
    const configs = await prisma.systemConfig.findMany({
        where: { key: 'SCHEDULER_TRIGGERS' }
    });
    console.log('\n--- SCHEDULER_TRIGGERS ---');
    console.log(JSON.stringify(configs, null, 2));
    console.log('---------------------------\n');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
