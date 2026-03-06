'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Bot,
    Settings,
    TrendingUp,
    Radio,
} from 'lucide-react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/posts', label: 'Posts', icon: FileText },
    { href: '/agents', label: 'Agentes', icon: Bot },
    { href: '/settings', label: 'Config', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-full w-60 glass border-r border-white/5 flex flex-col z-50">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white leading-tight">Notícia da Hora</p>
                    <p className="text-xs text-white/40 font-mono">v1.0.0</p>
                </div>
            </div>

            {/* Status Online */}
            <div className="px-6 py-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span className="pulse-dot" />
                    Sistema online
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${active
                                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-brand-400' : 'text-white/30 group-hover:text-white/60'}`} />
                            {label}
                            {active && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Feed Source */}
            <div className="px-4 py-4 border-t border-white/5">
                <div className="glass rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Radio className="w-3 h-3 text-brand-400" />
                        <span className="text-xs text-white/50 font-mono">Fonte</span>
                    </div>
                    <p className="text-xs text-white/70 font-semibold">RSS (Múltiplas)</p>
                    <p className="text-xs text-emerald-400 font-mono">Agendado</p>
                </div>
            </div>
        </aside>
    );
}
