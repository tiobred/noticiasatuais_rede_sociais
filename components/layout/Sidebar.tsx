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
    { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, color: 'text-purple-400' },
    { href: '/posts',      label: 'Feed',         icon: FileText,        color: 'text-pink-500' },
    { href: '/agents',     label: 'Automação',     icon: Bot,             color: 'text-cyan-400' },
    { href: '/schedule',   label: 'Agendamento',   icon: Calendar,        color: 'text-amber-400' },
    { href: '/settings',   label: 'Configurações', icon: Settings,        color: 'text-text-secondary' },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isOpen, isCollapsed, closeSidebar, toggleCollapse } = useSidebar();

    const sidebarWidth = isCollapsed ? 'md:w-20' : 'md:w-64';

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside
                className={`
                    fixed left-0 top-0 h-full flex flex-col z-50
                    border-r border-border-subtle bg-bg-surface
                    transition-all duration-400 ease-spring
                    w-64 ${sidebarWidth}
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Logo area */}
                <div className={`flex items-center border-b border-border-subtle transition-all duration-300 h-16 ${isCollapsed ? 'px-4 justify-center' : 'px-6 gap-3'}`}>
                    <div className="w-10 h-10 rounded-xl bg-grad-primary flex items-center justify-center flex-shrink-0 shadow-purple p-2">
                        <Zap className="w-full h-full text-white fill-current" strokeWidth={2.5} />
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-[17px] font-black text-text-primary tracking-tight leading-tight">SOCIAL<span className="text-purple-400">POST</span></p>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em]">Brazil Edition</p>
                        </div>
                    )}
                </div>

                {/* Status Indicator */}
                {!isCollapsed && (
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_var(--green-400)]" />
                           <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Servidor Ativo</span>
                        </div>
                    </div>
                )}

                {/* Navigation Items */}
                <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto ${isCollapsed ? 'px-3' : 'px-4'}`}>
                    {navItems.map(({ href, label, icon: Icon, color }) => {
                        const active = pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={closeSidebar}
                                title={isCollapsed ? label : undefined}
                                className={`
                                    relative flex items-center rounded-xl text-sm font-semibold
                                    transition-all duration-250 group
                                    ${isCollapsed ? 'justify-center p-3 h-12' : 'gap-3 px-4 py-3'}
                                    ${active
                                        ? 'bg-grad-primary/10 text-text-primary border border-purple-500/20 shadow-purple'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated hover:border border-transparent hover:border-border-subtle'
                                    }
                                `}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-all ${active ? color : 'text-text-muted group-hover:text-text-secondary group-hover:scale-110'}`} />

                                {!isCollapsed && (
                                    <span className="truncate flex-1">{label}</span>
                                )}

                                {active && !isCollapsed && (
                                    <div className="w-1.5 h-6 rounded-full bg-purple-500 absolute -right-1" />
                                )}

                                {isCollapsed && (
                                    <div className="absolute left-full ml-4 px-3 py-2 bg-bg-elevated border border-border-strong rounded-lg text-xs text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 shadow-md translate-x-3 group-hover:translate-x-0 font-bold uppercase tracking-wider">
                                        {label}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer section */}
                <div className={`p-4 border-t border-border-subtle ${isCollapsed ? 'items-center' : ''}`}>
                    {!isCollapsed && (
                        <div className="mb-4 rounded-xl p-4 bg-grad-primary/5 border border-purple-500/10 group hover:border-purple-500/30 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-4 h-4 text-purple-400" />
                                <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">Plano Pro</span>
                            </div>
                            <div className="h-1 w-full bg-bg-elevated rounded-full overflow-hidden">
                               <div className="h-full bg-grad-primary w-[85%]" />
                            </div>
                            <p className="text-[10px] text-text-muted mt-2 font-medium">850 / 1000 posts mensal</p>
                        </div>
                    )}

                    <button
                        onClick={toggleCollapse}
                        className={`
                            flex items-center justify-center gap-2 py-2.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all text-[11px] font-bold uppercase tracking-widest w-full
                            border border-transparent hover:border-border-subtle
                        `}
                    >
                        {isCollapsed
                            ? <ChevronRight className="w-5 h-5" />
                            : <><ChevronLeft className="w-4 h-4" /><span>Fechar Menu</span></>
                        }
                    </button>
                </div>
            </aside>
        </>
    );
}
