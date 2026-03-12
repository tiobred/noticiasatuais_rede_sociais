
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalize() {
  console.log('--- Iniciando normalização de accountId ---');

  // 1. SystemConfig
  const configs = await prisma.systemConfig.findMany();
  console.log(`Encontradas ${configs.length} configurações.`);
  for (const config of configs) {
    if (config.accountId && config.accountId !== config.accountId.toLowerCase()) {
      console.log(`Normalizando config: ${config.accountId} -> ${config.accountId.toLowerCase()} (key: ${config.key})`);
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: { accountId: config.accountId.toLowerCase() }
      }).catch(e => console.error(`Erro ao atualizar config ${config.id}:`, e.message));
    }
  }

  // 2. Posts
  const posts = await prisma.post.findMany({
    where: { NOT: { accountId: null } }
  });
  console.log(`Encontrados ${posts.length} posts.`);
  for (const post of posts) {
    if (post.accountId && post.accountId !== post.accountId.toLowerCase()) {
      console.log(`Normalizando post: ${post.accountId} -> ${post.accountId.toLowerCase()} (ID: ${post.id})`);
      await prisma.post.update({
        where: { id: post.id },
        data: { accountId: post.accountId.toLowerCase() }
      }).catch(e => console.error(`Erro ao atualizar post ${post.id}:`, e.message));
    }
  }

  // 3. AgentRun
  const runs = await prisma.agentRun.findMany();
  console.log(`Encontradas ${runs.length} execuções de agentes.`);
  for (const run of runs) {
    if (run.agentName.includes('orchestrator_')) {
      const parts = run.agentName.split('orchestrator_');
      if (parts[1] && parts[1] !== parts[1].toLowerCase()) {
        const newName = `orchestrator_${parts[1].toLowerCase()}`;
        console.log(`Normalizando AgentRun: ${run.agentName} -> ${newName}`);
        await prisma.agentRun.update({
          where: { id: run.id },
          data: { agentName: newName }
        }).catch(e => console.error(`Erro ao atualizar run ${run.id}:`, e.message));
      }
    }
  }

  console.log('--- Normalização concluída ---');
}

normalize()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
