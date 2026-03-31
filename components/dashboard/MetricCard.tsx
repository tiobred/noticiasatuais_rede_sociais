import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    id: string;
    label: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    accent?: 'blue' | 'green' | 'yellow' | 'red';
}

const accentMap = {
    blue: {
        icon: 'text-brand-400',
        iconBg: 'bg-brand-500/10',
        border: 'border-brand-500/20',
        glow: 'group-hover:shadow-[0_0_24px_rgba(14,165,233,0.12)]',
        bar: 'from-brand-500/40 to-brand-500/0',
    },
    green: {
        icon: 'text-emerald-400',
        iconBg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'group-hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]',
        bar: 'from-emerald-500/40 to-emerald-500/0',
    },
    yellow: {
        icon: 'text-amber-400',
        iconBg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        glow: 'group-hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]',
        bar: 'from-amber-500/40 to-amber-500/0',
    },
    red: {
        icon: 'text-red-400',
        iconBg: 'bg-red-500/10',
        border: 'border-red-500/20',
        glow: 'group-hover:shadow-[0_0_24px_rgba(239,68,68,0.12)]',
        bar: 'from-red-500/40 to-red-500/0',
    },
};

export function MetricCard({ id, label, value, icon: Icon, change, changeType = 'neutral', accent = 'blue' }: MetricCardProps) {
    const ac = accentMap[accent];

    return (
        <div
            id={id}
            className={`
                group relative overflow-hidden rounded-xl p-5
                glass border ${ac.border} ${ac.glow}
                transition-all duration-300 animate-fade-in
                hover:-translate-y-0.5 cursor-default
            `}
        >
            {/* Subtle top-left glow accent */}
            <div className={`absolute -top-4 -left-4 w-16 h-16 rounded-full bg-gradient-to-br ${ac.bar} blur-2xl opacity-60 pointer-events-none`} />

            <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-2 truncate">
                        {label}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-white font-mono leading-none tabular-nums">
                        {value}
                    </p>
                    {change && (
                        <p className={`text-[11px] mt-2 font-medium leading-tight
                            ${changeType === 'positive' ? 'text-emerald-400'
                            : changeType === 'negative' ? 'text-red-400'
                            : 'text-white/35'}`}
                        >
                            {changeType === 'positive' && '↑ '}{changeType === 'negative' && '↓ '}{change}
                        </p>
                    )}
                </div>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ac.iconBg} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${ac.icon}`} strokeWidth={1.75} />
                </div>
            </div>
        </div>
    );
}
