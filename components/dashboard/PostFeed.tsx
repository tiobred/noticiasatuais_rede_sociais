'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Instagram, Linkedin, MessageCircle, CheckCircle, XCircle, Clock, Trash2, CheckSquare, Square, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { formatDateBR, formatDateShortBR } from '@/lib/utils';
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
    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const router = useRouter();

    const handleImageError = (postId: string) => {
        setImageErrors(prev => ({ ...prev, [postId]: true }));
    };

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
        <div id="post-feed" className="animate-in space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-6">
                    <h3 className="section-label !mb-0 text-text-primary">Atividade Recente</h3>
                    {posts.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs text-text-muted hover:text-purple-400 transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider"
                        >
                            {selectedIds.length === posts.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            {selectedIds.length === posts.length ? 'Desmarcar' : 'Selecionar Tudo'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400/20 text-xs font-bold transition-all border border-red-400/20"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeleting ? 'Excluindo...' : `Excluir (${selectedIds.length})`}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                {posts.length === 0 ? (
                    <div className="card text-center py-20 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-3xl bg-bg-elevated border border-border-subtle flex items-center justify-center mb-6">
                            <Clock className="w-8 h-8 text-text-muted" />
                        </div>
                        <p className="text-lg font-bold text-text-primary">Sem publicações recentes</p>
                        <p className="text-sm text-text-muted mt-2">Os posts gerados pelos agentes aparecerão aqui.</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <article
                            key={post.id}
                            className={`
                                relative flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5 card cursor-default group
                                ${selectedIds.includes(post.id) ? 'ring-1 ring-purple-500 bg-purple-500/5' : ''}
                            `}
                        >
                            {/* Selection Checkbox */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelect(post.id);
                                    }}
                                    className={`w-6 h-6 sm:w-5 sm:h-5 rounded-lg border flex items-center justify-center transition-all
                                        ${selectedIds.includes(post.id) 
                                            ? 'bg-purple-500 border-purple-500 shadow-purple' 
                                            : 'border-border-strong group-hover:border-purple-500/50 bg-bg-base/50'
                                        }`}
                                >
                                    {selectedIds.includes(post.id) && <CheckSquare className="w-4 h-4 text-white" />}
                                </button>
                            </div>

                            {/* Thumbnail / Symbol */}
                            <div className="flex-shrink-0 relative w-full sm:w-24 h-48 sm:h-24 rounded-2xl overflow-hidden bg-bg-elevated border border-border-subtle group-hover:border-border-brand transition-all">
                                {post.imageUrl && !imageErrors[post.id] ? (
                                    <Image
                                        src={post.imageUrl}
                                        alt={post.title}
                                        fill
                                        sizes="(max-width: 640px) 100vw, 96px"
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                        unoptimized
                                        onError={() => handleImageError(post.id)}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-text-muted bg-bg-surface/50">
                                        {imageErrors[post.id] ? (
                                            <>
                                                <AlertCircle className="w-8 h-8 opacity-20 mb-1" />
                                                <span className="text-[10px] font-bold uppercase opacity-20">Erro ao carregar</span>
                                            </>
                                        ) : (
                                            <FileText className="w-8 h-8 opacity-20" />
                                        )}
                                    </div>
                                )}

                                {/* Channel Overlay */}
                                <div className="absolute bottom-1 right-1 flex gap-1">
                                    {post.publications.slice(0, 3).map((pub, i) => (
                                         <div key={i} className={`w-6 h-6 rounded-lg glass flex items-center justify-center text-white p-1.5 shadow-xl`}>
                                            {channelIcons[pub.channel]}
                                         </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {/* Header Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-bg-elevated text-purple-400 font-black px-2 py-0.5 rounded border border-border-subtle uppercase tracking-wider whitespace-nowrap">
                                            {post.sourceName}
                                        </span>
                                        <span className="text-[11px] text-text-muted font-bold flex items-center gap-1.5 whitespace-nowrap">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="block sm:hidden">{formatDateShortBR(new Date(post.createdAt))}</span>
                                            <span className="hidden sm:block">{formatDateBR(new Date(post.createdAt))}</span>
                                        </span>
                                    </div>
                                    
                                    <div className="sm:ml-auto pr-8">
                                        <span className={`badge text-[10px] sm:text-xs ${
                                            post.status === 'PUBLISHED' ? 'badge-success' : 
                                            post.status === 'PROCESSED' ? 'badge-brand' : 'badge-pending'
                                        }`}>
                                            {post.status}
                                        </span>
                                    </div>
                                </div>


                                {/* Title */}
                                <h4 className="text-sm sm:text-base font-bold text-text-primary leading-tight mb-2 pr-6 group-hover:text-purple-400 transition-colors line-clamp-2 sm:truncate">
                                    {post.title}
                                </h4>

                                {/* Body preview */}
                                <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 sm:line-clamp-1 leading-relaxed">{post.body}</p>


                                {/* Footer: Account specific status */}
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    {post.publications.map((pub, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-bg-base border border-border-subtle transition-all hover:border-border-brand
                                                ${pub.status === 'SUCCESS' ? 'text-green-400' :
                                                pub.status === 'FAILED' ? 'text-red-400' : 'text-text-muted'}`}
                                            title={`${pub.channel}: ${pub.status}`}
                                        >
                                            <span className="opacity-70 scale-90">{channelIcons[pub.channel]}</span>
                                            {pub.accountId && (
                                                <span className="text-[10px] font-bold tracking-tight max-w-[80px] truncate uppercase">{pub.accountId}</span>
                                            )}
                                            {pub.status === 'SUCCESS' ? (
                                                <CheckCircle className="w-3.5 h-3.5" />
                                            ) : pub.status === 'FAILED' ? (
                                                <XCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                            )}
                                        </div>
                                    ))}
                                    
                                    <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
}
