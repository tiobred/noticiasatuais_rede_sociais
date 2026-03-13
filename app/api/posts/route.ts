import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                publications: {
                    select: { channel: true, status: true, publishedAt: true },
                },
            },
        }),
        prisma.post.count(),
    ]);

    return NextResponse.json({ posts, total, page, limit });
}
