'use client';

import { Bell, RefreshCw, Menu } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateBR } from '@/lib/utils';
import { useSidebar } from './SidebarContext';
import { NewsTicker } from '../dashboard/NewsTicker';

interface TopBarProps {
    title: string;
    subtitle?: string;
    news?: string;
}

export function TopBar({ title, subtitle, news }: TopBarProps) {
    const [running, setRunning] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [runStatus, setRunStatus] = useState<'idle' | 'ok' | 'error'>('idle');
    const router = useRouter();
    const { toggleSidebar } = useSidebar();

    const handleRun = async () => {
        if (running) return;
        setRunning(true);
        setRunStatus('idle');
        try {
            const res = await fetch('/api/agents/run', { method: 'POST' });
            setRunStatus(res.ok ? 'ok' : 'error');
            setLastRun(new Date());
            if (res.ok) {
                router.refresh();
            }
        } catch {
            setRunStatus('error');
        } finally {
            setRunning(false);
        }
    };

    return (
        <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden w-9 h-9 rounded-lg glass glass-hover flex items-center justify-center text-white/70 hover:text-white"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-base font-semibold text-white">{title}</h1>
                    {subtitle && <p className="text-xs text-white/40 hidden sm:block">{subtitle}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <NewsTicker news={news} />

                {lastRun && (
                    <span className="text-xs text-white/30 font-mono hidden sm:block">
                        Último run: {formatDateBR(lastRun)}
                    </span>
                )}

                <button
                    id="btn-run-pipeline"
                    onClick={handleRun}
                    disabled={running}
                    title={runStatus === 'ok' ? 'Pipeline executado!' : runStatus === 'error' ? 'Erro ao executar' : ''}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${running
                            ? 'bg-brand-600/50 text-brand-300 cursor-not-allowed'
                            : runStatus === 'error'
                                ? 'bg-red-600/70 text-white hover:opacity-90'
                                : 'bg-gradient-brand text-white hover:opacity-90 hover:shadow-glow-blue active:scale-95'
                        }`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
                    {running ? 'Executando...' : runStatus === 'ok' ? '✓ Executado' : 'Executar Pipeline'}
                </button>

                <button
                    id="btn-notifications"
                    className="w-9 h-9 rounded-lg glass glass-hover flex items-center justify-center text-white/40 hover:text-white"
                >
                    <Bell className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
