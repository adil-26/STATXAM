import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ExamModeProvider } from '@/components/ExamModeContext';
import AppShell from '@/components/AppShell';

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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.png',
  },
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
            <AppShell>{children}</AppShell>
          </ExamModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}