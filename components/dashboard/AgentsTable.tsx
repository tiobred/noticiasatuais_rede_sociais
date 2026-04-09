'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeleteRunButton } from './DeleteRunButton';

type Run = {
    id: string;
    startedAt: Date;
    status: string;
    error: string | null;
    postsFound: number;
    postsNew: number;
    postsPublished: number;
    finishedAt: Date | null;
};

export function AgentsTable({ initialRuns }: { initialRuns: Run[] }) {
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const filteredRuns = initialRuns.filter(run => {
        if (filterStatus === 'ALL') return true;
        return run.status === filterStatus;
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="text-sm text-zinc-400 font-medium whitespace-nowrap">Filtrar por Status:</label>
                    <select
                        className="bg-[#161622] border border-zinc-800 text-zinc-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 w-full sm:w-auto"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="SUCCESS">Sucesso</option>
                        <option value="FAILED">Falha</option>
                        <option value="RUNNING">Executando</option>
                    </select>
                </div>
                <div className="text-sm text-zinc-500 font-medium px-1">
                    Mostrando {filteredRuns.length} registro(s)
                </div>
            </div>

            <div className="bg-[#12121a] rounded-xl border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-[#161622] text-zinc-400 text-sm">
                                <th className="p-4 font-medium min-w-[120px]">Data</th>
                                <th className="p-4 font-medium min-w-[140px]">Status</th>
                                <th className="p-4 font-medium">Encontrados</th>
                                <th className="p-4 font-medium">Novos</th>
                                <th className="p-4 font-medium">Publicados</th>
                                <th className="p-4 font-medium">Duração</th>
                                <th className="p-4 font-medium text-right min-w-[100px]">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRuns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                                        Nenhum histórico de execução encontrado para este filtro.
                                    </td>
                                </tr>
                            ) : (
                                filteredRuns.map(run => {
                                    const duration = run.finishedAt
                                        ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                                        : null;

                                    return (
                                        <tr key={run.id} className="border-b border-zinc-800/50 hover:bg-[#161622] transition-colors">
                                            <td className="p-4 whitespace-nowrap text-zinc-300">
                                                {format(new Date(run.startedAt), "dd MMM HH:mm:ss", { locale: ptBR })}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`text-xs px-2 py-1 rounded font-medium flex items-center w-max gap-1.5 ${run.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    run.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                                        'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {run.status === 'RUNNING' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                                    {run.status}
                                                </span>
                                                {run.error && <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={run.error}>{run.error}</p>}
                                            </td>
                                            <td className="p-4 font-mono text-sm text-zinc-300">{run.postsFound}</td>
                                            <td className="p-4 font-mono text-sm text-zinc-300">{run.postsNew}</td>
                                            <td className="p-4 font-mono text-sm text-emerald-400">{run.postsPublished}</td>
                                            <td className="p-4 text-zinc-400 text-sm">
                                                {duration !== null ? `${duration}s` : '-'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end">
                                                    <DeleteRunButton id={run.id} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
