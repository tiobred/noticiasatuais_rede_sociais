import prisma from '@/lib/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgentsTable } from '@/components/dashboard/AgentsTable';

export default async function AgentsPage() {
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50
    });

    return (
        <div className="flex h-screen bg-[#06060a] text-zinc-100 font-sans">
            <Sidebar />
            <div className="ml-60 flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-6 border-b border-zinc-800 bg-[#0a0a0f]">
                    <div>
                        <h1 className="text-2xl font-semibold text-white">Monitor de Agentes</h1>
                        <p className="text-sm text-zinc-400 mt-1">Logs de execução do pipeline completo.</p>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                    <AgentsTable initialRuns={runs} />
                </main>
            </div>
        </div>
    );
}
