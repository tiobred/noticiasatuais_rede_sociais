export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    const [totalPosts, totalPublications, lastRun] = await Promise.all([
        prisma.post.count(),
        prisma.socialPublication.count({ where: { status: 'SUCCESS' } }),
        prisma.agentRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);

    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        stats: {
            totalPosts,
            totalPublications,
            lastRunStatus: lastRun?.status ?? 'none',
            lastRunAt: lastRun?.startedAt ?? null,
        },
    });
}
