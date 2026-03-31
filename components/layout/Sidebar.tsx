'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    Bot,
    Settings,
    TrendingUp,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Zap,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

const navItems = [
    { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, color: 'text-brand-400' },
    { href: '/posts',      label: 'Posts',         icon: FileText,        color: 'text-emerald-400' },
    { href: '/agents',     label: 'Agentes',       icon: Bot,             color: 'text-violet-400' },
    { href: '/schedule',   label: 'Agendamento',   icon: Calendar,        color: 'text-amber-400' },
    { href: '/settings',   label: 'Configurações', icon: Settings,        color: 'text-slate-400' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();

    const w = isCollapsed ? 'md:w-16' : 'md:w-60';

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside
                className={`
                    fixed left-0 top-0 h-full flex flex-col z-50
                    border-r border-white/[0.06]
                    transition-all duration-300 ease-in-out
                    w-60 ${w}
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1526 100%)' }}
            >
                {/* Logo area */}
                <div className={`flex items-center border-b border-white/[0.06] transition-all duration-300 ${isCollapsed ? 'px-4 py-4 justify-center' : 'px-5 py-4 gap-3'}`}>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
                        <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white leading-tight tracking-tight">Notícia da Hora</p>
                            <p className="text-[10px] text-white/30 font-mono">v1.0.0 · Auto</p>
                        </div>
                    )}
                </div>

                {/* Online status */}
                {!isCollapsed && (
                    <div className="px-5 py-2.5 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <span className="pulse-dot text-[11px] text-emerald-400 font-medium">Sistema online</span>
                        </div>
                    </div>
                )}

                {/* Nav */}
                <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto scrollable ${isCollapsed ? 'px-2' : 'px-3'}`}>
                    {isCollapsed && !false && (
                        <div className="mb-4 flex justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                    )}

                    {navItems.map(({ href, label, icon: Icon, color }) => {
                        const active = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={closeSidebar}
                                title={isCollapsed ? label : undefined}
                                className={`
                                    relative flex items-center rounded-lg text-sm font-medium
                                    transition-all duration-200 group
                                    ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                                    ${active
                                        ? 'nav-active'
                                        : 'text-white/45 hover:text-white/90 hover:bg-white/[0.05] hover:border hover:border-white/[0.08]'
                                    }
                                `}
                            >
                                <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? color : 'text-white/30 group-hover:text-white/60'}`} />

                                {!isCollapsed && (
                                    <span className="truncate">{label}</span>
                                )}

                                {!isCollapsed && active && (
                                    <span className="ml-auto w-1 h-1 rounded-full bg-brand-400 opacity-80" />
                                )}

                                {/* Tooltip for collapsed */}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-surface-700 border border-white/10 rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                                        {label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className={`border-t border-white/[0.06] ${isCollapsed ? 'p-2' : 'p-3'}`}>
                    {!isCollapsed && (
                        <div className="mb-3 rounded-lg p-3 bg-gradient-to-br from-brand-500/8 to-emerald-500/5 border border-brand-500/15">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-3 h-3 text-brand-400" />
                                <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider">Pipeline</span>
                            </div>
                            <p className="text-[11px] text-white/50">RSS · IG · YT · WhatsApp</p>
                            <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Seg · Qua · Sex 18h</p>
                        </div>
                    )}

                    {/* Collapse toggle — desktop only */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden md:flex w-full items-center justify-center gap-2 py-2 px-3 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200 text-xs"
                        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {isCollapsed
                            ? <ChevronRight className="w-4 h-4" />
                            : <><ChevronLeft className="w-4 h-4" /><span>Recolher</span></>
                        }
                    </button>
                </div>
            </aside>
        </>
    );
}
