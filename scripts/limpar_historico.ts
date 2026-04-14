import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    await prisma.agentRun.deleteMany();
    await prisma.auditLog.deleteMany();
    console.log("Histórico de AgentRun e AuditLog limpos.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
