import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard — Notícia da Hora',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex min-h-dvh bg-surface-900">
                <Sidebar />
                {/* Main content shifts based on sidebar width; uses CSS var approach */}
                <main
                    className="flex-1 flex flex-col min-h-dvh w-full
                                transition-all duration-300
                                md:ml-60"
                    style={{ minWidth: 0 }}
                >
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}
