import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ExamModeProvider } from '@/components/ExamModeContext';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import AiLaunchAnimation from '@/components/AiLaunchAnimation';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#faf5ee',
};

export const metadata: Metadata = {
  title: 'StatXam — 20-Year Board Exam Question Bank & CBT Vault',
  description:
    'Comprehensive archive of PSEB, CBSE, and Competitive exam papers with verified marking schemes, AI doubt solver, and CBT test simulator.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-surface">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-body antialiased flex flex-col selection:bg-primary/20">
        <AuthProvider>
          <ExamModeProvider>
            <AiLaunchAnimation />
            <AppHeader />
            <main className="flex-1 w-full pt-16 md:pt-20 pb-28 md:pb-12 bg-surface relative min-h-screen">
              {children}
            </main>
            <BottomNav />
          </ExamModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}