import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Notícia da Hora — Dashboard',
    description: 'Monitor de notícias econômicas automatizado para o Brasil',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="bg-surface-900 min-h-screen">
                {children}
            </body>
        </html>
    );
}
