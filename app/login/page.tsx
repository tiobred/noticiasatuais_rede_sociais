'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

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
            setError('Senha incorreta');
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-surface-900 border border-surface-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative gradients */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500"></div>
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-primary-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
                    <p className="text-surface-400 text-center">Digite a senha para gerenciar o Notícia da Hora</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha do Dashboard"
                            className="w-full bg-surface-800 border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-surface-500"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-primary-900/20 disabled:opacity-50"
                    >
                        {loading ? 'Entrando...' : 'Acessar Dashboard'}
                    </button>
                </form>

                <p className="mt-8 text-center text-xs text-surface-500">
                    Propriedade privada de glint.trade
                </p>
            </div>
        </div>
    );
}
