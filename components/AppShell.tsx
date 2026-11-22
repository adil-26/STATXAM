'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import StatXamSplash from './StatXamSplash';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Safe prefix check for static export with trailingSlash
  const isCleanPage =
    Boolean(pathname?.startsWith('/auth')) ||
    Boolean(pathname?.startsWith('/admin')) ||
    Boolean(pathname?.startsWith('/privacy')) ||
    Boolean(pathname?.startsWith('/terms'));

  return (
    <>
      <StatXamSplash />
      {!isCleanPage && <AppHeader />}
      <main
        className={`flex-1 w-full bg-surface relative min-h-screen ${
          isCleanPage
            ? 'p-0'
            : 'pt-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] sm:pt-[calc(4rem+env(safe-area-inset-top,0px)+1rem)] pb-28 md:pb-12'
        }`}
      >
        {children}
      </main>
      {!isCleanPage && <BottomNav />}
    </>
  );
}
