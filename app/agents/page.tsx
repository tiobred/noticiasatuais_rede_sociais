import prisma from '@/lib/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgentsTable } from '@/components/dashboard/AgentsTable';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { MobileMenuToggle } from '@/components/layout/MobileMenuToggle';

export default async function AgentsPage() {
    const runs = await prisma.agentRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 50
    });

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-[#06060a] text-zinc-100 font-sans">
                <Sidebar />
                <div className="md:ml-60 w-full flex-1 flex flex-col overflow-hidden">
                    <header className="flex justify-between items-center p-4 md:p-6 border-b border-zinc-800 bg-[#0a0a0f]">
                        <div className="flex items-center gap-3">
                            <MobileMenuToggle />
                            <div>
                                <h1 className="text-xl md:text-2xl font-semibold text-white">Monitor de Agentes</h1>
                                <p className="text-xs md:text-sm text-zinc-400 mt-1 hidden sm:block">Logs de execução do pipeline completo.</p>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-6 w-full">
                        <AgentsTable initialRuns={runs} />
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
