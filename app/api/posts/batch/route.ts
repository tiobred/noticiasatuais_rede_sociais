import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { ids } = await req.json();

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'IDs must be an array' }, { status: 400 });
        }

        const result = await prisma.post.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        return NextResponse.json({ deletedCount: result.count });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
