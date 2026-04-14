import { PrismaClient, RunStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const threshold = new Date(Date.now() - 30 * 60000); // 30 minutes
    const stuckRuns = await prisma.agentRun.findMany({
        where: {
            status: RunStatus.RUNNING,
            startedAt: { lt: threshold }
        }
    });

    console.log(`Found ${stuckRuns.length} stuck runs.`);

    for (const run of stuckRuns) {
        await prisma.agentRun.update({
            where: { id: run.id },
            data: {
                status: RunStatus.FAILED,
                error: 'Run timed out (process hung or crashed)',
                finishedAt: new Date()
            }
        });
        console.log(`Marked run ${run.id} for account ${run.accountId} as FAILED.`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
