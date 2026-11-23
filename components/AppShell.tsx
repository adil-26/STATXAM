'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
import StatXamSplash from './StatXamSplash';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isChatActive, setIsChatActive] = useState(false);

  useEffect(() => {
    const handleChatState = (e: any) => {
      setIsChatActive(Boolean(e?.detail?.active));
    };
    window.addEventListener('statxam_chat_active', handleChatState);

    if (
      typeof window !== 'undefined' &&
      pathname?.startsWith('/messages') &&
      window.location.search.includes('c=')
    ) {
      setIsChatActive(true);
    }

    return () => window.removeEventListener('statxam_chat_active', handleChatState);
  }, [pathname]);

  // Safe prefix check for static export with trailingSlash
  const isCleanPage =
    Boolean(pathname?.startsWith('/auth')) ||
    Boolean(pathname?.startsWith('/admin')) ||
    Boolean(pathname?.startsWith('/privacy')) ||
    Boolean(pathname?.startsWith('/terms'));

  return (
    <>
      <StatXamSplash />
      {/* Hide AppHeader on mobile when an active full-screen chat conversation is open */}
      {!isCleanPage && (
        <div className={isChatActive ? 'hidden md:block' : 'block'}>
          <AppHeader />
        </div>
      )}
      <main
        className={`flex-1 w-full bg-surface relative min-h-screen ${
          isCleanPage
            ? 'p-0'
            : isChatActive
            ? 'p-0 md:pt-[calc(4rem+env(safe-area-inset-top,0px)+1rem)] md:pb-12 h-screen md:h-auto overflow-hidden md:overflow-visible'
            : 'pt-[calc(3.5rem+env(safe-area-inset-top,0px)+0.75rem)] sm:pt-[calc(4rem+env(safe-area-inset-top,0px)+1rem)] pb-28 md:pb-12'
        }`}
      >
        {children}
      </main>
      {!isCleanPage && !isChatActive && <BottomNav />}
    </>
  );
}
