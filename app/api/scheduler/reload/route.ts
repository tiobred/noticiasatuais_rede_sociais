import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scheduler/reload
 * Registra no AuditLog que o scheduler deve recarregar configs.
 * O scheduler.ts faz polling do banco a cada ciclo, então este endpoint
 * serve apenas como sinalização / confirmação para a UI.
 */
export async function POST() {
    try {
        await prisma.auditLog.create({
            data: {
                action: 'SCHEDULER_RELOAD_REQUESTED',
                details: { time: new Date().toISOString(), message: 'Reload solicitado via UI' }
            }
        }).catch(() => {});

        return NextResponse.json({ 
            success: true,
            message: 'Scheduler recarregará as configurações no próximo ciclo (60s).'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/scheduler/reload
 * Limpa TODOS os SCHEDULER_TRIGGERS de todas as contas (reset total).
 * Use com cuidado — apaga todas as regras salvas.
 */
export async function DELETE() {
    try {
        const result = await prisma.systemConfig.deleteMany({
            where: { key: 'SCHEDULER_TRIGGERS' }
        });

        await prisma.auditLog.create({
            data: {
                action: 'SCHEDULER_TRIGGERS_CLEARED',
                details: { count: result.count, time: new Date().toISOString() }
            }
        }).catch(() => {});

        return NextResponse.json({ 
            success: true, 
            deleted: result.count,
            message: `${result.count} regras de agendamento foram apagadas.`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
