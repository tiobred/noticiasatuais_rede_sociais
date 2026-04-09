'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Zap, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Senha de segurança inválida');
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 relative overflow-hidden selection:bg-purple-500/30">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px]" />
            
            <div className="max-w-md w-full relative z-10 animate-fade-in-scale">
                <div className="flex justify-center mb-10">
                    <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-2xl bg-grad-primary flex items-center justify-center shadow-purple">
                            <Zap className="w-7 h-7 text-white fill-current" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-2xl font-black text-text-primary tracking-tighter leading-none">SOCIAL<span className="text-purple-400">POST</span></span>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Encrypted Access</span>
                         </div>
                    </div>
                </div>

                <div className="card !p-8 border-border-strong relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-grad-primary opacity-50" />
                    
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-black text-text-primary uppercase tracking-widest mb-2">Acesso Restrito</h1>
                        <p className="text-sm text-text-muted font-medium">Ambiente seguro de monitoramento</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Senha de Segurança</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-bg-elevated border border-border-subtle text-text-primary rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 transition-all placeholder:text-text-muted/30 font-mono tracking-widest"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 bg-red-400/5 border border-red-400/20 text-red-400 text-[11px] font-bold p-4 rounded-xl animate-in">
                                <ShieldAlert className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs transition-all flex items-center justify-center gap-2
                                ${loading 
                                    ? 'bg-bg-elevated text-text-muted border border-border-subtle cursor-wait' 
                                    : 'bg-grad-primary text-white shadow-purple hover:scale-[1.02] active:scale-[0.98]'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Autenticando...
                                </>
                            ) : (
                                'Entrar no Sistema'
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-border-subtle text-center">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40">
                             © 2024 SocialPost Engine · Todos os direitos reservados
                        </p>
                    </div>
                </div>
                
                <p className="text-center mt-8 text-[11px] font-bold text-text-muted/20 tracking-tighter hover:text-text-muted transition-colors cursor-default">
                    Unauthorized access will be logged and reported to network security.
                </p>
            </div>
        </div>
    );
}
