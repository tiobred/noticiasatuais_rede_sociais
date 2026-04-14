import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BUCKETS = ['carousel-slides', 'media', 'stories', 'public'];

async function main() {
    console.log('\n=== Limpeza do Supabase Storage ===\n');
    
    // Listar buckets disponíveis
    const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
    
    if (bucketsErr) {
        console.error('Erro ao listar buckets:', bucketsErr.message);
        return;
    }
    
    console.log(`Buckets encontrados: ${buckets?.map(b => b.name).join(', ')}`);
    
    let totalDeleted = 0;
    
    for (const bucket of (buckets || [])) {
        console.log(`\n--- Bucket: ${bucket.name} ---`);
        
        let continueListing = true;
        let offset = 0;
        const limit = 1000;
        
        while (continueListing) {
            const { data: files, error: listErr } = await supabase.storage
                .from(bucket.name)
                .list('', { limit, offset, sortBy: { column: 'created_at', order: 'asc' } });
            
            if (listErr) {
                console.error(`  Erro ao listar: ${listErr.message}`);
                break;
            }
            
            if (!files || files.length === 0) {
                continueListing = false;
                break;
            }
            
            console.log(`  Encontrados ${files.length} arquivos (offset: ${offset})`);
            
            // Deletar TODOS os arquivos antigos (mais de 1 hora)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const toDelete = files
                .filter(f => f.created_at && new Date(f.created_at) < oneHourAgo)
                .map(f => f.name)
                .filter(Boolean);
            
            if (toDelete.length > 0) {
                const { error: delErr } = await supabase.storage
                    .from(bucket.name)
                    .remove(toDelete);
                
                if (delErr) {
                    console.error(`  Erro ao deletar: ${delErr.message}`);
                } else {
                    console.log(`  ✅ ${toDelete.length} arquivos deletados`);
                    totalDeleted += toDelete.length;
                }
            } else {
                console.log(`  Nenhum arquivo antigo para deletar (${files.length} são recentes)`);
            }
            
            if (files.length < limit) {
                continueListing = false;
            } else {
                offset += limit;
            }
        }
    }
    
    console.log(`\n✅ Total deletado: ${totalDeleted} arquivos`);
    console.log('\nAgora tente rodar o pipeline novamente.');
}

main().catch(console.error);
