import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';

export async function POST() {
    try {
        const result = await prisma.post.deleteMany({});
        revalidatePath('/dashboard');

        return NextResponse.json({
            deletedCount: result.count
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
