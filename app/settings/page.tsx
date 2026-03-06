'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Clock, Newspaper, MessageSquare, ArrowLeft, Share2, Power } from 'lucide-react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        SCRAPER_LIMIT_PER_SOURCE: 2,
        WHATSAPP_BATCH_DELAY: 60000,
        POSTING_TIMES: ['08:00', '13:00', '21:00'],
        CHANNEL_INSTAGRAM_FEED: true,
        CHANNEL_INSTAGRAM_STORY: true,
        CHANNEL_LINKEDIN: true,
        CHANNEL_WHATSAPP: true,
        JOB_SCHEDULER: true,
        JOB_CLEANUP: true,
        ACTIVE_INSTAGRAM_ACCOUNTS: [] as string[],
    });

    // New state for Instagram Accounts
    const [instagramAccounts, setInstagramAccounts] = useState<{ id: string, name: string, userId: string }[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/instagram/accounts');
            if (res.ok) {
                const data = await res.json();
                setInstagramAccounts(data);
            }
        } catch (error) {
            console.error('Failed to fetch instagram accounts:', error);
        }
    }

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    SCRAPER_LIMIT_PER_SOURCE: Number(data.SCRAPER_LIMIT_PER_SOURCE) || 2,
                    WHATSAPP_BATCH_DELAY: Number(data.WHATSAPP_BATCH_DELAY) || 60000,
                    POSTING_TIMES: data.POSTING_TIMES || ['08:00', '13:00', '21:00'],
                    CHANNEL_INSTAGRAM_FEED: data.CHANNEL_INSTAGRAM_FEED ?? true,
                    CHANNEL_INSTAGRAM_STORY: data.CHANNEL_INSTAGRAM_STORY ?? true,
                    CHANNEL_LINKEDIN: data.CHANNEL_LINKEDIN ?? true,
                    CHANNEL_WHATSAPP: data.CHANNEL_WHATSAPP ?? true,
                    JOB_SCHEDULER: data.JOB_SCHEDULER ?? true,
                    JOB_CLEANUP: data.JOB_CLEANUP ?? true,
                    ACTIVE_INSTAGRAM_ACCOUNTS: data.ACTIVE_INSTAGRAM_ACCOUNTS || [],
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            for (const [key, value] of Object.entries(settings)) {
                await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, value }),
                });
            }
            setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Erro ao salvar configurações.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans">
            <Sidebar />
            <div className="ml-60 flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-8 space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 hover:bg-neutral-900 rounded-lg transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                    <Settings className="w-8 h-8 text-emerald-500" />
                                    Configurações do Sistema
                                </h1>
                                <p className="text-neutral-400">Gerencie os parâmetros de automação e canais</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
                        >
                            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
                            Salvar Alterações
                        </button>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-200' : 'bg-red-900/20 border-red-500/50 text-red-200'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Scraper Settings */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                                <Newspaper className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-semibold text-white">Coleta de Notícias</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Limite de notícias por fonte</label>
                                    <input
                                        type="number"
                                        value={settings.SCRAPER_LIMIT_PER_SOURCE}
                                        onChange={(e) => setSettings({ ...settings, SCRAPER_LIMIT_PER_SOURCE: parseInt(e.target.value) })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                    <p className="text-xs text-neutral-500 mt-2">Número máximo de itens por site (Ex: Bloomberg, Reuters)</p>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Settings */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                                <MessageSquare className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-semibold text-white">WhatsApp</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-400 mb-2">Delay entre mensagens (ms)</label>
                                    <input
                                        type="number"
                                        value={settings.WHATSAPP_BATCH_DELAY}
                                        onChange={(e) => setSettings({ ...settings, WHATSAPP_BATCH_DELAY: parseInt(e.target.value) })}
                                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                    <p className="text-xs text-neutral-500 mt-2">Intervalo em milisegundos para evitar bloqueios (Padrão: 60000ms)</p>
                                </div>
                            </div>
                        </div>

                        {/* Channels Settings */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                                <Share2 className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-semibold text-white">Canais de Publicação</h2>
                            </div>
                            <div className="space-y-4">
                                {Object.entries({
                                    CHANNEL_INSTAGRAM_FEED: 'Instagram Feed (Carrossel)',
                                    CHANNEL_INSTAGRAM_STORY: 'Instagram Story',
                                    CHANNEL_LINKEDIN: 'LinkedIn',
                                    CHANNEL_WHATSAPP: 'WhatsApp'
                                }).map(([key, label]) => (
                                    <label key={key} className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-neutral-800/50 hover:bg-neutral-800/50 transition-colors">
                                        <span className="text-sm font-medium text-neutral-300">{label}</span>
                                        <input
                                            type="checkbox"
                                            checked={settings[key as keyof typeof settings] as boolean}
                                            onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                                            className="w-5 h-5 rounded border-neutral-800 text-emerald-500 focus:ring-emerald-500 bg-neutral-950"
                                        />
                                    </label>
                                ))}
                            </div>

                            <hr className="border-neutral-800 my-4" />

                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-1">Contas do Instagram Conectadas</h3>
                                    <p className="text-xs text-neutral-500">
                                        {instagramAccounts.length > 0
                                            ? 'Essas contas estão configuradas no ambiente do sistema e disponíveis para publicações.'
                                            : 'Nenhuma conta configurada no ambiente.'}
                                    </p>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {instagramAccounts.map((account) => {
                                        const isActive = settings.ACTIVE_INSTAGRAM_ACCOUNTS.includes(account.id);
                                        return (
                                            <label key={account.id} className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800/50 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-white">{account.name}</span>
                                                    <span className="text-xs text-neutral-500 font-mono mt-1">ID: {account.id} • User: {account.userId}</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={(e) => {
                                                        const newActive = e.target.checked
                                                            ? [...settings.ACTIVE_INSTAGRAM_ACCOUNTS, account.id]
                                                            : settings.ACTIVE_INSTAGRAM_ACCOUNTS.filter(id => id !== account.id);
                                                        setSettings({ ...settings, ACTIVE_INSTAGRAM_ACCOUNTS: newActive });
                                                    }}
                                                    className="w-5 h-5 rounded border-neutral-800 text-emerald-500 focus:ring-emerald-500 bg-neutral-950"
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-neutral-500 mt-2">
                                    A configuração de novas contas deve ser feita no painel de ambiente do sistema (.env).
                                </p>
                            </div>
                        </div>

                        {/* Jobs Settings */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
                            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                                <Power className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-semibold text-white">Controle de Jobs (Background)</h2>
                            </div>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-neutral-800/50 hover:bg-neutral-800/50 transition-colors">
                                    <div>
                                        <span className="block text-sm font-medium text-neutral-300">Agendamento de Notícias</span>
                                        <span className="block text-xs text-neutral-500 mt-1">Executar a busca e postagem nos horários configurados</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.JOB_SCHEDULER}
                                        onChange={(e) => setSettings({ ...settings, JOB_SCHEDULER: e.target.checked })}
                                        className="w-5 h-5 rounded border-neutral-800 text-emerald-500 focus:ring-emerald-500 bg-neutral-950"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg border border-neutral-800/50 hover:bg-neutral-800/50 transition-colors">
                                    <div>
                                        <span className="block text-sm font-medium text-neutral-300">Rotinas de Limpeza</span>
                                        <span className="block text-xs text-neutral-500 mt-1">Limpeza de imagens (Storage) e resgate de runs travados</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.JOB_CLEANUP}
                                        onChange={(e) => setSettings({ ...settings, JOB_CLEANUP: e.target.checked })}
                                        className="w-5 h-5 rounded border-neutral-800 text-emerald-500 focus:ring-emerald-500 bg-neutral-950"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Posting Schedule */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 md:col-span-2">
                            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                                <Clock className="w-6 h-6 text-emerald-500" />
                                <h2 className="text-xl font-semibold text-white">Horários de Publicação</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['Manhã', 'Tarde', 'Noite'].map((label, idx) => (
                                    <div key={label}>
                                        <label className="block text-sm font-medium text-neutral-400 mb-2">{label}</label>
                                        <input
                                            type="time"
                                            value={settings.POSTING_TIMES[idx]}
                                            onChange={(e) => {
                                                const newTimes = [...settings.POSTING_TIMES];
                                                newTimes[idx] = e.target.value;
                                                setSettings({ ...settings, POSTING_TIMES: newTimes });
                                            }}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-white"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-sm text-neutral-500 bg-neutral-950/50 p-4 rounded-lg border border-neutral-800/50">
                                <strong>Note:</strong> O sistema realizará a coleta e publicação consolidada nestes horários específicos para minimizar custos de API.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
