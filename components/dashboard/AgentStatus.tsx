import { CheckCircle, XCircle, Clock, Loader2, Bot, Activity } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';

interface AgentRunDisplay {
    id: string;
    agentName: string;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    postsFound: number;
    postsNew: number;
    postsPublished: number;
    error?: string | null;
    startedAt: string;
    finishedAt?: string | null;
}

const statusConfig = {
    RUNNING: { icon: Loader2, label: 'Ativo', badge: 'badge-brand', spin: true },
    SUCCESS: { icon: CheckCircle, label: 'Concluído', badge: 'badge-success', spin: false },
    FAILED: { icon: XCircle, label: 'Erro', badge: 'badge-failed', spin: false },
};

interface AgentStatusProps {
    runs: AgentRunDisplay[];
}

export function AgentStatus({ runs }: AgentStatusProps) {
    return (
        <div id="agent-status-panel" className="card !p-0 overflow-hidden flex flex-col h-full border-border-subtle hover:shadow-glow transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-surface">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Atividade de IA</h3>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_var(--green-400)]" />
            </div>

            <div className="flex-1 divide-y divide-border-subtle overflow-y-auto max-h-[600px] custom-scrollbar">
                {runs.length === 0 ? (
                    <div className="px-6 py-16 text-center animate-in">
                        <div className="w-12 h-12 rounded-2xl bg-bg-base border border-border-subtle flex items-center justify-center mx-auto mb-4">
                            <Bot className="w-6 h-6 text-text-muted" />
                        </div>
                        <p className="text-sm font-bold text-text-muted">Aguardando Execuções</p>
                    </div>
                ) : (
                    runs.map((run) => {
                        const cfg = statusConfig[run.status] || statusConfig.SUCCESS;
                        const StatusIcon = cfg.icon;

                        return (
                            <div key={run.id} className="px-6 py-4 hover:bg-bg-elevated/40 transition-colors group animate-in">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-1">Agent Name</span>
                                        <span className="text-sm font-bold text-text-primary truncate">{run.agentName}</span>
                                    </div>
                                    <span className={`badge ${cfg.badge} shrink-0`}>
                                        <StatusIcon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
                                        {cfg.label}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div className="bg-bg-base/50 p-2 rounded-lg border border-border-subtle text-center group-hover:border-purple-500/20 transition-all">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-0.5">Scanned</p>
                                        <p className="text-xs font-bold text-cyan-400">{run.postsFound}</p>
                                    </div>
                                    <div className="bg-bg-base/50 p-2 rounded-lg border border-border-subtle text-center group-hover:border-purple-500/20 transition-all">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-0.5">New</p>
                                        <p className="text-xs font-bold text-purple-400">{run.postsNew}</p>
                                    </div>
                                    <div className="bg-bg-base/50 p-2 rounded-lg border border-border-subtle text-center group-hover:border-purple-500/20 transition-all">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-0.5">Ready</p>
                                        <p className="text-xs font-bold text-green-400">{run.postsPublished}</p>
                                    </div>
                                </div>

                                {run.error && (
                                    <div className="mb-3 p-2 bg-red-400/5 border border-red-400/10 rounded-lg">
                                       <p className="text-[10px] text-red-400 font-medium leading-normal">{run.error}</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-subtle/50">
                                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                                    <p className="text-[10px] text-text-muted font-bold font-mono">
                                        {formatDateBR(new Date(run.startedAt))}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="p-4 bg-bg-surface border-t border-border-subtle">
               <button className="w-full btn btn-secondary text-[11px] font-black uppercase tracking-widest py-3">
                  Ver Log Completo
               </button>
            </div>
        </div>
    );
}
