'use client';

import { CheckCircle, XCircle, Loader2, Bot, AlertCircle } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';

export interface ExecutionRun {
    id: string;
    agentName: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    startedAt: string;
    finishedAt?: string | null;
    postsFound: number;
    postsPublished: number;
    error?: string | null;
}

interface ExecutionGridProps {
    runs: ExecutionRun[];
    loading?: boolean;
}

export function ExecutionGrid({ runs, loading }: ExecutionGridProps) {
    return (
        <div className="glass rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Bot className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Histórico de Execução</h3>
                        <p className="text-sm text-white/40">Logs em tempo real das últimas rodadas do pipeline</p>
                    </div>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-brand-400 text-xs font-mono">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        ATUALIZANDO
                    </div>
                )}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.03]">
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Agente / ID</th>
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Status</th>
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Início</th>
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Duração</th>
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold text-center">Posts</th>
                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/40 font-bold">Detalhes de Erro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {runs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center text-white/20 italic text-sm">
                                    Nenhuma execução registrada no banco de dados.
                                </td>
                            </tr>
                        ) : (
                            runs.map((run) => {
                                const isSuccess = run.status === 'SUCCESS';
                                const isFailed = run.status === 'FAILED';
                                const isRunning = run.status === 'RUNNING';

                                const duration = run.finishedAt 
                                    ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
                                    : null;

                                return (
                                    <tr key={run.id} className="hover:bg-white/[0.04] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-white font-medium group-hover:text-brand-400 transition-colors">{run.agentName}</span>
                                                <span className="text-[10px] text-white/20 font-mono tracking-tighter">ID: {run.id.slice(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-brand-500 animate-pulse' : isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                <span className={`text-[11px] font-bold uppercase tracking-wider 
                                                    ${isSuccess ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-brand-400'}`}>
                                                    {run.status === 'RUNNING' ? 'EXECUTANDO' : run.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-white/70 font-medium">{formatDateBR(new Date(run.startedAt))}</span>
                                                <span className="text-[10px] text-white/30 font-mono">{new Date(run.startedAt).toLocaleTimeString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                {duration !== null ? `${duration}s` : isRunning ? '--' : '--'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-white/20 uppercase font-bold">Vistos</span>
                                                    <span className="text-sm text-white font-mono">{run.postsFound}</span>
                                                </div>
                                                <div className="w-px h-6 bg-white/10" />
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] text-emerald-500/40 uppercase font-bold">Publ.</span>
                                                    <span className="text-sm text-emerald-400 font-mono">{run.postsPublished}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.error ? (
                                                <div className="group/error relative flex items-center gap-2 text-red-400/80 bg-red-400/5 p-2 rounded border border-red-400/10 max-w-[200px]">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="text-[11px] truncate">{run.error}</span>
                                                    
                                                    {/* Tooltip customizada premium */}
                                                    <div className="absolute bottom-full left-0 mb-3 hidden group-hover/error:block z-50 w-72 p-4 bg-gray-950 border border-red-500/30 rounded-xl shadow-2xl backdrop-blur-xl">
                                                        <p className="text-[10px] uppercase font-bold text-red-500 mb-2 tracking-widest">Stacktrace / Erro</p>
                                                        <p className="text-xs text-red-100 font-mono break-words leading-relaxed">
                                                            {run.error}
                                                        </p>
                                                        <div className="absolute top-full left-4 w-3 h-3 bg-gray-950 border-r border-b border-red-500/30 rotate-45 -translate-y-1.5" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 opacity-20 group-hover:opacity-40 transition-opacity">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">OK</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
