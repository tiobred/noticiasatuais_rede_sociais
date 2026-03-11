import prisma from '../lib/db';

async function main() {
    const runs = await prisma.agentRun.findMany({
        where: {
            agentName: 'orchestrator_promo'
        },
        orderBy: {
            startedAt: 'desc'
        },
        take: 5
    });
    console.log(JSON.stringify(runs, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
