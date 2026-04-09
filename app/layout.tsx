import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { Sidebar } from '@/components/layout/Sidebar';

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-plus-jakarta',
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0A0B0F',
};

export const metadata: Metadata = {
    title: 'SOCIALPOST — Brazil Edition',
    description: 'Monitor de notícias automatizado com IA e agendamento inteligente',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`dark ${plusJakarta.variable} ${inter.variable}`}>
            <body className="bg-bg-base text-text-primary min-h-screen font-sans selection:bg-purple-500/30 selection:text-purple-200 antialiased">
                <SidebarProvider>
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <main className="flex-1 flex flex-col min-h-screen w-full md:pl-64 group-data-[collapsed=true]/sidebar-provider:md:pl-20 transition-[padding] duration-400 ease-spring">
                            {children}
                        </main>
                    </div>
                </SidebarProvider>
            </body>
        </html>
    );
}

