'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, Trash2, History, RotateCcw } from 'lucide-react';

interface DashboardControlsProps {
    accounts: { id: string, name: string }[];
}

export function DashboardControls({ accounts }: DashboardControlsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isClearingLogs, setIsClearingLogs] = useState(false);

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const handleClearLogs = async () => {
        if (!confirm('Deseja limpar todo o histórico de execução e logs?')) return;
        setIsClearingLogs(true);
        try {
            const res = await fetch('/api/logs/clear', { method: 'POST' });
            if (res.ok) {
                router.refresh();
            } else {
                alert('Erro ao limpar logs');
            }
        } catch (error) {
            alert('Erro na requisição');
        } finally {
            setIsClearingLogs(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Deseja realmente limpar TODO o histórico de posts? Esta ação é irreversível.')) return;
        try {
            const res = await fetch('/api/posts/clear', { method: 'POST' });
            if (res.ok) {
                router.refresh();
            } else {
                alert('Erro ao limpar histórico');
            }
        } catch (error) {
            alert('Erro na requisição');
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between card animate-fade-in !py-6 !px-8 border-border-strong bg-bg-surface/50">
            <div className="flex flex-wrap gap-x-8 gap-y-4 items-center">
                <div className="flex items-center gap-3 text-text-primary text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                    <Filter className="w-5 h-5 text-purple-400" />
                    Central de Filtros
                </div>

                {/* Status Filter */}
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Status</label>
                   <select
                        onChange={(e) => updateFilter('status', e.target.value)}
                        value={searchParams.get('status') || ''}
                        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:border-purple-500/50 transition-all hover:border-purple-500/30 font-bold"
                    >
                        <option value="">Status: Todos</option>
                        <option value="PUBLISHED">Publicado</option>
                        <option value="PROCESSED">Processado</option>
                        <option value="FAILED">Falhou</option>
                    </select>
                </div>

                {/* Account Filter */}
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Contas</label>
                   <select
                        onChange={(e) => updateFilter('accountId', e.target.value)}
                        value={searchParams.get('accountId') || ''}
                        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:border-purple-500/50 transition-all hover:border-purple-500/30 font-bold"
                    >
                        <option value="">Contas: Todas</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {/* Channel Filter */}
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Canais</label>
                   <select
                        onChange={(e) => updateFilter('channel', e.target.value)}
                        value={searchParams.get('channel') || ''}
                        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2 text-sm text-text-primary outline-none focus:border-purple-500/50 transition-all hover:border-purple-500/30 font-bold"
                    >
                        <option value="">Canais: Todos</option>
                        <option value="INSTAGRAM_FEED">Instagram Feed</option>
                        <option value="INSTAGRAM_STORY">Instagram Story</option>
                        <option value="LINKEDIN">LinkedIn</option>
                        <option value="WHATSAPP">WhatsApp</option>
                    </select>
                </div>

                {(searchParams.get('status') || searchParams.get('accountId') || searchParams.get('channel')) && (
                    <button
                        onClick={() => router.push('?')}
                        className="mt-5 btn btn-secondary !py-2 !px-3 !rounded-xl !text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resetar
                    </button>
                )}
            </div>

            <div className="flex gap-3 w-full xl:w-auto mt-4 xl:mt-0 pt-6 xl:pt-0 border-t xl:border-t-0 border-border-subtle">
                <button
                    onClick={handleClearHistory}
                    className="flex-1 xl:flex-none btn btn-secondary !bg-red-500/5 !text-red-400 !border-red-500/10 hover:!bg-red-500/10 hover:!border-red-500/20 text-[10px] font-black uppercase tracking-widest px-6"
                >
                    <Trash2 className="w-4 h-4" />
                    Limpar Tudo
                </button>
                <button
                    onClick={handleClearLogs}
                    disabled={isClearingLogs}
                    className="flex-1 xl:flex-none btn btn-secondary text-[10px] font-black uppercase tracking-widest px-6"
                >
                    <History className="w-4 h-4" />
                    {isClearingLogs ? '...' : 'Reset Logs'}
                </button>
            </div>
        </div>
    );
}
