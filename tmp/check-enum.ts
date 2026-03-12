import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const result: any[] = await prisma.$queryRawUnsafe(`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'Channel';
        `);
        console.log('Enum labels found:', result.map(r => r.enumlabel));
    } catch (e) {
        console.error('Error fetching enum labels:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
