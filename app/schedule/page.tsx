'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { MobileMenuToggle } from '@/components/layout/MobileMenuToggle';
import { TriggerEditor, TriggerRule } from '@/components/schedule/TriggerEditor';
import { ExecutionGrid, ExecutionRun } from '@/components/schedule/ExecutionGrid';
import { Calendar, RefreshCw, Loader2 } from 'lucide-react';

export default function SchedulePage() {
    const [triggers, setTriggers] = useState<TriggerRule[]>([]);
    const [runs, setRuns] = useState<ExecutionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchTriggers();
        fetchRuns();
        
        // Polling para o grid de execução (tempo real) - a cada 10 segundos
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
                
                // Opcional: Notificar o scheduler backend para recarregar as configs
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
        <SidebarProvider>
            <div className="flex bg-gray-950 min-h-screen relative text-white selection:bg-brand-500/30">
                <Sidebar />

                <div className="flex-1 flex flex-col min-w-0 md:ml-60 transition-all duration-300">
                    {/* Header mobile */}
                    <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <MobileMenuToggle />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-600">
                                Agendamento
                            </h1>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            
                            {/* Page Header */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-lg shadow-brand-500/5">
                                            <Calendar className="w-6 h-6 text-brand-400" />
                                        </div>
                                        <div>
                                            <h1 className="text-3xl font-extrabold tracking-tight text-white hidden md:block">
                                                Pipeline & Scheduler
                                            </h1>
                                            <p className="text-white/40 text-sm md:text-base max-w-md">
                                                Gerencie os gatilhos de execução e acompanhe o histórico em tempo real.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={fetchRuns}
                                        disabled={refreshing}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 hover:text-white group active:scale-95 disabled:opacity-50"
                                        title="Atualizar histórico agora"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-brand-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-6">
                                    <div className="relative">
                                        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                                        <div className="absolute inset-0 blur-xl bg-brand-500/20 animate-pulse" />
                                    </div>
                                    <p className="text-white/20 font-mono text-xs uppercase tracking-widest animate-pulse">Sincronizando com o motor...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-12">
                                    {/* Trigger Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1 h-3 bg-brand-500 rounded-full" />
                                            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Configuração de Gatilhos</h2>
                                        </div>
                                        <TriggerEditor 
                                            triggers={triggers} 
                                            onSave={handleSaveTriggers}
                                            saving={saving}
                                        />
                                    </section>

                                    {/* Execution History Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                            <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Monitor de Atividade</h2>
                                        </div>
                                        <ExecutionGrid 
                                            runs={runs} 
                                            loading={refreshing}
                                        />
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
}
