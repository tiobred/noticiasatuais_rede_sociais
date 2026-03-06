import { TopBar } from '@/components/layout/TopBar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AgentStatus } from '@/components/dashboard/AgentStatus';
import { PostFeed } from '@/components/dashboard/PostFeed';
import prisma from '@/lib/db';
import { FileText, TrendingUp, Clock, Wifi } from 'lucide-react';

async function getDashboardData() {
    const [
        totalPosts,
        postsToday,
        lastRun,
        recentRuns,
        recentPosts,
        publishedCount,
    ] = await Promise.all([
        prisma.post.count(),
        prisma.post.count({
            where: {
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
        }),
        prisma.agentRun.findFirst({ orderBy: { startedAt: 'desc' } }),
        prisma.agentRun.findMany({
            orderBy: { startedAt: 'desc' },
            take: 10,
        }),
        prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                publications: { select: { channel: true, status: true, accountId: true } },
            },
        }),
        prisma.socialPublication.count({ where: { status: 'SUCCESS' } }),
    ]);

    return { totalPosts, postsToday, lastRun, recentRuns, recentPosts, publishedCount };
}

export default async function DashboardPage() {
    const { totalPosts, postsToday, lastRun, recentRuns, recentPosts, publishedCount } =
        await getDashboardData();

    const lastRunTime = lastRun
        ? new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        }).format(new Date(lastRun.startedAt))
        : 'Nunca';

    return (
        <div className="flex flex-col min-h-screen">
            <TopBar
                title="Dashboard"
                subtitle="Monitor em tempo real — glint.trade → Instagram · LinkedIn · WhatsApp"
            />

            <div className="flex-1 p-6 space-y-6">
                {/* Métricas */}
                <section id="metrics-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        id="metric-posts-hoje"
                        label="Posts Hoje"
                        value={postsToday}
                        icon={TrendingUp}
                        accent="green"
                        change={postsToday > 0 ? `+${postsToday} hoje` : 'Nenhum ainda'}
                        changeType={postsToday > 0 ? 'positive' : 'neutral'}
                    />
                    <MetricCard
                        id="metric-posts-total"
                        label="Posts Total"
                        value={totalPosts}
                        icon={FileText}
                        accent="blue"
                    />
                    <MetricCard
                        id="metric-publicacoes"
                        label="Publicações"
                        value={publishedCount}
                        icon={Wifi}
                        accent="green"
                        change="Em todos os canais"
                        changeType="neutral"
                    />
                    <MetricCard
                        id="metric-ultimo-run"
                        label="Último Run"
                        value={lastRunTime}
                        icon={Clock}
                        accent={lastRun?.status === 'FAILED' ? 'red' : 'blue'}
                        change={lastRun?.status === 'FAILED' ? 'Falha detectada' : lastRun?.status === 'SUCCESS' ? 'Sucesso' : 'Aguardando'}
                        changeType={lastRun?.status === 'FAILED' ? 'negative' : lastRun?.status === 'SUCCESS' ? 'positive' : 'neutral'}
                    />
                </section>

                {/* Feed + Agentes */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <PostFeed
                            posts={recentPosts.map(p => ({
                                id: p.id,
                                title: p.title,
                                body: p.body,
                                imageUrl: p.imageUrl,
                                hashtags: p.hashtags,
                                sourceName: p.sourceName,
                                createdAt: p.createdAt.toISOString(),
                                publications: p.publications.map(pub => ({
                                    channel: pub.channel,
                                    status: pub.status,
                                    accountId: pub.accountId,
                                })),
                            }))}
                        />
                    </div>

                    <div className="lg:col-span-1">
                        <AgentStatus
                            runs={recentRuns.map(r => ({
                                id: r.id,
                                agentName: r.agentName,
                                status: r.status as 'RUNNING' | 'SUCCESS' | 'FAILED',
                                postsFound: r.postsFound,
                                postsNew: r.postsNew,
                                postsPublished: r.postsPublished,
                                error: r.error,
                                startedAt: r.startedAt.toISOString(),
                                finishedAt: r.finishedAt?.toISOString() ?? null,
                            }))}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
