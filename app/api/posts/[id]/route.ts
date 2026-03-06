import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // Exclui o post e as dependências (via onDelete CASCADE do Prisma para SocialPublication)
        await prisma.post.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
