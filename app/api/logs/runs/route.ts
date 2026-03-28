import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        const runs = await prisma.agentRun.findMany({
            orderBy: { startedAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ runs });
    } catch (error) {
        console.error('Error fetching agent runs:', error);
        return NextResponse.json({ error: 'Failed to fetch agent runs' }, { status: 500 });
    }
}
