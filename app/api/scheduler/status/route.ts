import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const brTime = new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'America/Sao_Paulo',
            hour12: false
        }).format(now);

        // Buscar logs de batimento do agendador
        const schedulerLogs = await prisma.auditLog.findMany({
            where: { action: 'SCHEDULER_CHECK' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        // Buscar os runs mais recentes para contexto
        const recentRuns = await prisma.agentRun.findMany({
            orderBy: { startedAt: 'desc' },
            take: 5
        });

        return NextResponse.json({
            serverTimeUtc: now.toISOString(),
            serverTimeBr: brTime,
            logs: schedulerLogs.map(l => ({
                id: l.id,
                time: l.createdAt,
                details: l.details
            })),
            recentRuns: recentRuns.map(r => ({
                id: r.id,
                agent: r.agentName,
                status: r.status,
                startedAt: r.startedAt
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
