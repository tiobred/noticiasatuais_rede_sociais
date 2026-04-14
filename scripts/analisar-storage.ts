import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Deleta objetos do storage.objects via query direta no Postgres
 * usando a função administrativa do Supabase
 */
async function main() {
    console.log('\n=== Limpeza do Storage via PostgreSQL Raw ===\n');
    
    // Listar arquivos para saber o que temos
    const arquivos = await prisma.$queryRaw<{bucket_id: string, name: string, created_at: Date, size: bigint}[]>`
        SELECT bucket_id, name, created_at, (metadata->>'size')::bigint as size
        FROM storage.objects
        WHERE bucket_id IN ('media', 'carousel-slides')
        ORDER BY created_at ASC
    `;
    
    console.log(`Total de arquivos: ${arquivos.length}`);
    
    const totalBytes = arquivos.reduce((acc: bigint, f: any) => acc + BigInt(f.size || 0), BigInt(0));
    console.log(`Tamanho total: ${Math.round(Number(totalBytes) / (1024 * 1024))} MB`);
    
    // Mostrar os 5 primeiros e últimos
    console.log('\nPrimeiros 5:');
    for (const f of arquivos.slice(0, 5)) {
        console.log(`  ${f.bucket_id}/${f.name} | ${new Date(f.created_at).toISOString().slice(0, 10)} | ${Math.round(Number(f.size || 0) / 1024)}KB`);
    }
    
    console.log('\nÚltimos 5:');
    for (const f of arquivos.slice(-5)) {
        console.log(`  ${f.bucket_id}/${f.name} | ${new Date(f.created_at).toISOString().slice(0, 10)} | ${Math.round(Number(f.size || 0) / 1024)}KB`);
    }
    
    // Verificar como os arquivos são nomeados (para chamar a API de delete corretamente)
    console.log('\nNomes de arquivos de exemplo:');
    for (const f of arquivos.slice(0, 10)) {
        console.log(`  "${f.name}"`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
