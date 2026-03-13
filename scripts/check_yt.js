const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.systemConfig.findMany({
        where: { key: 'CHANNEL_YOUTUBE_SHORTS' }
    });
    
    console.log(`--- Records for CHANNEL_YOUTUBE_SHORTS ---`);
    console.log(JSON.stringify(configs, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
