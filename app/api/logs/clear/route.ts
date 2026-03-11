import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';

export async function POST() {
    try {
        // Clear AuditLog and AgentRun
        const [audit, runs] = await Promise.all([
            prisma.auditLog.deleteMany({}),
            prisma.agentRun.deleteMany({})
        ]);
        revalidatePath('/dashboard');

        return NextResponse.json({
            auditDeleted: audit.count,
            runsDeleted: runs.count
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
