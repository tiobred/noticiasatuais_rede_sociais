export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { TopBar } from '@/components/layout/TopBar';
import { AgentsTable } from '@/components/dashboard/AgentsTable';
import { Database } from 'lucide-react';

export default async function AgentsPage() {
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50
    });

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar 
                title="Monitor de Agentes" 
                subtitle="Logs de execução do pipeline completo"
            />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                            <Database className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">System Logs</h2>
                            <p className="text-sm text-text-muted font-medium">Últimas 50 execuções do sistema</p>
                        </div>
                    </div>

                    <div className="card !p-0 overflow-hidden border-border-strong bg-bg-surface/50">
                        <AgentsTable initialRuns={runs} />
                    </div>
                </div>
            </main>
        </div>
    );
}
