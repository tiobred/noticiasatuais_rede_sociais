import { CheckCircle, XCircle, Clock, Loader2, Bot } from 'lucide-react';
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
    RUNNING: { icon: Loader2, label: 'Executando', cls: 'badge-running', spin: true },
    SUCCESS: { icon: CheckCircle, label: 'Sucesso', cls: 'badge-success', spin: false },
    FAILED: { icon: XCircle, label: 'Falhou', cls: 'badge-failed', spin: false },
};

interface AgentStatusProps {
    runs: AgentRunDisplay[];
}

export function AgentStatus({ runs }: AgentStatusProps) {
    return (
        <div id="agent-status-panel" className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-semibold text-white">Agentes</h3>
                </div>
                <span className="text-xs text-white/30 font-mono">{runs.length} runs</span>
            </div>

            <div className="divide-y divide-white/5">
                {runs.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                        <Clock className="w-6 h-6 text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-white/30">Nenhum run ainda</p>
                    </div>
                ) : (
                    runs.map((run) => {
                        const cfg = statusConfig[run.status];
                        const StatusIcon = cfg.icon;

                        return (
                            <div key={run.id} className="px-5 py-3 hover:bg-white/2 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${run.status === 'SUCCESS' ? 'text-emerald-400' :
                                            run.status === 'FAILED' ? 'text-red-400' : 'text-brand-400'
                                            } ${cfg.spin ? 'animate-spin' : ''}`} />
                                        <span className="text-xs text-white/60 font-mono truncate">{run.agentName}</span>
                                    </div>
                                    <span className={cfg.cls}>{cfg.label}</span>
                                </div>

                                <div className="flex gap-3 text-xs text-white/30 font-mono">
                                    <span>🔍 {run.postsFound}</span>
                                    <span>✨ {run.postsNew}</span>
                                    <span>📤 {run.postsPublished}</span>
                                </div>

                                {run.error && (
                                    <p className="text-xs text-red-400/70 mt-1 truncate">{run.error}</p>
                                )}

                                <p className="text-xs text-white/20 mt-1 font-mono">
                                    {formatDateBR(new Date(run.startedAt))}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
