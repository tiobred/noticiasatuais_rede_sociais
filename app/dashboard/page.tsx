export const dynamic = 'force-dynamic';

import { TopBar } from '@/components/layout/TopBar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AgentStatus } from '@/components/dashboard/AgentStatus';
import { PostFeed } from '@/components/dashboard/PostFeed';
import { DashboardControls } from '@/components/dashboard/DashboardControls';
import prisma from '@/lib/db';
import { FileText, TrendingUp, Clock, Wifi } from 'lucide-react';
import { Channel, PostStatus } from '@prisma/client';

async function getDashboardData(searchParams: { status?: string; channel?: string; accountId?: string }) {
    const postWhere: any = {};
    if (searchParams.status) postWhere.status = searchParams.status as PostStatus;

    if (searchParams.channel || searchParams.accountId) {
        postWhere.publications = {
            some: {
                ...(searchParams.channel ? { channel: searchParams.channel as Channel } : {}),
                ...(searchParams.accountId ? { accountId: searchParams.accountId } : {}),
            },
        };
    }

    const [
        totalPosts,
        postsToday,
        lastRun,
        recentRuns,
        filteredPosts,
        publishedCount,
        lastPost,
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
            where: postWhere,
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                publications: { select: { channel: true, status: true, accountId: true } },
            },
        }),
        prisma.socialPublication.count({ where: { status: 'SUCCESS' } }),
        prisma.post.findFirst({
            where: { status: { in: [PostStatus.PROCESSED, PostStatus.PUBLISHED] } },
            orderBy: { createdAt: 'desc' },
            select: { title: true }
        }),
    ]);

    return { totalPosts, postsToday, lastRun, recentRuns, filteredPosts, publishedCount, latestNews: lastPost?.title };
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; channel?: string; accountId?: string }>;
}) {
    const filters = await searchParams;
    const { totalPosts, postsToday, lastRun, recentRuns, filteredPosts, publishedCount, latestNews } =
        await getDashboardData(filters);

    const allAccountsStr = process.env.INSTAGRAM_ACCOUNTS;
    let accounts: { id: string; name: string }[] = [];
    try {
        accounts = allAccountsStr ? JSON.parse(allAccountsStr).map((a: any) => ({ id: a.id, name: a.name })) : [];
    } catch (e) { }

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
                subtitle="Monitor em tempo real"
                news={latestNews}
            />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="page-container max-w-7xl mx-auto space-y-6 lg:space-y-8">
                    {/* Filtros e Controles */}
                    <div className="animate-fade-in-scale">
                        <DashboardControls accounts={accounts} />
                    </div>

                    {/* Métricas */}
                    <section id="metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 stagger-children">
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
                            accent="yellow"
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
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
                        <div className="lg:col-span-2 animate-slide-in-left">
                            <h2 className="section-label">Feed de Posts</h2>
                            <PostFeed
                                posts={filteredPosts.map(p => ({
                                    id: p.id,
                                    title: p.title,
                                    body: p.body,
                                    imageUrl: p.imageUrl,
                                    hashtags: p.hashtags,
                                    sourceName: p.sourceName,
                                    status: p.status,
                                    createdAt: p.createdAt.toISOString(),
                                    publications: p.publications.map(pub => ({
                                        channel: pub.channel,
                                        status: pub.status,
                                        accountId: pub.accountId,
                                    })),
                                }))}
                            />
                        </div>

                        <div className="lg:col-span-1 space-y-6 animate-slide-in-right">
                            <h2 className="section-label">Status dos Agentes</h2>
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
        </div>
    );
}
