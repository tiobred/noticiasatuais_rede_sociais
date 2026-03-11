import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard — Notícia da Hora',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-surface-900">
                <Sidebar />
                <main className="flex-1 md:ml-60 flex flex-col min-h-screen w-full transition-all duration-300">
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}
