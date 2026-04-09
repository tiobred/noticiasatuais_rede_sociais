'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { TriggerEditor, TriggerRule } from '@/components/schedule/TriggerEditor';
import { ExecutionGrid, ExecutionRun } from '@/components/schedule/ExecutionGrid';
import { Calendar, RefreshCw, Loader2, Gauge } from 'lucide-react';

export default function SchedulePage() {
    const [triggers, setTriggers] = useState<TriggerRule[]>([]);
    const [runs, setRuns] = useState<ExecutionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchTriggers();
        fetchRuns();
        
        const interval = setInterval(fetchRuns, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchTriggers = async () => {
        try {
            const res = await fetch('/api/settings?keys=SCHEDULER_TRIGGERS');
            const data = await res.json();
            if (data.SCHEDULER_TRIGGERS) {
                const parsed = typeof data.SCHEDULER_TRIGGERS === 'string' 
                    ? JSON.parse(data.SCHEDULER_TRIGGERS) 
                    : data.SCHEDULER_TRIGGERS;
                setTriggers(Array.isArray(parsed) ? parsed : [parsed]);
            }
        } catch (e) {
            console.error('Error fetching triggers:', e);
        }
    };

    const fetchRuns = async () => {
        setRefreshing(true);
        try {
            const res = await fetch('/api/logs/runs?limit=20');
            const data = await res.json();
            setRuns(data.runs || []);
        } catch (e) {
            console.error('Error fetching runs:', e);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const handleSaveTriggers = async (newTriggers: TriggerRule[]) => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ SCHEDULER_TRIGGERS: newTriggers }),
            });
            
            if (res.ok) {
                setTriggers(newTriggers);
                alert('Gatilhos de agendamento salvos com sucesso!');
                await fetch('/api/scheduler/reload', { method: 'POST' }).catch(() => {});
            } else {
                const err = await res.json();
                alert(`Erro ao salvar: ${err.error || 'Erro desconhecido'}`);
            }
        } catch (e) {
            console.error('Error saving triggers:', e);
            alert('Erro de conexão ao salvar gatilhos.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar 
                title="Automação & Agendamento" 
                subtitle="Configure as regras do motor de notícias"
            />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container">
                    {/* Header Local */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/5">
                                <Gauge className="w-7 h-7 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">Pipeline Control</h2>
                                <p className="text-text-muted font-medium">Orquestração em tempo real</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={fetchRuns}
                                disabled={refreshing}
                                className="btn btn-secondary !p-3"
                                title="Sincronizar histórico"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-6">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <div className="absolute inset-0 blur-2xl bg-purple-500/20 animate-pulse" />
                            </div>
                            <p className="text-text-muted font-mono text-[10px] uppercase tracking-[0.3em] animate-pulse">Estabelecendo conexão segura...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-12">
                            {/* Gatilhos */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 text-text-muted mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_var(--purple-500)]" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Triggers de Execução</h3>
                                </div>
                                <div className="card border-purple-500/10 bg-bg-surface/30 backdrop-blur-sm">
                                    <TriggerEditor 
                                        triggers={triggers} 
                                        onSave={handleSaveTriggers}
                                        saving={saving}
                                    />
                                </div>
                            </section>

                            {/* Histórico */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 text-text-muted mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_var(--green-400)]" />
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Activity Monitoring</h3>
                                </div>
                                <div className="card !p-0 overflow-hidden border-border-strong bg-bg-surface/50">
                                    <ExecutionGrid 
                                        runs={runs} 
                                        loading={refreshing}
                                    />
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
