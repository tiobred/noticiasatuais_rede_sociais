import prisma from '../lib/db';
import * as fs from 'fs';

async function main() {
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
    });

    let output = `Recent Agent Runs:\n`;
    runs.forEach(r => {
        output += `- [${r.id}] ${r.agentName} | Status: ${r.status} | Found: ${r.postsFound} | New: ${r.postsNew} | Pub: ${r.postsPublished}\n`;
        if (r.error) output += `  Error: ${r.error}\n`;
        output += `  Started: ${r.startedAt}\n`;
    });

    fs.writeFileSync('runs_debug.txt', output);
}

main().catch(console.error).finally(() => prisma.$disconnect());
