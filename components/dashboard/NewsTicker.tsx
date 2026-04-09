'use client';

import React from 'react';

interface NewsTickerProps {
    news?: string;
}

export function NewsTicker({ news }: NewsTickerProps) {
    if (!news) {
        return <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Aguardando novos posts...</span>;
    }

    return (
        <div className="news-ticker-container flex-1">
            <div className="news-ticker-content">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    DESTAQUE: {news}
                </span>
            </div>
        </div>
    );
}
