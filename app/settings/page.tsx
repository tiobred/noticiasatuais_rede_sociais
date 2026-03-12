'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { MobileMenuToggle } from '@/components/layout/MobileMenuToggle';

// Tipos para as configurações
interface PostingTimes {
    start: string;
    end: string;
    interval: number;
}

interface AccountConfig {
    [key: string]: any;
}

// Componentes utilitários de UI
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 pb-4 border-b border-gray-100 dark:border-gray-800 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <p className={`text-sm text-gray-500 dark:text-gray-400 mt-2 ${className}`}>
        {children}
    </p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

const Label = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <label className={`text-sm font-medium leading-none mb-1 block ${className}`}>
        {children}
    </label>
);

const Input = (props: any) => (
    <input
        {...props}
        className={`flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 ${props.className || ''}`}
    />
);

const Switch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (c: boolean) => void }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

export default function SettingsPage() {
    const [instagramAccounts, setInstagramAccounts] = useState<any[]>([]);
    const [currentAccountId, setCurrentAccountId] = useState<string>('');
    const [originalSettings, setOriginalSettings] = useState<AccountConfig>({});
    const [settings, setSettings] = useState<AccountConfig>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Substituindo o toast por state local
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Quando mudar a conta, carregar as configs específicas dela
    useEffect(() => {
        if (currentAccountId) {
            fetchAccountSettings(currentAccountId);
        }
    }, [currentAccountId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings?keys=INSTAGRAM_ACCOUNTS');
            const data = await res.json();

            if (data.INSTAGRAM_ACCOUNTS) {
                const accounts = typeof data.INSTAGRAM_ACCOUNTS === 'string'
                    ? JSON.parse(data.INSTAGRAM_ACCOUNTS)
                    : data.INSTAGRAM_ACCOUNTS;

                setInstagramAccounts(accounts);
                // Seleciona a primeira conta por padrão
                if (accounts && accounts.length > 0) {
                    setCurrentAccountId(accounts[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar contas do Instagram:', error);
            showMessage('Erro ao carregar dados iniciais', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAccountSettings = async (accountId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/settings?accountId=${accountId}`);
            const data = await res.json();

            setOriginalSettings(data);
            setSettings(data);
        } catch (error) {
            console.error(`Erro ao carregar configurações da conta ${accountId}:`, error);
            showMessage('Erro ao carregar configurações da conta', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper functions para manter a mesma API de atualização do formulário
    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateNestedSetting = (category: string, key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [key]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!currentAccountId) {
            showMessage('Selecione uma conta primeiro', 'error');
            return;
        }

        try {
            setSaving(true);
            console.log(`[Settings] Salvando para ${currentAccountId}...`);

            console.log('[Settings] Enviando payload total:', settings);

            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: currentAccountId, ...settings }),
            });

            const result = await res.json();

            if (res.ok) {
                console.log('[Settings] Resposta do servidor:', result);
                showMessage(`Configurações salvas com sucesso para @${instagramAccounts.find(a => a.id === currentAccountId)?.username || currentAccountId}`, 'success');

                // Recarregar os dados do servidor para garantir sincronia total
                await fetchAccountSettings(currentAccountId);
            } else {
                console.error('[Settings] Erro no servidor:', result);
                showMessage(`Erro ao salvar: ${result.error || 'Erro desconhecido'}`, 'error');
            }
        } catch (error) {
            console.error('[Settings] Erro de conexão:', error);
            showMessage('Erro de conexão ao tentar salvar.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !currentAccountId) {
        return (
            <SidebarProvider>
                <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen">
                    <Sidebar />
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                </div>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <div className="flex bg-gray-50 dark:bg-gray-900 min-h-screen relative">
                <Sidebar />

                <div className="flex-1 flex flex-col min-w-0 md:ml-60 transition-all duration-300">
                    {/* Header mobile */}
                    <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <MobileMenuToggle />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                Configurações
                            </h1>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 hidden md:block">Configurações</h1>
                                    <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-1 md:mt-2">
                                        Gerencie as configurações da sua automação por conta do Instagram.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                                >
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Salvar Configurações
                                </button>
                            </div>

                            {message && (
                                <div className={`p-4 rounded-md mb-4 ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Seletor de Conta */}
                            <Card className="border-blue-200 dark:border-blue-900">
                                <CardHeader className="bg-blue-50/50 dark:bg-blue-900/20">
                                    <CardTitle>Selecionar Conta para Configurar</CardTitle>
                                    <CardDescription>
                                        As configurações abaixo serão aplicadas APENAS à conta selecionada.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col space-y-2 max-w-md">
                                        <Label>Conta do Instagram</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={currentAccountId}
                                            onChange={(e) => setCurrentAccountId(e.target.value)}
                                        >
                                            {instagramAccounts.map((acc: any) => (
                                                <option key={acc.id} value={acc.id}>
                                                    @{acc.username} ({acc.id})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            {loading ? (
                                <div className="flex py-12 items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="grid gap-6 md:grid-cols-2">
                                    {/* Ativação da Conta */}
                                    <Card className={!settings.isActive ? 'opacity-70' : ''}>
                                        <CardHeader>
                                            <CardTitle>Status da Conta</CardTitle>
                                            <CardDescription>
                                                Ative ou desative completamente as automações para esta conta.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base font-semibold mb-0">Conta Ativa</Label>
                                                    <p className="text-sm text-gray-500">
                                                        Permitir que a conta processe feeds e agendamentos
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={settings.isActive === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('isActive', checked)}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Configurações de Agendamento */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Agendamento e Limites</CardTitle>
                                            <CardDescription>
                                                Horários e limites de busca de notícias.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="mb-0">Ativar Agendamento Automático</Label>
                                                <Switch
                                                    checked={settings.schedulerEnabled === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('schedulerEnabled', checked)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-800">
                                                <div className="space-y-2">
                                                    <Label>Horário Inicial</Label>
                                                    <Input
                                                        type="time"
                                                        value={settings.postingTimes?.start || '08:00'}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('postingTimes', 'start', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Horário Final</Label>
                                                    <Input
                                                        type="time"
                                                        value={settings.postingTimes?.end || '22:00'}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('postingTimes', 'end', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                                    <Label>Intervalo entre posts (minutos)</Label>
                                                    <Input
                                                        type="number"
                                                        value={settings.postingTimes?.interval || 120}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('postingTimes', 'interval', parseInt(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                                    <Label>Qtd. de Top Notícias (por Fonte)</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max="20"
                                                        value={settings.SCRAPER_LIMIT_PER_SOURCE || 2}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('SCRAPER_LIMIT_PER_SOURCE', parseInt(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Canais de Publicação */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Canais de Publicação</CardTitle>
                                            <CardDescription>
                                                Onde as notícias devem ser postadas para esta conta.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="mb-0">Instagram Feed</Label>
                                                    <p className="text-xs text-gray-500">Postar imagens no feed do Instagram</p>
                                                </div>
                                                <Switch
                                                    checked={settings.CHANNEL_INSTAGRAM_FEED === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('CHANNEL_INSTAGRAM_FEED', checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="mb-0">Instagram Story</Label>
                                                    <p className="text-xs text-gray-500">Postar imagens curtas no Story</p>
                                                </div>
                                                <Switch
                                                    checked={settings.CHANNEL_INSTAGRAM_STORY === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('CHANNEL_INSTAGRAM_STORY', checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="mb-0">Canal do WhatsApp</Label>
                                                    <p className="text-xs text-gray-500">Enviar mensagens de texto para WhatsApp</p>
                                                </div>
                                                <Switch
                                                    checked={settings.CHANNEL_WHATSAPP === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('CHANNEL_WHATSAPP', checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="mb-0">Instagram Reels</Label>
                                                    <p className="text-xs text-gray-500">Postar vídeos curtos no Reels</p>
                                                </div>
                                                <Switch
                                                    checked={settings.CHANNEL_INSTAGRAM_REELS === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('CHANNEL_INSTAGRAM_REELS', checked)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <Label className="mb-0">YouTube Shorts</Label>
                                                    <p className="text-xs text-gray-500">Postar vídeos splitscreen no YouTube Shorts</p>
                                                </div>
                                                <Switch
                                                    checked={settings.CHANNEL_YOUTUBE_SHORTS === true}
                                                    onCheckedChange={(checked: boolean) => updateSetting('CHANNEL_YOUTUBE_SHORTS', checked)}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Configurações de Imagem (Gerais) */}
                                    <Card className="md:col-span-2">
                                        <CardHeader>
                                            <CardTitle>Configurações de Design</CardTitle>
                                            <CardDescription>Estilo e cores para as composições de imagem.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Estilo Principal</Label>
                                                <select
                                                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={settings.imageStyle || 'modern'}
                                                    onChange={(e) => updateSetting('imageStyle', e.target.value)}
                                                >
                                                    <option value="modern">Moderno & Clean</option>
                                                    <option value="newspaper">Jornal Tradicional</option>
                                                    <option value="tech">Tecnologia/Cyber</option>
                                                    <option value="minimalist">Minimalista</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Cor Primária da Conta (Hex)</Label>
                                                <div className="flex gap-2">
                                                    <div
                                                        className="w-10 h-10 rounded border dark:border-gray-600 shrink-0"
                                                        style={{ backgroundColor: settings.primaryColor || '#1a1a1a' }}
                                                    />
                                                    <Input
                                                        value={settings.primaryColor || '#1a1a1a'}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('primaryColor', e.target.value)}
                                                        placeholder="#1a1a1a"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Configurações Específicas: Feed */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Layout para Feed (1:1)</CardTitle>
                                            <CardDescription>
                                                (Recomendado: 1080x1080)
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Título (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.feed_layout?.fontSizeTitle || 48}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('feed_layout', 'fontSizeTitle', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Corpo (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.feed_layout?.fontSizeBody || 32}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('feed_layout', 'fontSizeBody', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Opacidade Overlay Fundo (0 a 1)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="1"
                                                    value={settings.feed_layout?.overlayAlpha ?? 0.6}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('feed_layout', 'overlayAlpha', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Configurações Específicas: Story */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Layout para Story (9:16)</CardTitle>
                                            <CardDescription>
                                                (Recomendado: 1080x1920)
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Título (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.story_layout?.fontSizeTitle || 60}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('story_layout', 'fontSizeTitle', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Corpo (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.story_layout?.fontSizeBody || 40}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('story_layout', 'fontSizeBody', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Opacidade Overlay Fundo (0 a 1)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="1"
                                                    value={settings.story_layout?.overlayAlpha ?? 0.5}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('story_layout', 'overlayAlpha', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Configurações Específicas: Reels */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Layout para Reels (9:16)</CardTitle>
                                            <CardDescription>
                                                (Recomendado: 1080x1920)
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Título (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.reels_layout?.fontSizeTitle || 60}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('reels_layout', 'fontSizeTitle', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tamanho Fonte - Corpo (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={settings.reels_layout?.fontSizeBody || 40}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('reels_layout', 'fontSizeBody', parseInt(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Opacidade Overlay Fundo (0 a 1)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="1"
                                                    value={settings.reels_layout?.overlayAlpha ?? 0.5}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNestedSetting('reels_layout', 'overlayAlpha', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Temas e Fontes de Dados */}
                                    <Card className="md:col-span-2">
                                        <CardHeader>
                                            <CardTitle>Temas e Fontes de Dados Customizadas</CardTitle>
                                            <CardDescription>
                                                Especifique temas para direcionar a Inteligência Artificial e adicione fontes de notícias exclusivas para esta conta.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="space-y-2">
                                                <Label>Temas e Instruções para Niche/Conta (Opcional)</Label>
                                                <p className="text-xs text-gray-500 mb-2">Exemplo: "Focar em notícias sobre criptomoedas com tom bem-humorado", ou "Cobertura apenas sobre economia verde".</p>
                                                <textarea
                                                    className="flex min-h-[100px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Instruções de tema para o LLM..."
                                                    value={settings.THEMES || ''}
                                                    onChange={(e) => updateSetting('THEMES', e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <Label>Fontes de RSS / Atom</Label>
                                                        <p className="text-xs text-gray-500">Deixe vazio para usar as fontes padrão (InfoMoney, Exame, G1). As fontes precisam ser links RSS válidos.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const sources = Array.isArray(settings.DATA_SOURCES) ? [...settings.DATA_SOURCES] : [];
                                                            sources.push({ name: '', url: '' });
                                                            updateSetting('DATA_SOURCES', sources);
                                                        }}
                                                        className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-md font-medium"
                                                    >
                                                        + Adicionar Fonte
                                                    </button>
                                                </div>

                                                {(Array.isArray(settings.DATA_SOURCES) ? settings.DATA_SOURCES : []).length === 0 && (
                                                    <div className="p-4 bg-gray-50 border rounded-md dark:bg-gray-800/50 dark:border-gray-700 text-sm text-gray-500 text-center">
                                                        Nenhuma fonte customizada. O sistema usará as fontes padrão.
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    {(Array.isArray(settings.DATA_SOURCES) ? settings.DATA_SOURCES : []).map((source: any, idx: number) => (
                                                        <div key={idx} className="flex gap-3 items-start">
                                                            <div className="flex-1 space-y-2">
                                                                <Input
                                                                    placeholder="Nome da Fonte (Ex: Reuters USA)"
                                                                    value={source.name || ''}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const newSources = [...settings.DATA_SOURCES];
                                                                        newSources[idx] = { ...newSources[idx], name: e.target.value };
                                                                        updateSetting('DATA_SOURCES', newSources);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-[2] space-y-2">
                                                                <Input
                                                                    placeholder="URL do RSS (Ex: https://feeds.reuters.com/...)"
                                                                    value={source.url || ''}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const newSources = [...settings.DATA_SOURCES];
                                                                        newSources[idx] = { ...newSources[idx], url: e.target.value };
                                                                        updateSetting('DATA_SOURCES', newSources);
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newSources = settings.DATA_SOURCES.filter((_: any, i: number) => i !== idx);
                                                                    updateSetting('DATA_SOURCES', newSources);
                                                                }}
                                                                className="h-10 px-3 text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200"
                                                            >
                                                                Remover
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Monitoramento de Instagram (Repost) */}
                                    <Card className="md:col-span-2">
                                        <CardHeader>
                                            <CardTitle>Monitoramento de Instagram (Repost)</CardTitle>
                                            <CardDescription>
                                                Adicione contas do Instagram para monitorar. O sistema irá repostar automaticamente publicações que atingirem os critérios de engajamento definidos. (Apenas perfis comerciais/criadores públicos).
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label>Contas Alvo (@)</Label>
                                                </div>
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
                                                    className="text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded-md font-medium"
                                                >
                                                    + Adicionar Conta Alvo
                                                </button>
                                            </div>

                                            {(Array.isArray(settings.IG_MONITOR_TARGETS) ? settings.IG_MONITOR_TARGETS : []).length === 0 && (
                                                <div className="p-4 bg-gray-50 border rounded-md dark:bg-gray-800/50 dark:border-gray-700 text-sm text-gray-500 text-center">
                                                    Nenhuma conta sendo monitorada.
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {(Array.isArray(settings.IG_MONITOR_TARGETS) ? settings.IG_MONITOR_TARGETS : []).map((target: any, idx: number) => (
                                                    <div key={idx} className="flex flex-col gap-3 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                                                        <div className="flex gap-3 items-start">
                                                            <div className="flex-[2] space-y-2">
                                                                <Label className="text-xs">Username (Sem o @)</Label>
                                                                <Input
                                                                    placeholder="Ex: forbes"
                                                                    value={target.username || ''}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const newTargets = [...settings.IG_MONITOR_TARGETS];
                                                                        newTargets[idx] = { ...newTargets[idx], username: e.target.value.replace('@', '') };
                                                                        updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <Label className="text-xs">Mínimo Curtidas</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="5000"
                                                                    value={target.minLikes || 0}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const newTargets = [...settings.IG_MONITOR_TARGETS];
                                                                        newTargets[idx] = { ...newTargets[idx], minLikes: parseInt(e.target.value) || 0 };
                                                                        updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <Label className="text-xs">Mínimo Comentários</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="100"
                                                                    value={target.minComments || 0}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const newTargets = [...settings.IG_MONITOR_TARGETS];
                                                                        newTargets[idx] = { ...newTargets[idx], minComments: parseInt(e.target.value) || 0 };
                                                                        updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col space-y-2 pt-6">
                                                                <Label className="text-xs">Postar Original</Label>
                                                                <div className="flex items-center h-10">
                                                                    <Switch
                                                                        checked={target.postOriginal === true}
                                                                        onCheckedChange={(checked: boolean) => {
                                                                            const newTargets = [...settings.IG_MONITOR_TARGETS];
                                                                            newTargets[idx] = { ...newTargets[idx], postOriginal: checked };
                                                                            updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="pt-6">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newTargets = settings.IG_MONITOR_TARGETS.filter((_: any, i: number) => i !== idx);
                                                                        updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                    }}
                                                                    className="h-10 px-3 text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Canais de Publicação por Target */}
                                                        <div className="border-t dark:border-gray-700 pt-3 mt-1">
                                                            <Label className="text-[10px] uppercase text-gray-400 mb-2">Canais de Publicação para esta conta</Label>
                                                            <div className="flex flex-wrap gap-4">
                                                                {[
                                                                    { key: 'feed', label: 'Feed' },
                                                                    { key: 'story', label: 'Story' },
                                                                    { key: 'reels', label: 'Reels' },
                                                                    { key: 'shorts', label: 'YouTube Shorts' },
                                                                    { key: 'whatsapp', label: 'WhatsApp' }
                                                                ].map((channel) => (
                                                                    <div key={channel.key} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`target-${idx}-${channel.key}`}
                                                                            checked={target.channels ? target.channels[channel.key] !== false : true}
                                                                            onChange={(e) => {
                                                                                const newTargets = [...settings.IG_MONITOR_TARGETS];
                                                                                const updatedChannels = { 
                                                                                    feed: true, story: true, reels: true, shorts: true, whatsapp: true,
                                                                                    ...(target.channels || {})
                                                                                };
                                                                                updatedChannels[channel.key as keyof typeof updatedChannels] = e.target.checked;
                                                                                newTargets[idx] = { ...newTargets[idx], channels: updatedChannels };
                                                                                updateSetting('IG_MONITOR_TARGETS', newTargets);
                                                                            }}
                                                                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                        />
                                                                        <label htmlFor={`target-${idx}-${channel.key}`} className="text-xs cursor-pointer">{channel.label}</label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
}
