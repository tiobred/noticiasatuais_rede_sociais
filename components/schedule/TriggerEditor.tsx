'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Settings2, Trash2, Save, Loader2 } from 'lucide-react';

export interface TriggerRule {
    id: string;
    type: 'minutes' | 'hours' | 'days' | 'cron';
    value: number | string;
    minute?: number;
    hour?: number;
}

interface TriggerEditorProps {
    triggers: TriggerRule[];
    onSave: (triggers: TriggerRule[]) => void;
    saving?: boolean;
}

export function TriggerEditor({ triggers: initialTriggers, onSave, saving }: TriggerEditorProps) {
    const [triggers, setTriggers] = useState<TriggerRule[]>(initialTriggers || []);

    // Sync local state when prop changes (e.g., after fetch or save)
    useEffect(() => {
        if (initialTriggers) {
            setTriggers(initialTriggers);
        }
    }, [initialTriggers]);

    const addTrigger = () => {
        setTriggers([...triggers, { 
            id: Math.random().toString(36).substr(2, 9), 
            type: 'hours', 
            value: 12, 
            minute: 0 
        }]);
    };

    const removeTrigger = (id: string) => {
        setTriggers(triggers.filter(t => t.id !== id));
    };

    const updateTrigger = (id: string, updates: Partial<TriggerRule>) => {
        setTriggers(triggers.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    return (
        <div className="glass rounded-xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-white/5 bg-white/2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Clock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Gatilhos de Execução</h3>
                        <p className="text-sm text-white/40">Defina quando o robô deve buscar e postar notícias</p>
                    </div>
                </div>
                <button
                    onClick={addTrigger}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar
                </button>
            </div>

            <div className="p-6 space-y-4 max-h-[600px] overflow-auto custom-scrollbar">
                {triggers.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                            <Settings2 className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/30 italic text-sm">Nenhum gatilho configurado. O sistema não executará automaticamente.</p>
                    </div>
                ) : (
                    triggers.map((trigger) => (
                        <div key={trigger.id} className="relative group p-6 rounded-xl border border-white/10 bg-white/5 hover:border-brand-500/30 transition-all hover:bg-white/[0.07]">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                <div className="md:col-span-3">
                                    <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Tipo de Agenda</label>
                                    <select
                                        value={trigger.type}
                                        onChange={(e) => updateTrigger(trigger.id, { type: e.target.value as any, value: e.target.value === 'days' ? '12:00' : e.target.value === 'cron' ? '0 * * * *' : 1 })}
                                        className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50 transition-colors"
                                    >
                                        <option value="minutes">A cada X Minutos</option>
                                        <option value="hours">A cada X Horas</option>
                                        <option value="days">Horário Diário</option>
                                        <option value="cron">Custom (Expressão Cron)</option>
                                    </select>
                                </div>

                                <div className="md:col-span-3">
                                    {trigger.type === 'minutes' && (
                                        <>
                                            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Intervalo (Minutos)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={trigger.value}
                                                onChange={(e) => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                            />
                                        </>
                                    )}
                                    {trigger.type === 'hours' && (
                                        <>
                                            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Intervalo (Horas)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="24"
                                                value={trigger.value}
                                                onChange={(e) => updateTrigger(trigger.id, { value: parseInt(e.target.value) || 1 })}
                                                className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                            />
                                        </>
                                    )}
                                    {trigger.type === 'days' && (
                                        <>
                                            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Horário de Início</label>
                                            <input
                                                type="time"
                                                value={trigger.value}
                                                onChange={(e) => updateTrigger(trigger.id, { value: e.target.value })}
                                                className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                            />
                                        </>
                                    )}
                                    {trigger.type === 'cron' && (
                                        <>
                                            <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Expressão Cron</label>
                                            <input
                                                type="text"
                                                placeholder="* * * * *"
                                                value={trigger.value}
                                                onChange={(e) => updateTrigger(trigger.id, { value: e.target.value })}
                                                className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-brand-500/50"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="md:col-span-4">
                                    {(trigger.type === 'minutes' || trigger.type === 'hours') && (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-[10px] uppercase tracking-wider text-white/40 mb-2 block font-bold">Executar no minuto</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    value={trigger.minute ?? 0}
                                                    onChange={(e) => updateTrigger(trigger.id, { minute: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-surface-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-500/50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2 flex justify-end pb-1">
                                    <button
                                        onClick={() => removeTrigger(trigger.id)}
                                        className="p-2.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all border border-transparent hover:border-red-400/20"
                                        title="Remover gatilho"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-white/2 flex justify-end">
                <button
                    onClick={() => onSave(triggers)}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold text-sm tracking-wide transition-all shadow-xl shadow-brand-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    SALVAR ALTERAÇÕES
                </button>
            </div>
        </div>
    );
}
