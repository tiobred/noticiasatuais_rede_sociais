
import prisma from './lib/db';
import * as fs from 'fs';

async function main() {
    const logFile = 'jornada_check_output.txt';
    let output = '--- Verificando Posts de @jornadatop ---\n';

    const posts = await prisma.post.findMany({
        where: {
            sourceName: { contains: 'jornadatop' }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    output += `Total encontrados: ${posts.length}\n`;
    posts.forEach(p => {
        output += `- ID: ${p.id} | Status: ${p.status} | AccountId: ${p.accountId} | Metadata: ${JSON.stringify(p.metadata)} | CreatedAt: ${p.createdAt}\n`;
    });

    fs.writeFileSync(logFile, output);
    console.log(`Dados salvos em ${logFile}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
