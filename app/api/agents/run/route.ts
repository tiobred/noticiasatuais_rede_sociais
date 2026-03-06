import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents/orchestrator';

export async function POST() {
    try {
        console.log('[API] Pipeline iniciado via dashboard');
        const result = await runPipeline();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Erro desconhecido';
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Use POST para executar o pipeline' }, { status: 405 });
}
