'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteRunButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Deseja realmente excluir este log permanente?')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/agents/run/${id}`, { method: 'DELETE' });
            if (res.ok) {
                router.refresh(); // Refresh page via Next.js router
            } else {
                alert('Erro ao excluir log.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir log.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            title="Excluir Log"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
