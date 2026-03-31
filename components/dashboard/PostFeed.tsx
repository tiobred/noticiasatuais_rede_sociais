'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Instagram, Linkedin, MessageCircle, CheckCircle, XCircle, Clock, Trash2, CheckSquare, Square } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PostDisplay {
    id: string;
    title: string;
    body: string;
    imageUrl?: string | null;
    hashtags: string[];
    sourceName: string;
    createdAt: string;
    status: string;
    publications: {
        channel: string;
        status: string;
        accountId?: string | null;
    }[];
}

const channelIcons: Record<string, React.ReactNode> = {
    INSTAGRAM_FEED: <Instagram className="w-3.5 h-3.5" />,
    INSTAGRAM_STORY: <Instagram className="w-3.5 h-3.5 opacity-60" />,
    LINKEDIN: <Linkedin className="w-3.5 h-3.5" />,
    WHATSAPP: <MessageCircle className="w-3.5 h-3.5" />,
};

interface PostFeedProps {
    posts: PostDisplay[];
}

export function PostFeed({ posts }: PostFeedProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === posts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(posts.map(p => p.id));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0 || !confirm(`Deseja excluir ${selectedIds.length} posts?`)) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/posts/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (res.ok) {
                setSelectedIds([]);
                router.refresh();
            } else {
                alert('Erro ao excluir posts');
            }
        } catch (error) {
            console.error(error);
            alert('Erro na requisição');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div id="post-feed" className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-white">Posts Publicados</h3>
                    {posts.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5"
                        >
                            {selectedIds.length === posts.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            Selecionar Todos
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeleting ? 'Excluindo...' : `Excluir (${selectedIds.length})`}
                        </button>
                    )}
                    <span className="text-xs text-white/30 font-mono">{posts.length} posts</span>
                </div>
            </div>

            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto scrollable">
                {posts.length === 0 ? (
                    <div className="px-5 py-16 text-center animate-fade-in">
                        <div className="w-12 h-12 rounded-2xl bg-surface-800 border border-white/5 flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-6 h-6 text-white/20" />
                        </div>
                        <p className="text-sm font-medium text-white/50">Nenhum post publicado ainda</p>
                        <p className="text-xs text-white/30 mt-1.5">Execute o pipeline para começar a gerar conteúdo</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <article
                            key={post.id}
                            className={`flex gap-4 p-4 hover:bg-white/2 transition-colors animate-fade-in group ${selectedIds.includes(post.id) ? 'bg-white/5' : ''
                                }`}
                        >
                            {/* Selection Checkbox */}
                            <div className="flex-shrink-0 flex items-start pt-1">
                                <button
                                    onClick={() => toggleSelect(post.id)}
                                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center
                    ${selectedIds.includes(post.id) ? 'bg-brand-500 border-brand-500' : 'border-white/10 group-hover:border-white/20'}`}
                                >
                                    {selectedIds.includes(post.id) && <CheckSquare className="w-3 h-3 text-white" />}
                                </button>
                            </div>

                            {/* Thumbnail */}
                            {post.imageUrl && (
                                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface-700">
                                    <Image
                                        src={post.imageUrl}
                                        alt={post.title}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                {/* Source + Time */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-brand-400 font-medium">{post.sourceName}</span>
                                    <span className="text-xs text-white/20">•</span>
                                    <span className="text-xs text-white/30 font-mono">
                                        {formatDateBR(new Date(post.createdAt))}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-auto uppercase font-bold tracking-wider
                    ${post.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-400' :
                                            post.status === 'PROCESSED' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-white/30'}`}>
                                        {post.status}
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">{post.title}</h4>

                                {/* Body preview */}
                                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{post.body}</p>

                                {/* Channels status */}
                                <div className="flex items-center gap-2 mt-2">
                                    {post.publications.map((pub, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
                        ${pub.status === 'SUCCESS' ? 'text-emerald-400/80' :
                                                    pub.status === 'FAILED' ? 'text-red-400/80' : 'text-white/30'}`}
                                            title={`${pub.channel}: ${pub.status}${pub.accountId ? ` (Conta: ${pub.accountId})` : ''}`}
                                        >
                                            {channelIcons[pub.channel] ?? <Clock className="w-3 h-3" />}
                                            {pub.accountId && (
                                                <span className="font-mono opacity-80 max-w-20 truncate">{pub.accountId}</span>
                                            )}
                                            {pub.status === 'SUCCESS' ? (
                                                <CheckCircle className="w-2.5 h-2.5" />
                                            ) : pub.status === 'FAILED' ? (
                                                <XCircle className="w-2.5 h-2.5" />
                                            ) : (
                                                <Clock className="w-2.5 h-2.5" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
}
