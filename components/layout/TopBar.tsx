'use client';

import { Bell, RefreshCw, Menu, ChevronDown, Zap } from 'lucide-react';
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
        <header className="sticky top-0 z-30 h-[60px] flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06]"
            style={{ background: 'rgba(10, 15, 30, 0.92)', backdropFilter: 'blur(20px)' }}
        >
            {/* Left: Menu + Title */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    id="btn-mobile-menu"
                    onClick={toggleSidebar}
                    className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 flex-shrink-0"
                >
                    <Menu className="w-4.5 h-4.5" />
                </button>

                <div className="min-w-0">
                    <h1 className="text-[15px] font-semibold text-white leading-tight truncate">{title}</h1>
                    {subtitle && (
                        <p className="text-[11px] text-white/35 truncate hidden sm:block leading-tight mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Center: News Ticker (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 max-w-sm mx-6">
                <NewsTicker news={news} />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Last run info */}
                {lastRun && (
                    <span className="text-[11px] text-white/25 font-mono hidden md:block">
                        {formatDateBR(lastRun)}
                    </span>
                )}

                {/* Run Pipeline button */}
                <button
                    id="btn-run-pipeline"
                    onClick={handleRun}
                    disabled={running}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                        transition-all duration-200 select-none
                        ${running
                            ? 'bg-brand-600/30 text-brand-300 cursor-not-allowed'
                            : runStatus === 'error'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                : runStatus === 'ok'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-gradient-to-r from-brand-500 to-emerald-500 text-white shadow-sm shadow-brand-500/20 hover:opacity-90 hover:shadow-brand-500/30 hover:-translate-y-px active:scale-95'
                        }
                    `}
                >
                    {running
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Zap className="w-3 h-3" />
                    }
                    <span className="hidden sm:inline">
                        {running ? 'Executando...' : runStatus === 'ok' ? '✓ Executado' : runStatus === 'error' ? 'Erro' : 'Executar'}
                    </span>
                </button>

                {/* Notifications */}
                <button
                    id="btn-notifications"
                    className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-all duration-200"
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 ring-2 ring-surface-900" />
                </button>
            </div>
        </header>
    );
}
