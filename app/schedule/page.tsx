'use client';

import { useState, useEffect, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { TriggerEditor, TriggerRule } from '@/components/schedule/TriggerEditor';
import { ExecutionGrid, ExecutionRun } from '@/components/schedule/ExecutionGrid';
import { Calendar, RefreshCw, Loader2, Gauge, CheckCircle2, XCircle, AlertTriangle, Trash2 } from 'lucide-react';

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}

export default function SchedulePage() {
    const [triggers, setTriggers] = useState<TriggerRule[]>([]);
    const [runs, setRuns] = useState<ExecutionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    const addToast = useCallback((type: Toast['type'], message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    useEffect(() => {
        fetchTriggers();
        fetchRuns();
        
        const interval = setInterval(fetchRuns, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchTriggers = async () => {
        try {
            const res = await fetch(`/api/settings?keys=SCHEDULER_TRIGGERS&accountId=global&t=${Date.now()}`);
            const data = await res.json();
            if (data.SCHEDULER_TRIGGERS) {
                const parsed = typeof data.SCHEDULER_TRIGGERS === 'string' 
                    ? JSON.parse(data.SCHEDULER_TRIGGERS) 
                    : data.SCHEDULER_TRIGGERS;
                setTriggers(Array.isArray(parsed) ? parsed : [parsed]);
            } else {
                setTriggers([]);
            }
        } catch (e) {
            console.error('Error fetching triggers:', e);
        } finally {
            setLoading(false);
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
        }
    };

    const handleSaveTriggers = async (newTriggers: TriggerRule[]) => {
        setSaving(true);
        try {
            // CRITICO: accountId='global' para acionar a limpeza de triggers fantasma no backend
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accountId: 'global',
                    SCHEDULER_TRIGGERS: newTriggers 
                }),
            });
            
            if (res.ok) {
                setTriggers(newTriggers);
                const now = new Date().toLocaleTimeString('pt-BR');
                setLastSaved(now);
                addToast('success', `Agenda salva com sucesso às ${now}. O scheduler aplicará as novas regras no próximo ciclo.`);
                await fetch('/api/scheduler/reload', { method: 'POST' }).catch(() => {});
                await fetchTriggers();
            } else {
                const err = await res.json();
                addToast('error', `Erro ao salvar: ${err.error || 'Erro desconhecido'}`);
            }
        } catch (e) {
            console.error('Error saving triggers:', e);
            addToast('error', 'Erro de conexão ao salvar agenda.');
        } finally {
            setSaving(false);
        }
    };

    const handleClearAllTriggers = async () => {
        if (!confirm('Tem certeza? Isso irá APAGAR todas as regras de agendamento.')) return;
        setClearing(true);
        try {
            const res = await fetch('/api/scheduler/reload', { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                setTriggers([]);
                setLastSaved(null);
                addToast('warning', `${data.deleted} regra(s) removidas. O scheduler não executará mais automaticamente.`);
                await fetchTriggers();
            } else {
                addToast('error', 'Erro ao limpar as regras de agendamento.');
            }
        } catch (e) {
            addToast('error', 'Erro de conexão ao limpar regras.');
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar 
                title="Automação & Agendamento" 
                subtitle="Configure as regras do motor de notícias"
            />

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
                {toasts.map(toast => (
                    <div key={toast.id} className={`
                        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm text-sm font-medium
                        ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
                          toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                          'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'}
                    `}>
                        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                         toast.type === 'error' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                         <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container">
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
                            {lastSaved && (
                                <div className="flex items-center gap-2 text-xs text-green-400 font-medium bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Salvo às {lastSaved}</span>
                                </div>
                            )}
                            <button 
                                onClick={handleClearAllTriggers}
                                disabled={clearing || triggers.length === 0}
                                className="flex items-center gap-2 btn btn-secondary !py-2 !px-4 text-xs text-red-400 hover:text-red-300 disabled:opacity-30"
                                title="Limpar todas as regras de agendamento"
                            >
                                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                <span className="hidden sm:inline">Limpar Tudo</span>
                            </button>
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
