import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    id: string;
    label: string;
    value: string | number;
    icon: LucideIcon;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    accent?: 'purple' | 'cyan' | 'green' | 'red' | 'amber';
}

const accentMap = {
    purple: {
        icon: 'text-purple-400',
        iconBg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        glow: 'hover:shadow-purple',
        gradient: 'from-purple-500/20 to-transparent',
    },
    cyan: {
        icon: 'text-cyan-400',
        iconBg: 'bg-cyan-400/10',
        border: 'border-cyan-400/20',
        glow: 'hover:shadow-glow',
        gradient: 'from-cyan-400/20 to-transparent',
    },
    green: {
        icon: 'text-green-400',
        iconBg: 'bg-green-400/10',
        border: 'border-green-400/20',
        glow: 'hover:shadow-md',
        gradient: 'from-green-400/20 to-transparent',
    },
    red: {
        icon: 'text-red-400',
        iconBg: 'bg-red-400/10',
        border: 'border-red-400/20',
        glow: 'hover:shadow-md',
        gradient: 'from-red-400/20 to-transparent',
    },
    amber: {
        icon: 'text-amber-400',
        iconBg: 'bg-amber-400/10',
        border: 'border-amber-400/20',
        glow: 'hover:shadow-md',
        gradient: 'from-amber-400/20 to-transparent',
    },
};

export function MetricCard({ id, label, value, icon: Icon, change, changeType = 'neutral', accent = 'purple' }: MetricCardProps) {
    const ac = accentMap[accent as keyof typeof accentMap] || accentMap.purple;

    return (
        <div
            id={id}
            className={`
                group relative overflow-hidden card border ${ac.border} ${ac.glow}
                animate-in transition-all
            `}
        >
            {/* Background Gradient Detail */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${ac.gradient} blur-3xl opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity`} />

            <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="section-label !mb-1 truncate">
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-text-primary leading-tight tabular-nums">
                        {value}
                    </p>
                    {change && (
                        <p className={`text-xs mt-2 font-semibold
                            ${changeType === 'positive' ? 'text-green-400'
                            : changeType === 'negative' ? 'text-red-400'
                            : 'text-text-muted'}`}
                        >
                            <span className="flex items-center gap-1">
                                {changeType === 'positive' && '↑'}
                                {changeType === 'negative' && '↓'}
                                {change}
                            </span>
                        </p>
                    )}
                </div>

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ac.iconBg} flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className={`w-6 h-6 ${ac.icon}`} strokeWidth={2} />
                </div>
            </div>
        </div>
    );
}
