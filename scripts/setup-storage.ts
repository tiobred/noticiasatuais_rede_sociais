
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Configurando Storage do Supabase (SQL Direto) ---');

    try {
        // 1. Criar o bucket se não existir
        // Usamos SQL direto no esquema 'storage' do Supabase
        await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('media', 'media', true, 104857600, '{video/mp4,image/jpeg,image/png,image/webp}')
      ON CONFLICT (id) DO UPDATE SET
        public = true,
        file_size_limit = 104857600,
        allowed_mime_types = '{video/mp4,image/jpeg,image/png,image/webp}';
    `);

        console.log('✅ Bucket "media" configurado/atualizado com sucesso (100MB limit, MP4 allowed).');

        // 2. Garantir políticas de acesso (Select público)
        await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
        ) THEN
          CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
        END IF;
      END
      $$;
    `);

        console.log('✅ Política de acesso público verificada.');

    } catch (error) {
        console.error('❌ Erro ao configurar storage:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
