import prisma from '../lib/db';

async function main() {
    const pubs = await prisma.socialPublication.findMany({
        where: {
            accountId: 'promo'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10,
        include: {
            post: true
        }
    });
    console.log(JSON.stringify(pubs, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
