'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Loader2, Plus, Trash2, Calendar, RefreshCw, Zap, Settings, Info } from 'lucide-react';

export interface TriggerRule {
    id: string;
    type: 'minutes' | 'hours' | 'days' | 'cron' | 'weekly';
    value: number | string;
    minute?: number;
    days?: number[];
    time?: string; // HH:MM
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function describeTrigger(t: TriggerRule): string {
    if (t.type === 'minutes') return `A cada ${t.value} minutos`;
    if (t.type === 'hours') return `A cada ${t.value}h no minuto ${t.minute ?? 0}`;
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
        <div className="card !p-0 overflow-hidden border-border-strong bg-bg-surface/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-6 border-b border-border-subtle bg-bg-elevated/20 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-glow shadow-orange-500/10">
                        <Calendar className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Planejador de Execução</h3>
                        <p className="text-sm text-text-muted font-medium">Orquestração de coleta e publicação</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-1 bg-bg-base/80 border border-border-subtle rounded-xl">
                    <button
                        onClick={() => setActiveTab('visual')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'visual' ? 'bg-bg-elevated text-purple-400 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Visual
                    </button>
                    <button
                        onClick={() => setActiveTab('advanced')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'advanced' ? 'bg-bg-elevated text-purple-400 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Advanced
                    </button>
                </div>
            </div>

            <div className="px-8 py-6 border-b border-border-subtle bg-bg-base/20">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Pipeline Rules</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => addTrigger('weekly')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-purple-500/30 text-text-primary rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Calendar className="w-4 h-4 text-purple-400" /> 
                        <span>Semanal</span>
                    </button>
                    <button onClick={() => addTrigger('days')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-blue-500/30 text-text-primary rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Clock className="w-4 h-4 text-blue-400" /> 
                        <span>Diário</span>
                    </button>
                    <button onClick={() => addTrigger('hours')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-cyan-500/30 text-text-primary rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <RefreshCw className="w-4 h-4 text-cyan-400" /> 
                        <span>Horas</span>
                    </button>
                    <button onClick={() => addTrigger('minutes')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-green-500/30 text-text-primary rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <Zap className="w-4 h-4 text-green-400" /> 
                        <span>Minutos</span>
                    </button>
                    {activeTab === 'advanced' && (
                        <button onClick={() => addTrigger('cron')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated hover:bg-bg-surface border border-border-subtle hover:border-orange-500/30 text-text-primary rounded-xl text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Settings className="w-4 h-4 text-orange-400" /> 
                            <span>Custom Cron</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-8 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar bg-bg-base/10">
                {triggers.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                            <Clock className="w-10 h-10 text-text-muted/20" />
                        </div>
                        <p className="text-text-muted font-bold text-sm uppercase tracking-widest">Nenhuma regra ativa</p>
                        <p className="text-text-muted/50 text-xs mt-2 font-medium">Configure uma regra para automatizar o sistema</p>
                    </div>
                ) : (
                    triggers.map((trigger) => (
                        <div key={trigger.id} className="relative group p-6 rounded-2xl border border-border-subtle bg-bg-surface hover:border-purple-500/40 transition-all hover:shadow-glow shadow-purple-500/5">
                            <div className="flex items-center justify-between mb-6">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg border shadow-sm ${
                                    trigger.type === 'weekly' ? 'bg-purple-500/5 text-purple-400 border-purple-500/20' :
                                    trigger.type === 'days' ? 'bg-blue-500/5 text-blue-400 border-blue-500/20' :
                                    trigger.type === 'hours' ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/20' :
                                    trigger.type === 'minutes' ? 'bg-green-500/5 text-green-400 border-green-500/20' :
                                    'bg-orange-500/5 text-orange-400 border-orange-500/20'
                                }`}>
                                    {trigger.type} Mode
                                </span>

                                <div className="flex items-center gap-4">
                                    {activeTab === 'advanced' && (
                                        <code className="text-[10px] text-purple-400 font-mono bg-purple-500/5 px-2.5 py-1 rounded border border-purple-500/10 font-black">
                                            {toCronExpression(trigger)}
                                        </code>
                                    )}
                                    <button
                                        onClick={() => removeTrigger(trigger.id)}
                                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all border border-transparent hover:border-red-400/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {trigger.type === 'weekly' && (
                                <div className="grid gap-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Dias da Operação</label>
                                        <div className="flex gap-2.5 flex-wrap">
                                            {DAY_LABELS.map((label, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => toggleDay(trigger.id, idx)}
                                                    className={`w-12 h-12 rounded-xl text-[11px] font-black uppercase transition-all border ${
                                                        (trigger.days || []).includes(idx)
                                                            ? 'bg-grad-primary text-white border-transparent shadow-purple'
                                                            : 'bg-bg-elevated text-text-muted border-border-subtle hover:border-text-muted/40 hover:bg-bg-base'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3 block">Horário de Início</label>
                                        <input
                                            type="time"
                                            value={trigger.time || '08:00'}
                                            onChange={e => updateTrigger(trigger.id, { time: e.target.value })}
                                            className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary font-bold outline-none focus:border-purple-500/50 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {trigger.type === 'days' && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 block">Execução Diária</label>
                                    <input
                                        type="time"
                                        value={String(trigger.value)}
                                        onChange={e => updateTrigger(trigger.id, { value: e.target.value })}
                                        className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary font-bold outline-none focus:border-blue-500/50 transition-all shadow-sm"
                                    />
                                </div>
                            )}

                            {trigger.type === 'hours' && (
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 block">Intervalo (Horas)</label>
                                        <input
                                            type="number" min="1" max="24"
                                            value={Number(trigger.value)}
                                            onChange={e => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary font-bold outline-none focus:border-cyan-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 block">Minuto Exato</label>
                                        <input
                                            type="number" min="0" max="59"
                                            value={trigger.minute ?? 0}
                                            onChange={e => updateTrigger(trigger.id, { minute: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary font-bold outline-none focus:border-cyan-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {trigger.type === 'minutes' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4 block">Intervalo de Varredura</label>
                                        <div className="flex gap-3 flex-wrap">
                                            {[10, 15, 30, 45, 60].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => updateTrigger(trigger.id, { value: v })}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${
                                                        Number(trigger.value) === v
                                                            ? 'bg-green-500 text-white border-transparent shadow-glow shadow-green-500/20'
                                                            : 'bg-bg-elevated text-text-muted border-border-subtle hover:border-green-500/30'
                                                    }`}
                                                >
                                                    {v}m
                                                </button>
                                            ))}
                                            <input
                                                type="number" min="1" max="120"
                                                value={Number(trigger.value)}
                                                onChange={e => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 10 })}
                                                className="w-24 bg-bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 text-xs text-text-primary font-bold outline-none focus:border-green-500/50"
                                                placeholder="Custom"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {trigger.type === 'cron' && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1 block">Cron Expression (Linux Default)</label>
                                    <input
                                        type="text"
                                        placeholder="0 8,18 * * 1-5"
                                        value={String(trigger.value)}
                                        onChange={e => updateTrigger(trigger.id, { value: e.target.value })}
                                        className="w-full bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary font-mono font-black outline-none focus:border-orange-500/50 transition-all"
                                    />
                                    <div className="flex gap-2 flex-wrap">
                                        {['0 8 * * *', '0 8,18 * * 1-5'].map(ex => (
                                            <button
                                                key={ex}
                                                onClick={() => updateTrigger(trigger.id, { value: ex })}
                                                className="px-3 py-1.5 text-[9px] font-black font-mono bg-bg-base border border-border-subtle text-text-muted hover:text-orange-400 hover:border-orange-500/30 rounded-lg transition-all"
                                            >{ex}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex items-center gap-2 pt-4 border-t border-border-subtle/50 text-text-muted/60">
                                <Info className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wide">{describeTrigger(trigger)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-8 py-6 border-t border-border-subtle bg-bg-elevated/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Status da Agenda</p>
                    <p className="text-xs font-bold text-text-primary">
                        {triggers.length > 0 ? (
                            <span className="flex items-center gap-2 text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                {triggers.length} regrada{triggers.length !== 1 ? 's' : ''} ativa{triggers.length !== 1 ? 's' : ''} no pipeline
                            </span>
                        ) : (
                            <span className="text-text-muted opacity-40">Nenhuma automação ativa</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => onSave(triggers)}
                    disabled={saving}
                    className={`
                        flex items-center gap-3 px-10 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-purple hover:scale-[1.02] active:scale-[0.98]
                        ${saving ? 'bg-bg-elevated text-text-muted' : 'bg-grad-primary text-white'}
                    `}
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
}

interface TriggerEditorProps {
    triggers: TriggerRule[];
    onSave: (triggers: TriggerRule[]) => void;
    saving?: boolean;
}
