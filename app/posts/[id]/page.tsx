import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TopBar } from '@/components/layout/TopBar';
import { DeletePostButton } from '@/components/dashboard/DeletePostButton';
import { 
    Calendar, 
    Hash, 
    Share2, 
    Info, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    ArrowLeft,
    Image as ImageIcon,
    FileText,
    Globe
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getPost(id: string) {
    const post = await prisma.post.findUnique({
        where: { id },
        include: {
            publications: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    return post;
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await getPost(id);

    if (!post) {
        notFound();
    }

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar 
                title="Detalhes do Post" 
                subtitle={post.title}
            />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container max-w-5xl mx-auto">
                    {/* Back Button */}
                    <Link 
                        href="/posts"
                        className="inline-flex items-center gap-2 text-text-muted hover:text-purple-400 font-bold text-xs uppercase tracking-widest mb-8 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Voltar para o Histórico
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Content Section */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card overflow-hidden">
                                {post.imageUrl && (
                                    <div className="relative aspect-video w-full bg-bg-elevated border-b border-border-subtle overflow-hidden">
                                        <Image
                                            src={post.imageUrl}
                                            alt={post.title}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    </div>
                                )}
                                
                                <div className="p-6 sm:p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                post.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                post.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple'
                                            }`}>
                                                {post.status}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(new Date(post.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>

                                        <h1 className="text-2xl sm:text-3xl font-black text-text-primary leading-tight">
                                            {post.title}
                                        </h1>
                                    </div>

                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">
                                            {post.body}
                                        </p>
                                    </div>

                                    {post.hashtags.length > 0 && (
                                        <div className="pt-6 border-t border-border-subtle/50">
                                            <h3 className="flex items-center gap-2 text-xs font-black text-text-muted uppercase tracking-[0.2em] mb-4">
                                                <Hash className="w-4 h-4 text-purple-400" />
                                                Hashtags
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {post.hashtags.map((tag, idx) => (
                                                    <span key={idx} className="px-3 py-1 rounded-lg bg-bg-elevated border border-border-subtle group hover:border-purple-500/50 transition-all">
                                                        <span className="text-purple-400/50 group-hover:text-purple-400 transition-colors mr-1">#</span>
                                                        <span className="text-xs font-bold text-text-secondary">{tag}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: Details & Publications */}
                        <div className="space-y-6">
                            {/* Metadata Card */}
                            <div className="card p-6 space-y-6">
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Info className="w-4 h-4 text-purple-400" />
                                    Informações
                                </h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-border-subtle/30">
                                        <span className="text-xs font-bold text-text-muted">Fonte</span>
                                        <span className="text-xs font-bold text-text-primary px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                                            {post.sourceName || 'Sistema'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-border-subtle/30">
                                        <span className="text-xs font-bold text-text-muted">ID Externo</span>
                                        <span className="text-[10px] font-mono font-bold text-text-secondary truncate max-w-[120px]" title={post.sourceId}>
                                            {post.sourceId || '-'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs font-bold text-text-muted">Ações</span>
                                        <DeletePostButton id={post.id} redirectTo="/posts" />
                                    </div>
                                </div>
                            </div>

                            {/* Publications Status */}
                            <div className="card p-6 space-y-6">
                                <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-purple-400" />
                                    Canais de Envio
                                </h3>

                                <div className="space-y-4">
                                    {post.publications.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-xs text-text-muted font-medium italic">Nenhuma tentativa de publicação registrada.</p>
                                        </div>
                                    ) : (
                                        post.publications.map((pub, idx) => (
                                            <div key={idx} className="flex gap-4 p-4 rounded-xl bg-bg-elevated/50 border border-border-subtle/50">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    pub.status === 'SUCCESS' ? 'bg-green-500/10 text-green-400' : 
                                                    pub.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'
                                                }`}>
                                                    {pub.status === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : 
                                                     pub.status === 'FAILED' ? <XCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">
                                                            {pub.channel.replace('_', ' ')}
                                                        </h4>
                                                        <span className="text-[9px] font-bold text-text-muted">
                                                            {format(new Date(pub.createdAt), "HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-text-secondary mb-1">
                                                        Conta: {pub.accountId || 'Padrão'}
                                                    </p>
                                                    {pub.error && (
                                                        <p className="text-[10px] text-red-400 italic font-medium leading-tight">
                                                            Erro: {pub.error}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

