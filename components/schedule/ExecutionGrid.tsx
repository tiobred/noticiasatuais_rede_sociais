'use client';

import { CheckCircle, XCircle, Loader2, Bot, AlertCircle, Clock, Zap } from 'lucide-react';
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
        <div className="card !p-0 overflow-hidden border-border-strong bg-bg-surface/50">
            <div className="flex items-center justify-between px-8 py-6 border-b border-border-subtle bg-bg-elevated/20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-glow">
                        <Zap className="w-6 h-6 text-purple-400 fill-current" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Histórico de Execução</h3>
                        <p className="text-sm text-text-muted font-medium">Logs detalhados das últimas operações de IA</p>
                    </div>
                </div>
                {loading && (
                    <div className="badge badge-brand animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        SINCRONIZANDO
                    </div>
                )}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-border-subtle bg-bg-elevated/40">
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Agente Operador</th>
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Status</th>
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Timestamp</th>
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Performance</th>
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Métricas</th>
                            <th className="px-8 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Relatório de Erro</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {runs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-8 py-24 text-center">
                                    <div className="flex flex-col items-center opacity-20">
                                        <Bot className="w-16 h-16 mb-4 text-text-muted" />
                                        <p className="text-lg font-black uppercase tracking-widest text-text-muted">Database Empty</p>
                                    </div>
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
                                    <tr key={run.id} className="group hover:bg-bg-elevated/40 transition-all border-l-2 border-l-transparent hover:border-l-purple-500">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-text-primary group-hover:text-purple-400 transition-colors uppercase tracking-tight">{run.agentName}</span>
                                                <span className="text-[10px] font-bold text-text-muted font-mono tracking-tighter opacity-50"># {run.id.slice(0, 12)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`badge ${
                                                isRunning ? 'badge-brand' : isSuccess ? 'badge-success' : 'badge-failed'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-white animate-pulse' : isSuccess ? 'bg-green-400' : 'bg-red-400'}`} />
                                                {isRunning ? 'Ativo' : isSuccess ? 'OK' : 'Falhou'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-text-primary">{formatDateBR(new Date(run.startedAt))}</span>
                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-0.5">{new Date(run.startedAt).toLocaleTimeString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-text-muted" />
                                                <span className="text-[11px] font-black text-text-primary font-mono bg-bg-base px-2.5 py-1 rounded-lg border border-border-subtle">
                                                    {duration !== null ? `${duration}s` : isRunning ? '...' : '--'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Found</span>
                                                    <span className="text-xs font-bold text-cyan-400">{run.postsFound}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Sent</span>
                                                    <span className="text-xs font-bold text-purple-400">{run.postsPublished}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {run.error ? (
                                                <div className="group/error relative">
                                                    <div className="flex items-center gap-2 text-red-400 bg-red-400/5 px-3 py-1.5 rounded-xl border border-red-400/10 max-w-[180px] cursor-help transition-all hover:bg-red-400/10">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="text-[10px] font-bold truncate uppercase tracking-tighter">{run.error}</span>
                                                    </div>
                                                    
                                                    <div className="absolute bottom-full left-0 mb-4 hidden group-hover/error:block z-50 w-80 p-5 bg-bg-surface border border-red-500/20 rounded-2xl shadow-glow backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-2">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                            <p className="text-[10px] uppercase font-black text-red-400 tracking-[0.2em]">Critical System Error</p>
                                                        </div>
                                                        <p className="text-xs text-text-primary font-mono break-words leading-relaxed bg-bg-base/50 p-3 rounded-xl border border-border-subtle font-medium">
                                                            {run.error}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Normal</span>
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
