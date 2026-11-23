'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerHaptic } from '@/lib/native-permissions';
import { listenToKeyboardState } from '@/lib/keyboard';
import { useExamMode } from './ExamModeContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { mode } = useExamMode();
  const [modalOpen, setModalOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);

  // Listen to global modal state
  useEffect(() => {
    const handleModalState = (e: any) => {
      setModalOpen(Boolean(e?.detail?.open));
    };
    window.addEventListener('statxam_modal_state', handleModalState);
    return () => window.removeEventListener('statxam_modal_state', handleModalState);
  }, []);

  // Listen to keyboard visibility (native APK + web inputs)
  useEffect(() => {
    const unsubscribeKeyboard = listenToKeyboardState((visible) => {
      setIsKeyboardVisible(visible);
    });
    return () => unsubscribeKeyboard();
  }, []);

  // Listen to chat active state
  useEffect(() => {
    const handleChatState = (e: any) => {
      setIsChatActive(Boolean(e?.detail?.active));
    };
    window.addEventListener('statxam_chat_active', handleChatState);

    // Initial check if opened directly with conversation query (?c=)
    if (typeof window !== 'undefined' && pathname?.startsWith('/messages') && window.location.search.includes('c=')) {
      setIsChatActive(true);
    }

    return () => window.removeEventListener('statxam_chat_active', handleChatState);
  }, [pathname]);

  // Hide on typing (keyboard open), in active chat conversation, admin routes, auth screens, legal docs, or active modals
  if (
    modalOpen ||
    isKeyboardVisible ||
    isChatActive ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms')
  ) {
    return null;
  }

  const tabs = [
    { label: 'Home', href: '/', icon: 'home' },
    {
      label: mode === 'ielts' ? 'Units' : 'Practice',
      href: '/practice',
      icon: mode === 'ielts' ? 'route' : 'edit_note',
    },
    { label: 'AI Tutor', href: '/ai-tutor', icon: 'psychology' },
    { label: 'Progress', href: '/progress', icon: 'insights' },
    { label: 'Profile', href: '/profile', icon: 'account_circle' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pointer-events-none md:hidden flex justify-center pb-[max(env(safe-area-inset-bottom,0px),8px)] animate-in fade-in duration-150">
      <div className="w-[calc(100%-2rem)] max-w-md pointer-events-auto bg-[#faf5ee]/95 backdrop-blur-xl border border-[#e8dccb] rounded-[28px] shadow-[0_8px_30px_rgba(43,33,24,0.1)] px-2 py-1.5 flex items-center justify-around transition-all">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center justify-center flex-1 h-12 min-w-[52px] rounded-2xl transition-all duration-150 active:scale-95 ${isActive
                ? 'text-[#c2652a] font-bold bg-[#c2652a]/10'
                : 'text-[#6e5a49] hover:text-[#2b2118] font-medium'
                }`}
            >
              <span
                className="material-symbols-outlined text-[22px] transition-transform"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] tracking-tight font-headline font-semibold mt-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
