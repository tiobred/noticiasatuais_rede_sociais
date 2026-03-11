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
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-white/40 text-xs font-medium uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5" />
                    Filtros
                </div>

                {/* Status Filter */}
                <select
                    onChange={(e) => updateFilter('status', e.target.value)}
                    value={searchParams.get('status') || ''}
                    className="bg-surface-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-brand-500/50 transition-colors"
                >
                    <option value="">Todos os Status</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="PROCESSED">Processado</option>
                    <option value="FAILED">Falhou</option>
                </select>

                {/* Account Filter */}
                <select
                    onChange={(e) => updateFilter('accountId', e.target.value)}
                    value={searchParams.get('accountId') || ''}
                    className="bg-surface-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-brand-500/50 transition-colors"
                >
                    <option value="">Todas as Contas</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>

                {/* Channel Filter */}
                <select
                    onChange={(e) => updateFilter('channel', e.target.value)}
                    value={searchParams.get('channel') || ''}
                    className="bg-surface-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none focus:border-brand-500/50 transition-colors"
                >
                    <option value="">Todos os Canais</option>
                    <option value="INSTAGRAM_FEED">Instagram Feed</option>
                    <option value="INSTAGRAM_STORY">Instagram Story</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="WHATSAPP">WhatsApp</option>
                </select>

                {(searchParams.get('status') || searchParams.get('accountId') || searchParams.get('channel')) && (
                    <button
                        onClick={() => router.push('?')}
                        className="text-xs text-white/30 hover:text-brand-400 flex items-center gap-1 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Limpar Filtros
                    </button>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all"
                    title="Apaga todos os posts do banco de dados"
                >
                    <Trash2 className="w-4 h-4" />
                    Limpar Histórico
                </button>
                <button
                    onClick={handleClearLogs}
                    disabled={isClearingLogs}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all"
                    title="Limpa logs de execução e auditoria"
                >
                    <History className="w-4 h-4" />
                    {isClearingLogs ? 'Limpando...' : 'Limpar Logs'}
                </button>
            </div>
        </div>
    );
}
