import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API Route para servir arquivos de mídia temporários gerados localmente.
 * Substitui o Supabase Storage para evitar erros de quota.
 * Os arquivos ficam em /tmp/media/ e são deletados após o uso.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { filename: string } }
) {
    const { filename } = params;

    // Sanitizar nome do arquivo para evitar path traversal
    const safeName = path.basename(filename);
    if (!safeName || safeName !== filename) {
        return new NextResponse('Not Found', { status: 404 });
    }

    const mediaDir = path.join(process.cwd(), 'tmp', 'media');
    const filePath = path.join(mediaDir, safeName);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('Not Found', { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
            ext === '.png' ? 'image/png' :
                'application/octet-stream';

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-cache, no-store',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
