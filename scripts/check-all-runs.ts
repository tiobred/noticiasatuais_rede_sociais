import prisma from '../lib/db';

async function main() {
    const runs = await prisma.agentRun.findMany({
        orderBy: {
            startedAt: 'desc'
        },
        take: 20
    });
    console.log(JSON.stringify(runs, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
