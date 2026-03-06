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

const accentClasses = {
    blue: { icon: 'text-brand-400 bg-brand-500/10', border: 'border-brand-500/20', glow: 'group-hover:shadow-glow-blue' },
    green: { icon: 'text-emerald-400 bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'group-hover:shadow-glow-green' },
    yellow: { icon: 'text-yellow-400 bg-yellow-500/10', border: 'border-yellow-500/20', glow: '' },
    red: { icon: 'text-red-400 bg-red-500/10', border: 'border-red-500/20', glow: '' },
};

export function MetricCard({
    id, label, value, icon: Icon, change, changeType = 'neutral', accent = 'blue',
}: MetricCardProps) {
    const ac = accentClasses[accent];

    return (
        <div
            id={id}
            className={`glass group rounded-xl p-5 border ${ac.border} ${ac.glow} transition-all duration-300 animate-fade-in`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-3xl font-bold text-white font-mono">{value}</p>
                    {change && (
                        <p className={`text-xs mt-1.5 font-medium
              ${changeType === 'positive' ? 'text-emerald-400' :
                                changeType === 'negative' ? 'text-red-400' : 'text-white/40'}`}
                        >
                            {change}
                        </p>
                    )}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ac.icon} flex-shrink-0 ml-3`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
