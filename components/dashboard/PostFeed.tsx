import Image from 'next/image';
import { Instagram, Linkedin, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDateBR } from '@/lib/utils';

interface PostDisplay {
    id: string;
    title: string;
    body: string;
    imageUrl?: string | null;
    hashtags: string[];
    sourceName: string;
    createdAt: string;
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
    return (
        <div id="post-feed" className="glass rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Posts Publicados</h3>
                <span className="text-xs text-white/30 font-mono">{posts.length} posts</span>
            </div>

            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {posts.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                        <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
                        <p className="text-sm text-white/30">Nenhum post ainda</p>
                        <p className="text-xs text-white/20 mt-1">Execute o pipeline para começar</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <article key={post.id} className="flex gap-4 p-4 hover:bg-white/2 transition-colors animate-fade-in">
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
