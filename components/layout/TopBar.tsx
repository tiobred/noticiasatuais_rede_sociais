'use client';

import { Bell, RefreshCw, Menu, Zap } from 'lucide-react';
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
            if (res.ok) router.refresh();
        } catch {
            setRunStatus('error');
        } finally {
            setRunning(false);
        }
    };

    return (
        <header className="sticky top-0 z-30 h-[64px] flex items-center justify-between px-4 md:px-8 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
            {/* Left: Menu + Title */}
            <div className="flex items-center gap-4 min-w-0">
                <button
                    id="btn-mobile-menu"
                    onClick={toggleSidebar}
                    className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all flex-shrink-0 border border-border-subtle"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-text-primary leading-none tracking-tight truncate">{title}</h1>
                    {subtitle && (
                        <p className="text-xs text-text-secondary truncate hidden sm:block mt-1 font-medium">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center: News Ticker (expanded) */}
            <div className="hidden lg:flex flex-1 max-w-lg mx-12">
                <div className="w-full glass rounded-full px-4 py-1.5 flex items-center gap-3">
                   <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest flex-shrink-0">Live</span>
                   <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
                   <NewsTicker news={news} />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4 flex-shrink-0">
                {/* Last run info */}
                {lastRun && (
                    <span className="text-[11px] text-text-muted font-bold hidden md:block">
                        LIT: {lastRun.toLocaleTimeString('pt-BR')}
                    </span>
                )}

                {/* Run Pipeline button */}
                <button
                    id="btn-run-pipeline"
                    onClick={handleRun}
                    disabled={running}
                    className={`
                        btn btn-md
                        ${running
                            ? 'bg-bg-elevated text-text-muted cursor-not-allowed border-none'
                            : runStatus === 'error'
                                ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                                : runStatus === 'ok'
                                    ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                                    : 'btn-primary'
                        }
                    `}
                >
                    {running
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <Zap className="w-4 h-4" />
                    }
                    <span className="hidden sm:inline">
                        {running ? 'Executando...' : runStatus === 'ok' ? 'Concluído' : runStatus === 'error' ? 'Falhou' : 'Executar'}
                    </span>
                </button>

                {/* Notifications */}
                <button
                    id="btn-notifications"
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all border border-border-subtle"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-pink-500 ring-4 ring-bg-base" />
                </button>
            </div>
        </header>
    );
}
