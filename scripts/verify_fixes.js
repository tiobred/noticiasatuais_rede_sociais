const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountId = 'promo_test_unit';
    const sourceId = 'test_source_id_123';

    console.log('--- Verificando Duplicidade e Metadados ---');

    // 1. Limpar teste anterior
    await prisma.post.deleteMany({ where: { accountId } });

    // 2. Criar post com metadados
    const metadata = { targetChannels: { shorts: false }, test: true };
    console.log('Criando post com metadados:', JSON.stringify(metadata));
    
    const post1 = await prisma.post.create({
        data: {
            sourceId,
            accountId,
            title: 'Test Post',
            body: 'Test Body',
            sourceName: 'Test Source',
            status: 'PENDING',
            metadata
        }
    });

    console.log('Post criado ID:', post1.id);
    console.log('Metadados no DB:', JSON.stringify(post1.metadata));

    if (JSON.stringify(post1.metadata) === JSON.stringify(metadata)) {
        console.log('✅ Metadados persistidos corretamente.');
    } else {
        console.error('❌ Erro na persistência de metadados!');
    }

    // 3. Tentar criar o mesmo post (simulando a lógica do orchestrator)
    console.log('Simulando nova tentativa de criação do mesmo post...');
    
    const alreadyExists = await prisma.post.findFirst({
        where: {
            sourceId,
            accountId
        }
    });

    if (alreadyExists) {
        console.log('✅ Duplicidade detectada corretamente (Item já existe).');
    } else {
        console.error('❌ Erro: O item deveria ter sido detectado como duplicado!');
    }

    // Limpeza final opcional
    // await prisma.post.deleteMany({ where: { accountId } });
}

main().finally(() => prisma.$disconnect());
