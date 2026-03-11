'use client';

import React from 'react';

interface NewsTickerProps {
    news?: string;
}

export function NewsTicker({ news }: NewsTickerProps) {
    if (!news) return null;

    return (
        <div className="flex items-center gap-3 glass px-4 py-1.5 rounded-full max-w-[400px] border-brand-blue/20">
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Notícia da Hora</span>
            </div>

            <div className="h-4 w-[1px] bg-white/10 shrink-0" />

            <div className="news-ticker-container flex-1">
                <div className="news-ticker-content">
                    <span className="text-xs font-medium text-slate-200">
                        {news}
                    </span>
                </div>
            </div>
        </div>
    );
}
