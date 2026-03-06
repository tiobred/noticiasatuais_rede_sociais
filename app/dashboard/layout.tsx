import { Sidebar } from '@/components/layout/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard — Notícia da Hora',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-surface-900">
            <Sidebar />
            <main className="flex-1 ml-60 flex flex-col min-h-screen">
                {children}
            </main>
        </div>
    );
}
