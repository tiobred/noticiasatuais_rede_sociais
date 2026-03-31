'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Loader2, Plus, Trash2, Calendar, RefreshCw, Zap } from 'lucide-react';

export interface TriggerRule {
    id: string;
    type: 'minutes' | 'hours' | 'days' | 'cron' | 'weekly';
    value: number | string;
    minute?: number;
    // Para tipo 'weekly': dias da semana (0=Dom, 1=Seg .. 6=Sáb) + hora
    days?: number[];
    time?: string; // HH:MM
}

interface TriggerEditorProps {
    triggers: TriggerRule[];
    onSave: (triggers: TriggerRule[]) => void;
    saving?: boolean;
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function describeTrigger(t: TriggerRule): string {
    if (t.type === 'minutes') return `A cada ${t.value} min`;
    if (t.type === 'hours') return `A cada ${t.value}h (no min. ${t.minute ?? 0})`;
    if (t.type === 'days') return `Diário às ${t.value}`;
    if (t.type === 'cron') return `Cron: ${t.value}`;
    if (t.type === 'weekly') {
        const dayNames = (t.days || []).map(d => DAY_LABELS[d]).join(', ');
        return `Semanal: ${dayNames || '–'} às ${t.time || '–'}`;
    }
    return '';
}

function toCronExpression(t: TriggerRule): string {
    if (t.type === 'cron') return String(t.value);
    if (t.type === 'minutes') return `*/${t.value} * * * *`;
    if (t.type === 'hours') return `${t.minute ?? 0} */${t.value} * * *`;
    if (t.type === 'days') {
        const [h, m] = String(t.value).split(':');
        return `${m} ${h} * * *`;
    }
    if (t.type === 'weekly') {
        const [h, m] = (t.time || '08:00').split(':');
        const days = (t.days || []).join(',');
        return `${m} ${h} * * ${days}`;
    }
    return '* * * * *';
}

export function TriggerEditor({ triggers: initialTriggers, onSave, saving }: TriggerEditorProps) {
    const [triggers, setTriggers] = useState<TriggerRule[]>(initialTriggers || []);
    const [activeTab, setActiveTab] = useState<'visual' | 'advanced'>('visual');

    useEffect(() => {
        setTriggers(initialTriggers || []);
    }, [initialTriggers]);

    const addTrigger = (type: TriggerRule['type']) => {
        const base = { id: Math.random().toString(36).substr(2, 9) };
        let newT: TriggerRule;
        switch (type) {
            case 'weekly':
                newT = { ...base, type: 'weekly', value: '', days: [1, 3, 5], time: '08:00' };
                break;
            case 'days':
                newT = { ...base, type: 'days', value: '08:00' };
                break;
            case 'hours':
                newT = { ...base, type: 'hours', value: 4, minute: 0 };
                break;
            case 'minutes':
                newT = { ...base, type: 'minutes', value: 30 };
                break;
            case 'cron':
                newT = { ...base, type: 'cron', value: '0 8,18 * * 1-5' };
                break;
        }
        setTriggers(prev => [...prev, newT!]);
    };

    const removeTrigger = (id: string) => setTriggers(prev => prev.filter(t => t.id !== id));

    const updateTrigger = (id: string, updates: Partial<TriggerRule>) =>
        setTriggers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const toggleDay = (triggerId: string, day: number) => {
        setTriggers(prev => prev.map(t => {
            if (t.id !== triggerId) return t;
            const days = t.days || [];
            return { ...t, days: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() };
        }));
    };

    return (
        <div className="glass rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-white/5 bg-white/2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Calendar className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Planejador de Execução</h3>
                        <p className="text-sm text-white/40">Configure quando o robô deve buscar e publicar notícias</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab(activeTab === 'visual' ? 'advanced' : 'visual')}
                        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 rounded-lg transition-all"
                    >
                        {activeTab === 'visual' ? 'Modo Avançado (Cron)' : 'Modo Visual'}
                    </button>
                </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="px-6 pt-5 pb-2">
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-3 font-bold">Adicionar Regra</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => addTrigger('weekly')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 text-brand-400 rounded-lg text-xs font-medium transition-all">
                        <Calendar className="w-3.5 h-3.5" /> Dias da Semana
                    </button>
                    <button onClick={() => addTrigger('days')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 rounded-lg text-xs font-medium transition-all">
                        <Clock className="w-3.5 h-3.5" /> Diário (horário fixo)
                    </button>
                    <button onClick={() => addTrigger('hours')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-lg text-xs font-medium transition-all">
                        <RefreshCw className="w-3.5 h-3.5" /> Intervalo por Horas
                    </button>
                    <button onClick={() => addTrigger('minutes')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 text-green-400 rounded-lg text-xs font-medium transition-all">
                        <Zap className="w-3.5 h-3.5" /> Intervalo por Minutos
                    </button>
                    {activeTab === 'advanced' && (
                        <button onClick={() => addTrigger('cron')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400 rounded-lg text-xs font-medium transition-all">
                            <Plus className="w-3.5 h-3.5" /> Custom Cron
                        </button>
                    )}
                </div>
            </div>

            {/* Trigger Cards */}
            <div className="p-6 space-y-4 max-h-[600px] overflow-auto custom-scrollbar">
                {triggers.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Calendar className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/30 italic text-sm">Nenhuma regra configurada. O sistema não executará automaticamente.</p>
                        <p className="text-white/20 text-xs mt-1">Use os botões acima para adicionar uma regra.</p>
                    </div>
                ) : (
                    triggers.map((trigger) => (
                        <div key={trigger.id} className="relative group p-5 rounded-xl border border-white/10 bg-white/5 hover:border-brand-500/30 transition-all hover:bg-white/[0.07]">
                            {/* Tipo badge */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                    trigger.type === 'weekly' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                                    trigger.type === 'days' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                    trigger.type === 'hours' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    trigger.type === 'minutes' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                }`}>
                                    {trigger.type === 'weekly' ? '📅 Semanal' :
                                     trigger.type === 'days' ? '🕐 Diário' :
                                     trigger.type === 'hours' ? '🔁 Horas' :
                                     trigger.type === 'minutes' ? '⚡ Minutos' : '⚙️ Cron'}
                                </span>

                                <div className="flex items-center gap-2">
                                    {activeTab === 'advanced' && (
                                        <code className="text-xs text-white/30 font-mono bg-black/30 px-2 py-1 rounded">
                                            {toCronExpression(trigger)}
                                        </code>
                                    )}
                                    <button
                                        onClick={() => removeTrigger(trigger.id)}
                                        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all border border-transparent hover:border-red-400/20"
                                        title="Remover regra"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* WEEKLY TYPE */}
                            {trigger.type === 'weekly' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Dias da Semana</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {DAY_LABELS.map((label, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => toggleDay(trigger.id, idx)}
                                                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all border ${
                                                        (trigger.days || []).includes(idx)
                                                            ? 'bg-brand-500 text-white border-brand-600 shadow-lg shadow-brand-500/20'
                                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        {(trigger.days || []).length > 0 && (
                                            <p className="text-xs text-white/30 mt-2">
                                                {(trigger.days || []).map(d => DAY_FULL[d]).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Horário</label>
                                        <input
                                            type="time"
                                            value={trigger.time || '08:00'}
                                            onChange={e => updateTrigger(trigger.id, { time: e.target.value })}
                                            className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="text-xs text-white/25 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                        📋 {describeTrigger(trigger)}
                                    </div>
                                </div>
                            )}

                            {/* DAILY TYPE */}
                            {trigger.type === 'days' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Horário Diário</label>
                                        <input
                                            type="time"
                                            value={String(trigger.value)}
                                            onChange={e => updateTrigger(trigger.id, { value: e.target.value })}
                                            className="bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50 transition-colors"
                                        />
                                    </div>
                                    <p className="text-xs text-white/25 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                        📋 Executa todos os dias às {String(trigger.value) || '–'}
                                    </p>
                                </div>
                            )}

                            {/* HOURS TYPE */}
                            {trigger.type === 'hours' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">A cada (horas)</label>
                                        <input
                                            type="number" min="1" max="24"
                                            value={Number(trigger.value)}
                                            onChange={e => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">No minuto</label>
                                        <input
                                            type="number" min="0" max="59"
                                            value={trigger.minute ?? 0}
                                            onChange={e => updateTrigger(trigger.id, { minute: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                        />
                                    </div>
                                    <div className="col-span-2 text-xs text-white/25 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                        📋 Executa a cada {trigger.value}h no minuto {trigger.minute ?? 0}
                                    </div>
                                </div>
                            )}

                            {/* MINUTES TYPE */}
                            {trigger.type === 'minutes' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">A cada (minutos)</label>
                                        <div className="flex gap-3 flex-wrap">
                                            {[10, 15, 20, 30, 45, 60].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => updateTrigger(trigger.id, { value: v })}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all border ${
                                                        Number(trigger.value) === v
                                                            ? 'bg-green-500 text-white border-green-600'
                                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    {v}min
                                                </button>
                                            ))}
                                            <input
                                                type="number" min="1" max="120"
                                                value={Number(trigger.value)}
                                                onChange={e => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 10 })}
                                                className="w-20 bg-surface-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-brand-500/50"
                                                placeholder="Custom"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/25 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                        📋 Executa a cada {trigger.value} minutos
                                    </p>
                                </div>
                            )}

                            {/* CRON TYPE */}
                            {trigger.type === 'cron' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Expressão Cron (UTC-3)</label>
                                        <input
                                            type="text"
                                            placeholder="0 8,18 * * 1-5"
                                            value={String(trigger.value)}
                                            onChange={e => updateTrigger(trigger.id, { value: e.target.value })}
                                            className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand-500/50"
                                        />
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {['0 8 * * *', '0 8,18 * * *', '0 8,12,18 * * *', '0 8,18 * * 1-5'].map(ex => (
                                            <button
                                                key={ex}
                                                onClick={() => updateTrigger(trigger.id, { value: ex })}
                                                className="px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 text-white/40 hover:border-yellow-400/30 hover:text-yellow-400 rounded transition-all"
                                            >{ex}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Summary bar */}
            {triggers.length > 0 && (
                <div className="px-6 py-3 border-t border-white/5 bg-white/2">
                    <p className="text-xs text-white/30">
                        <span className="text-white/50 font-semibold">{triggers.length} regra{triggers.length !== 1 ? 's' : ''} ativa{triggers.length !== 1 ? 's' : ''}: </span>
                        {triggers.map(t => describeTrigger(t)).join(' · ')}
                    </p>
                </div>
            )}

            {/* Save button */}
            <div className="px-6 py-4 border-t border-white/5 bg-white/2 flex items-center justify-between">
                <p className="text-xs text-white/25">⚡ Ao salvar, as regras anteriores são substituídas imediatamente.</p>
                <button
                    onClick={() => onSave(triggers)}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm tracking-wide transition-all shadow-xl shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    SALVAR AGENDA
                </button>
            </div>
        </div>
    );
}
