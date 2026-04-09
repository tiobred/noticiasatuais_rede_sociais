export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TopBar } from '@/components/layout/TopBar';
import { DeletePostButton } from '@/components/dashboard/DeletePostButton';
import { FileText, Database, Tag, ExternalLink } from 'lucide-react';

export default async function PostsPage() {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: { publications: true },
        take: 100
    });

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar 
                title="Histórico de Posts" 
                subtitle="Acervo de notícias processadas e enviadas"
            />
            
            <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in">
                <div className="page-container">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Database className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-text-primary tracking-tight">Banco de Posts</h2>
                            <p className="text-sm text-text-muted font-medium">Total de {posts.length} registros encontrados</p>
                        </div>
                    </div>

                    {/* Mobile: Grid of Cards */}
                    <div className="md:hidden space-y-4">
                        {posts.length === 0 ? (
                            <div className="card p-8 text-center text-text-muted">
                                Nenhum post encontrado.
                            </div>
                        ) : (
                            posts.map((post) => (
                                <div key={post.id} className="card p-5 space-y-4 border-border-strong bg-bg-surface/40">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                                                {format(new Date(post.createdAt), "dd MMM HH:mm", { locale: ptBR })}
                                            </div>
                                            <h3 className="font-bold text-text-primary leading-tight line-clamp-2">
                                                {post.title}
                                            </h3>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                            post.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            post.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        }`}>
                                            {post.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 py-3 border-y border-border-subtle/50">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Origem</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded bg-purple-500/10 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                </div>
                                                <span className="text-xs font-semibold text-text-secondary truncate max-w-[120px]">
                                                    {post.sourceName || 'System'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Canais</p>
                                            <div className="flex gap-1.5 justify-end">
                                                {post.publications.length > 0 ? (
                                                    post.publications.map((pub, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            title={pub.channel}
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                                                pub.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'
                                                            }`}
                                                        >
                                                            {pub.channel === 'INSTAGRAM_FEED' && <span className="text-[8px] font-black">IF</span>}
                                                            {pub.channel === 'INSTAGRAM_STORY' && <span className="text-[8px] font-black">IS</span>}
                                                            {pub.channel === 'LINKEDIN' && <span className="text-[8px] font-black">LI</span>}
                                                            {pub.channel === 'WHATSAPP' && <span className="text-[8px] font-black">WA</span>}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-text-muted font-medium italic">Nenhum</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <a
                                            href={`/posts/${post.id}`}
                                            className="flex-1 btn btn-secondary !py-2.5 !px-3 !rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Ver Detalhes
                                        </a>
                                        <DeletePostButton id={post.id} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop: Table */}
                    <div className="hidden md:block card !p-0 overflow-hidden border-border-strong bg-bg-surface/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-subtle bg-bg-elevated/50 text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">
                                        <th className="p-5 font-black">Data</th>
                                        <th className="p-5 font-black">Título</th>
                                        <th className="p-5 font-black">Fonte</th>
                                        <th className="p-5 font-black">Status</th>
                                        <th className="p-5 font-black">Canais</th>
                                        <th className="p-5 font-black text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-text-muted font-medium italic">
                                                Nenhum post encontrado para este filtro.
                                            </td>
                                        </tr>
                                    ) : (
                                        posts.map(post => (
                                            <tr key={post.id} className="border-b border-border-subtle/50 hover:bg-bg-elevated/30 transition-all duration-300 group">
                                                <td className="p-5 whitespace-nowrap text-text-secondary text-xs font-bold font-mono">
                                                    {format(new Date(post.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                                                </td>
                                                <td className="p-5 max-w-md">
                                                    <p className="text-sm font-bold text-text-primary line-clamp-1 group-hover:text-purple-400 transition-colors">
                                                        {post.title}
                                                    </p>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-purple-500/40" />
                                                        <span className="text-xs font-bold text-text-secondary">
                                                            {post.sourceName || 'Manual'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                        post.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        post.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-purple'
                                                    }`}>
                                                        {post.status}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex gap-2">
                                                        {post.publications.map((pub, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                title={pub.channel}
                                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                                                                    pub.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-bg-elevated text-text-muted border border-border-subtle'
                                                                }`}
                                                            >
                                                                {pub.channel === 'INSTAGRAM_FEED' && <span className="text-[9px] font-black">IF</span>}
                                                                {pub.channel === 'INSTAGRAM_STORY' && <span className="text-[9px] font-black">IS</span>}
                                                                {pub.channel === 'LINKEDIN' && <span className="text-[9px] font-black">LI</span>}
                                                                {pub.channel === 'WHATSAPP' && <span className="text-[9px] font-black">WA</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                        <a
                                                            href={`/posts/${post.id}`}
                                                            className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-all border border-purple-500/20"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </a>
                                                        <DeletePostButton id={post.id} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
