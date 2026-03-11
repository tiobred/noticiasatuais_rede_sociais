import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Tentando apagar posts...");
        const result = await prisma.post.deleteMany({});
        console.log("Posts apagados:", result.count);

        console.log("Tentando apagar logs e runs...");
        const resultLogs = await prisma.auditLog.deleteMany({});
        const resultRuns = await prisma.agentRun.deleteMany({});
        console.log("Logs apagados:", resultLogs.count);
        console.log("Runs apagados:", resultRuns.count);

    } catch (e: any) {
        console.error("Erro ao apagar:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
