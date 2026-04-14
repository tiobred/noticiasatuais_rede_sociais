/**
 * Usa a REST API direta do Supabase Storage com a Anon Key para listar e deletar arquivos.
 * A quota excedida bloqueia uploads, mas a anon key AINDA PODE deletar se as RLS policies permitirem.
 * 
 * ALTERNATIVA: Deleta via fetch diretamente passando pelo pooler de database.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

async function listFilesViaFetch(bucketName: string, prefix = '', limit = 1000): Promise<string[]> {
    const url = `${SUPABASE_URL}/storage/v1/object/list/${bucketName}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prefix, limit, offset: 0, sortBy: { column: 'created_at', order: 'asc' } })
    });
    
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Erro ao listar ${bucketName}: ${err}`);
    }
    
    const files: any[] = await resp.json();
    return files.map(f => f.name).filter(Boolean);
}

async function deleteFilesViaFetch(bucketName: string, names: string[]): Promise<number> {
    if (names.length === 0) return 0;
    
    // Delete em lotes de 100
    let deleted = 0;
    for (let i = 0; i < names.length; i += 100) {
        const batch = names.slice(i, i + 100);
        const url = `${SUPABASE_URL}/storage/v1/object/${bucketName}`;
        const resp = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefixes: batch })
        });
        
        if (!resp.ok) {
            const err = await resp.text();
            console.error(`⚠️ Erro ao deletar lote: ${err}`);
        } else {
            const result = await resp.json();
            deleted += batch.length;
            process.stdout.write(`.`);
        }
    }
    return deleted;
}

async function main() {
    console.log('\n=== Limpeza do Storage (REST API) ===\n');
    
    for (const bucket of ['media', 'carousel-slides']) {
        console.log(`\n--- Bucket: ${bucket} ---`);
        
        try {
            const files = await listFilesViaFetch(bucket);
            console.log(`  Arquivos encontrados: ${files.length}`);
            
            if (files.length === 0) continue;
            
            // Deletar todos
            process.stdout.write(`  Deletando`);
            const deleted = await deleteFilesViaFetch(bucket, files);
            console.log(`\n  ✅ ${deleted} deletados`);
        } catch (e: any) {
            console.error(`  ❌ ${e.message}`);
        }
    }
    
    console.log('\n\n✅ Limpeza concluída! Tente publicar novamente.');
}

main().catch(console.error);
