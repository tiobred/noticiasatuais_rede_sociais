import { PrismaClient } from '@prisma/client';
import fs from 'fs';

async function main() {
    const prisma = new PrismaClient();
    try {
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { contains: 'CHANNEL' }
            },
            orderBy: [
                { accountId: 'asc' },
                { key: 'asc' }
            ]
        });
        let output = '--- CHANNEL SETTINGS IN DB ---\n';
        configs.forEach(c => {
            output += `ACC:${c.accountId}|KEY:${c.key}|VAL:${JSON.stringify(c.value)}\n`;
        });
        fs.writeFileSync('c:/Users/Anderson/noticias_redes_sociais/noticiasatuais_rede_sociais/tmp/final_output.txt', output, 'utf8');
        console.log('Done.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
