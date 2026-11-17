'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { triggerHaptic } from '@/lib/native-permissions';

export default function BottomNav() {
  const pathname = usePathname();

  // Strictly hide student bottom nav on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const tabs = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Practice', href: '/practice', icon: 'edit_note' },
    { label: 'AI Tutor', href: '/ai-tutor', icon: 'psychology' },
    { label: 'Progress', href: '/progress', icon: 'insights' },
    { label: 'Profile', href: '/profile', icon: 'account_circle' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/60 shadow-[0_-2px_16px_rgba(58,48,42,0.05)] pb-safe md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive =
            tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => triggerHaptic('light')}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-[56px] transition-colors ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface font-medium'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className="text-[11px] tracking-tight font-label mt-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
