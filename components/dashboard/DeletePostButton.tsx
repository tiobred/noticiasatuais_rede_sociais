'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeletePostButton({ id, redirectTo }: { id: string, redirectTo?: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Deseja realmente excluir este post permanentemente?')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (redirectTo) {
                    router.push(redirectTo);
                } else {
                    router.refresh();
                }
            } else {
                alert('Erro ao excluir post.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir post.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Excluir Post"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
