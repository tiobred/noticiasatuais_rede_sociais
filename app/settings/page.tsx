'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw, Trash2, Heart, MessageSquare, Camera, Clapperboard, Youtube, MessageCircle, Film, Globe, Plus, Settings, Shield, Zap, Layout, Terminal } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { TopBar } from '@/components/layout/TopBar';

// Tipos para as configurações
interface AccountConfig {
    isActive?: boolean;
    CHANNEL_INSTAGRAM_FEED?: boolean;
    CHANNEL_INSTAGRAM_STORY?: boolean;
    CHANNEL_WHATSAPP?: boolean;
    CHANNEL_INSTAGRAM_REELS?: boolean;
    CHANNEL_YOUTUBE_SHORTS?: boolean;
    PUBLISH_NEWS_ENABLED?: boolean;
    PUBLISH_ORIGINALS_ENABLED?: boolean;
    SCRAPER_LIMIT_PER_SOURCE?: number;
    imageStyle?: string;
    primaryColor?: string;
    feed_layout?: {
        fontSizeTitle?: number;
        fontSizeBody?: number;
        overlayAlpha?: number;
    };
    story_layout?: {
        fontSizeTitle?: number;
        fontSizeBody?: number;
        overlayAlpha?: number;
    };
    reels_layout?: {
        fontSizeTitle?: number;
        fontSizeBody?: number;
        overlayAlpha?: number;
    };
    THEMES?: string;
    DATA_SOURCES?: Array<{ name: string; url: string }>;
    IG_MONITOR_TARGETS?: Array<{
        username: string;
        minLikes: number;
        minComments: number;
        postOriginal: boolean;
        channels?: {
            feed?: boolean;
            story?: boolean;
            reels?: boolean;
            shorts?: boolean;
            whatsapp?: boolean;
        };
    }>;
    [key: string]: any;
}

interface InstagramAccount {
    id: string;
    username: string;
    name: string;
}

// Componentes locais seguindo o design de Schedule
const SectionHeader = ({ icon: Icon, title, dotColor = 'bg-purple-500' }: { icon?: any, title: string, dotColor?: string }) => (
    <div className="flex items-center gap-3 text-text-muted mb-4 px-2">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_8px_var(--${dotColor.replace('bg-', '')})]`} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h3>
    </div>
);

export default function SettingsPage() {
    const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
    const [currentAccountId, setCurrentAccountId] = useState<string>('');
    const [settings, setSettings] = useState<AccountConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (currentAccountId) {
            fetchAccountSettings(currentAccountId);
        }
    }, [currentAccountId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/settings?keys=INSTAGRAM_ACCOUNTS&t=${Date.now()}`);
            const data = await res.json();
            if (data.INSTAGRAM_ACCOUNTS) {
                const accounts = typeof data.INSTAGRAM_ACCOUNTS === 'string'
                    ? JSON.parse(data.INSTAGRAM_ACCOUNTS)
                    : data.INSTAGRAM_ACCOUNTS;
                setInstagramAccounts(accounts);
                if (accounts && accounts.length > 0) {
                    setCurrentAccountId(accounts[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            showMessage('Erro ao carregar dados iniciais', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAccountSettings = async (accountId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/settings?accountId=${accountId}&t=${Date.now()}`);
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error(`Erro ao carregar configs:`, error);
            showMessage('Erro ao carregar configurações da conta', 'error');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (key: keyof AccountConfig, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateNestedSetting = (category: keyof AccountConfig, key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] as any || {}),
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!currentAccountId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: currentAccountId, ...settings }),
            });
            if (res.ok) {
                showMessage('Configurações salvas com sucesso!', 'success');
                await fetchAccountSettings(currentAccountId);
            } else {
                showMessage('Erro ao salvar configurações.', 'error');
            }
        } catch (e) {
            showMessage('Erro de conexão.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-bg-main overflow-x-hidden">
            <TopBar 
                title="Configurações do Robô" 
                subtitle="Ajustes finos do motor de conteúdo"
            />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container">
                    {/* Header Principal */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[22px] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/10">
                                <Settings className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-tight">Painel de Controle</h2>
                                <p className="text-text-muted font-medium">Gerencie o comportamento de cada conta ativa</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="group relative flex items-center gap-2 px-8 py-3 bg-zinc-950/50 hover:bg-zinc-900 border border-purple-500/30 hover:border-purple-500/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-purple-100 font-black text-[10px] tracking-[0.2em] transition-all duration-300 shadow-2xl shadow-purple-950/40 active:scale-95 overflow-hidden uppercase"
                            >
                                {/* Subtle inner glow overlay on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                ) : (
                                    <Save className="w-4 h-4 text-purple-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                                )}
                                
                                <span className="relative z-10">
                                    {saving ? 'Gravando...' : 'Salvar Alterações'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8">
                            <div className="relative">
                                <Loader2 className="w-14 h-14 text-purple-500 animate-spin" />
                                <div className="absolute inset-0 blur-3xl bg-purple-500/30 animate-pulse" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-text-muted font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Módulos...</p>
                                <p className="text-[9px] text-text-muted/40 font-bold uppercase tracking-widest">Estabelecendo handshake seguro</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            
                            {/* Lado Esquerdo - Configs Gerais */}
                            <div className="lg:col-span-8 space-y-12">
                                
                                {/* Seletor de Conta */}
                                <section>
                                    <SectionHeader icon={Terminal} title="Seletor de Perfil" dotColor="bg-cyan-400" />
                                    <div className="card border-cyan-400/10 bg-bg-surface/30 backdrop-blur-md p-8 group hover:bg-bg-surface/40 transition-all duration-500">
                                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                                            <div className="w-14 h-14 rounded-2xl bg-cyan-400/5 border border-cyan-400/10 flex items-center justify-center group-hover:border-cyan-400/30 transition-all duration-500 shrink-0 shadow-lg shadow-cyan-400/5">
                                                <Zap className="w-7 h-7 text-cyan-400" />
                                            </div>
                                            <div className="flex-1 w-full space-y-2">
                                                <label className="text-[10px] font-black text-cyan-400/70 uppercase tracking-[0.2em] block">Escolha a conta para configurar</label>
                                                <select
                                                    className="w-full h-12 bg-zinc-950/40 border border-white/5 rounded-xl px-4 text-sm font-bold text-text-primary focus:border-cyan-400/30 transition-all focus:ring-4 focus:ring-cyan-400/5 outline-none appearance-none cursor-pointer"
                                                    value={currentAccountId}
                                                    onChange={(e) => setCurrentAccountId(e.target.value)}
                                                >
                                                    {instagramAccounts.map((acc) => (
                                                        <option key={acc.id} value={acc.id} className="bg-bg-surface text-text-primary">
                                                            @{acc.username?.toUpperCase() || acc.id}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Prompt e Temas */}
                                <section>
                                    <SectionHeader icon={Shield} title="Inteligência de Conteúdo" dotColor="bg-purple-500" />
                                    <div className="card border-purple-500/10 bg-bg-surface/30 backdrop-blur-md p-8">
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                                                    Instruções de Estilo & Nicho
                                                    <span className="w-1 h-1 rounded-full bg-purple-500/50" />
                                                </label>
                                                <div className="relative group">
                                                    <textarea
                                                        className="w-full min-h-[160px] bg-zinc-950/40 border border-white/5 rounded-2xl p-5 text-sm font-medium text-text-primary focus:border-purple-500/30 transition-all focus:ring-8 focus:ring-purple-500/5 outline-none leading-relaxed"
                                                        placeholder="Defina o tom de voz e os temas principais para esta conta específica..."
                                                        value={settings.THEMES || ''}
                                                        onChange={(e) => updateSetting('THEMES', e.target.value)}
                                                    />
                                                    <div className="absolute bottom-4 right-4 text-[9px] font-bold text-text-muted/30 uppercase tracking-widest pointer-events-none group-focus-within:text-purple-500/30 transition-colors">
                                                        LLM Engine V4
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">Estilo Visual</label>
                                                    <select
                                                        className="w-full h-11 bg-zinc-950/40 border border-white/5 rounded-xl px-4 text-xs font-bold text-text-primary focus:border-purple-500/30 transition-all outline-none"
                                                        value={settings.imageStyle || 'modern'}
                                                        onChange={(e) => updateSetting('imageStyle', e.target.value)}
                                                    >
                                                        <option value="modern">Moderno & Minimalista</option>
                                                        <option value="newspaper">Editorial Jornalístico</option>
                                                        <option value="tech">High-Tech Cyber</option>
                                                        <option value="bold">Vibrante & Bold</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">Cor de Identidade</label>
                                                    <div className="flex gap-3">
                                                        <div className="w-11 h-11 rounded-xl border border-white/10 flex-shrink-0 p-1 bg-bg-surface/50">
                                                            <div className="w-full h-full rounded-lg shadow-inner" style={{ backgroundColor: settings.primaryColor || '#A855F7' }} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="flex-1 bg-zinc-950/40 border border-white/5 rounded-xl px-4 text-xs font-mono font-bold text-text-primary focus:border-purple-500/30 transition-all outline-none"
                                                            value={settings.primaryColor || '#A855F7'}
                                                            onChange={(e) => updateSetting('primaryColor', e.target.value)}
                                                            placeholder="#HEXCODE"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Fontes RSS */}
                                <section>
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <SectionHeader title="Dutos de Notícias (RSS)" dotColor="bg-blue-400" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const sources = Array.isArray(settings.DATA_SOURCES) ? [...settings.DATA_SOURCES] : [];
                                                sources.push({ name: '', url: '' });
                                                updateSetting('DATA_SOURCES', sources);
                                            }}
                                            className="text-[9px] font-black bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-2 rounded-xl uppercase tracking-widest transition-all mb-4 flex items-center gap-2"
                                        >
                                            <Plus className="w-3 h-3" /> Add Fonte
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        {(Array.isArray(settings.DATA_SOURCES) ? settings.DATA_SOURCES : []).length === 0 && (
                                            <div className="card bg-bg-surface/10 border-dashed border-white/5 py-10 text-center">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Usando fontes globais do sistema</p>
                                            </div>
                                        )}
                                        
                                        {(Array.isArray(settings.DATA_SOURCES) ? settings.DATA_SOURCES : []).map((source, idx) => (
                                            <div key={idx} className="card bg-bg-surface/30 border-white/5 p-4 group hover:bg-bg-surface/50 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                                        <Globe className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <input
                                                            className="bg-zinc-950/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-text-primary focus:border-blue-500/30 transition-all outline-none"
                                                            placeholder="Título da Fonte"
                                                            value={source.name || ''}
                                                            onChange={(e) => {
                                                                const newS = [...(settings.DATA_SOURCES || [])];
                                                                newS[idx] = { ...newS[idx], name: e.target.value };
                                                                updateSetting('DATA_SOURCES', newS);
                                                            }}
                                                        />
                                                        <input
                                                            className="bg-zinc-950/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-medium text-blue-400/80 focus:border-blue-500/30 transition-all outline-none"
                                                            placeholder="URL do Feed"
                                                            value={source.url || ''}
                                                            onChange={(e) => {
                                                                const newS = [...(settings.DATA_SOURCES || [])];
                                                                newS[idx] = { ...newS[idx], url: e.target.value };
                                                                updateSetting('DATA_SOURCES', newS);
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newS = (settings.DATA_SOURCES || []).filter((_, i) => i !== idx);
                                                            updateSetting('DATA_SOURCES', newS);
                                                        }}
                                                        className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            {/* Lado Direito - Sidebar de Status e Canais */}
                            <div className="lg:col-span-4 space-y-12">
                                
                                {/* Status Toggle */}
                                <section>
                                    <SectionHeader title="Master Switch" dotColor={settings.isActive ? 'bg-green-400' : 'bg-red-500'} />
                                    <div className={`card p-6 border-white/5 transition-all duration-500 ${settings.isActive ? 'bg-green-500/[0.03]' : 'bg-red-500/[0.03]'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-black text-white uppercase tracking-widest">Atividade Geral</p>
                                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-tight">On/Off Switch</p>
                                            </div>
                                            <button
                                                onClick={() => updateSetting('isActive', !settings.isActive)}
                                                className={`w-14 h-7 rounded-full relative transition-all duration-500 p-1 ${settings.isActive ? 'bg-green-500/20 ring-1 ring-green-500/30' : 'bg-bg-elevated/80 ring-1 ring-white/10'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-full transition-all duration-500 shadow-xl ${settings.isActive ? 'translate-x-7 bg-green-400 shadow-green-500/50' : 'translate-x-0 bg-text-muted'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Canais de Output */}
                                <section className="space-y-6">
                                    <SectionHeader title="Pipeline Destinos" dotColor="bg-pink-500" />
                                    <div className="grid grid-cols-1 gap-3">
                                        {[
                                            { key: 'CHANNEL_INSTAGRAM_FEED', label: 'Feed Instagram', icon: Camera, color: 'text-pink-500', bg: 'bg-pink-500/5', border: 'border-pink-500/20' },
                                            { key: 'CHANNEL_INSTAGRAM_STORY', label: 'Stories', icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
                                            { key: 'CHANNEL_INSTAGRAM_REELS', label: 'Reels', icon: Clapperboard, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
                                            { key: 'CHANNEL_WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-500/5', border: 'border-green-500/20' },
                                            { key: 'CHANNEL_YOUTUBE_SHORTS', label: 'YT Shorts', icon: Youtube, color: 'text-red-600', bg: 'bg-red-600/5', border: 'border-red-600/20' },
                                        ].map((ch) => {
                                            const active = settings[ch.key] === true;
                                            const Icon = ch.icon;
                                            return (
                                                <button
                                                    key={ch.key}
                                                    onClick={() => updateSetting(ch.key, !active)}
                                                    className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${active ? `${ch.bg} ${ch.border} shadow-lg shadow-white/[0.02]` : 'bg-bg-surface/20 border-white/5 opacity-40 grayscale hover:opacity-60'}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <Icon className={`w-5 h-5 ${active ? ch.color : 'text-text-muted'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-text-muted'}`}>{ch.label}</span>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full transition-all ${active ? 'bg-green-400 shadow-[0_0_8px_var(--green-400)]' : 'bg-zinc-800'}`} />
                                                </button>
                                            )
                                        })}
                                    </div>
                                </section>

                                {/* Filtros Engine */}
                                <section>
                                    <SectionHeader title="Filtros de Entrada" dotColor="bg-amber-400" />
                                    <div className="card p-8 border-amber-400/10 bg-amber-400/[0.02] space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Publicar News (RSS)</label>
                                                <button
                                                    onClick={() => updateSetting('PUBLISH_NEWS_ENABLED', !settings.PUBLISH_NEWS_ENABLED)}
                                                    className={`w-10 h-5 rounded-full relative p-1 transition-all ${settings.PUBLISH_NEWS_ENABLED !== false ? 'bg-amber-500/20' : 'bg-bg-elevated'}`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full transition-all ${settings.PUBLISH_NEWS_ENABLED !== false ? 'translate-x-5 bg-amber-400 shadow-[0_0_8px_var(--amber-400)]' : 'translate-x-0 bg-text-muted'}`} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Publicar Originais</label>
                                                <button
                                                    onClick={() => updateSetting('PUBLISH_ORIGINALS_ENABLED', !settings.PUBLISH_ORIGINALS_ENABLED)}
                                                    className={`w-10 h-5 rounded-full relative p-1 transition-all ${settings.PUBLISH_ORIGINALS_ENABLED !== false ? 'bg-amber-500/20' : 'bg-bg-elevated'}`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full transition-all ${settings.PUBLISH_ORIGINALS_ENABLED !== false ? 'translate-x-5 bg-amber-400 shadow-[0_0_8px_var(--amber-400)]' : 'translate-x-0 bg-text-muted'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-6 border-t border-white/5 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">Limite per Source</label>
                                                <input
                                                    type="number"
                                                    className="w-full h-10 bg-zinc-950/40 border border-white/5 rounded-xl px-4 text-xs font-black text-amber-400 outline-none"
                                                    value={settings.SCRAPER_LIMIT_PER_SOURCE || 2}
                                                    onChange={(e) => updateSetting('SCRAPER_LIMIT_PER_SOURCE', parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>

                            {/* Seção de Monitoramento - Largura Total embaixo */}
                            <div className="lg:col-span-12">
                                <section>
                                    <div className="flex items-center justify-between mb-6 px-2">
                                        <SectionHeader title="Monitoramento de Contas IG (Repost)" dotColor="bg-purple-400" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const targets = Array.isArray(settings.IG_MONITOR_TARGETS) ? [...settings.IG_MONITOR_TARGETS] : [];
                                                targets.push({ 
                                                    username: '', 
                                                    minLikes: 5000, 
                                                    minComments: 100, 
                                                    postOriginal: false,
                                                    channels: { feed: true, story: true, reels: true, shorts: true, whatsapp: true }
                                                });
                                                updateSetting('IG_MONITOR_TARGETS', targets);
                                            }}
                                            className="text-[9px] font-black bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 px-5 py-2.5 rounded-2xl uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-purple-500/5 group"
                                        >
                                            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> Add Conta Alvo
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(Array.isArray(settings.IG_MONITOR_TARGETS) ? settings.IG_MONITOR_TARGETS : []).map((target, idx) => (
                                            <div key={idx} className="card bg-bg-surface/30 border-purple-500/10 p-6 relative overflow-hidden group hover:bg-bg-surface/50 transition-all">
                                                <div className="absolute top-0 right-0 p-2">
                                                    <button
                                                        onClick={() => {
                                                            const newT = (settings.IG_MONITOR_TARGETS || []).filter((_, i) => i !== idx);
                                                            updateSetting('IG_MONITOR_TARGETS', newT);
                                                        }}
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-red-500/30 hover:text-red-500 transition-all hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black">
                                                            @
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1">Nome de Usuário</label>
                                                            <input
                                                                className="w-full bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-black text-white focus:border-purple-500/30 outline-none transition-all"
                                                                placeholder="ex: forbes"
                                                                value={target.username || ''}
                                                                onChange={(e) => {
                                                                    const newT = [...(settings.IG_MONITOR_TARGETS || [])];
                                                                    newT[idx] = { ...newT[idx], username: e.target.value };
                                                                    updateSetting('IG_MONITOR_TARGETS', newT);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block">Min Likes</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-purple-400 outline-none focus:border-purple-500/30 transition-all"
                                                                value={target.minLikes || 0}
                                                                onChange={(e) => {
                                                                    const newT = [...(settings.IG_MONITOR_TARGETS || [])];
                                                                    newT[idx] = { ...newT[idx], minLikes: parseInt(e.target.value) };
                                                                    updateSetting('IG_MONITOR_TARGETS', newT);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block">Min Coment.</label>
                                                            <input
                                                                type="number"
                                                                className="w-full bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-purple-400 outline-none focus:border-purple-500/30 transition-all"
                                                                value={target.minComments || 0}
                                                                onChange={(e) => {
                                                                    const newT = [...(settings.IG_MONITOR_TARGETS || [])];
                                                                    newT[idx] = { ...newT[idx], minComments: parseInt(e.target.value) };
                                                                    updateSetting('IG_MONITOR_TARGETS', newT);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2">
                                                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-2">Destinos Ativos</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { key: 'feed', label: 'Feed' },
                                                                { key: 'story', label: 'Story' },
                                                                { key: 'reels', label: 'Reels' },
                                                                { key: 'shorts', label: 'Shorts' },
                                                                { key: 'whatsapp', label: 'WA' },
                                                            ].map(sub => {
                                                                const isChecked = target.channels ? (target.channels as any)[sub.key] !== false : true;
                                                                return (
                                                                    <button
                                                                        key={sub.key}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newT = [...(settings.IG_MONITOR_TARGETS || [])];
                                                                            const curCh = { feed: true, story: true, reels: true, shorts: true, whatsapp: true, ...(target.channels || {}) };
                                                                            (curCh as any)[sub.key] = !isChecked;
                                                                            newT[idx] = { ...newT[idx], channels: curCh };
                                                                            updateSetting('IG_MONITOR_TARGETS', newT);
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${isChecked ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-bg-surface/20 text-text-muted border-white/5 opacity-50'}`}
                                                                    >
                                                                        {sub.label}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                        </div>
                    )}
                </div>
            </main>

            {message && (
                <div className={`fixed bottom-8 right-8 z-[100] p-4 rounded-xl border animate-in slide-in-from-right-10 duration-500 backdrop-blur-xl shadow-2xl ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-red-500/5' : 'bg-green-500/10 border-green-500/20 text-green-400 shadow-green-500/5'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${message.type === 'error' ? 'bg-red-500 animate-pulse' : 'bg-green-500 animate-pulse'}`} />
                        <span className="text-xs font-black uppercase tracking-widest">{message.text}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
