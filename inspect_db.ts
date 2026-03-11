import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const tableNames = ['Post', 'SocialPublication', 'SystemConfig'];

    for (const tableName of tableNames) {
        console.log(`\n--- ${tableName} Table Info ---`);
        const columns: any = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position
        `);
        if (columns.length === 0) {
            console.log(`Table ${tableName} not found or no columns.`);
        } else {
            columns.forEach((c: any) => {
                console.log(`- ${c.column_name}: ${c.data_type}`);
            });
        }
    }
}

main().finally(() => prisma.$disconnect());
