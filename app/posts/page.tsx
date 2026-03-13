export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { SidebarProvider } from '@/components/layout/SidebarContext';
import { MobileMenuToggle } from '@/components/layout/MobileMenuToggle';
import { DeletePostButton } from '@/components/dashboard/DeletePostButton';

export default async function PostsPage() {
    const posts = await prisma.post.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        include: { publications: true }
    });

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-[#06060a] text-zinc-100 font-sans">
                <Sidebar />
                <div className="md:ml-60 w-full flex-1 flex flex-col overflow-hidden">
                    <header className="flex justify-between items-center p-4 md:p-6 border-b border-zinc-800 bg-[#0a0a0f]">
                        <div className="flex items-center gap-3">
                            <MobileMenuToggle />
                            <div>
                                <h1 className="text-xl md:text-2xl font-semibold text-white">Histórico de Posts</h1>
                                <p className="text-xs md:text-sm text-zinc-400 mt-1 hidden sm:block">Acervo de notícias processadas e enviadas.</p>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-4 md:p-6 w-full">
                        <div className="bg-[#12121a] rounded-xl border border-zinc-800 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 bg-[#161622] text-zinc-400 text-sm">
                                            <th className="p-4 font-medium min-w-[140px]">Data</th>
                                            <th className="p-4 font-medium min-w-[200px]">Título</th>
                                            <th className="p-4 font-medium min-w-[120px]">Fonte</th>
                                            <th className="p-4 font-medium min-w-[120px]">Status</th>
                                            <th className="p-4 font-medium text-right min-w-[100px]">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-zinc-500">
                                                    Nenhum post processado ainda.
                                                </td>
                                            </tr>
                                        ) : (
                                            posts.map(post => (
                                                <tr key={post.id} className="border-b border-zinc-800/50 hover:bg-[#161622] transition-colors">
                                                    <td className="p-4 whitespace-nowrap text-zinc-300">
                                                        {format(new Date(post.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-zinc-200 line-clamp-1">{post.title}</div>
                                                        <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                                                            {post.tags.slice(0, 3).map(tag => (
                                                                <span key={tag} className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{tag}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className="text-sm text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded">
                                                            {post.sourceName}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`text-xs px-2 py-1 rounded font-medium ${post.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            post.status === 'PROCESSED' ? 'bg-blue-500/10 text-blue-500' :
                                                                post.status === 'FAILED' ? 'bg-red-500/10 text-red-500' :
                                                                    'bg-amber-500/10 text-amber-500'
                                                            }`}>
                                                            {post.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 whitespace-nowrap text-right flex justify-end">
                                                        <DeletePostButton id={post.id} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
