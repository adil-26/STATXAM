'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { ExamModeToggle } from './ExamModeToggle';

export default function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Strictly decouple Admin Platform and Auth screens from student app header
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return null;
  }

  const notifications = [
    {
      id: 'n-1',
      title: '20-Year Archive Calibrated',
      time: '1h ago',
      desc: 'Indian Board exam papers and IELTS band rubrics updated with step solutions.',
      icon: 'campaign',
    },
    {
      id: 'n-2',
      title: 'Telegram 2FA Link Active',
      time: 'Just now',
      desc: '@statxambot ready for instant 6-digit OTP verification.',
      icon: 'send',
    },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#faf5ee]/95 backdrop-blur-xl border-b border-[#e8dccb] shadow-[0_1px_12px_rgba(43,33,24,0.04)] pt-safe">
      <div className="max-w-7xl mx-auto h-14 sm:h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand Mark */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#c2652a]/10 border border-[#c2652a]/20 flex items-center justify-center text-[#c2652a] group-hover:scale-105 transition-transform shadow-2xs">
            <span className="material-symbols-outlined text-[18px] sm:text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <span className="font-headline text-lg sm:text-2xl font-black tracking-tight text-[#2b2118]">
            StatXam
          </span>
        </Link>

        {/* Center: Tactile iOS Segmented Mode Switcher */}
        <div className="flex items-center justify-center">
          <ExamModeToggle />
        </div>

        {/* Right Tools: Coins + Notifications + Profile/Auth CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
          {/* Scholar Coins Badge */}
          {user && (
            <Link
              href="/profile"
              className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 font-mono text-xs font-bold transition-all active:scale-95"
              title="StatXam Coins"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600">
                monetization_on
              </span>
              <span>{user.coins ?? 250}</span>
            </Link>
          )}

          {/* Messages / Study Discussions Link */}
          {user && (
            <Link
              href="/messages"
              onClick={() => triggerHaptic('light')}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all shadow-2xs active:scale-95 relative ${
                pathname?.startsWith('/messages')
                  ? 'bg-[#c2652a] text-white border-[#c2652a]'
                  : 'bg-[#ffffff] hover:bg-[#f3ebe0] text-[#2b2118] border-[#e8dccb]'
              }`}
              title="Peer Study Discussions"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">forum</span>
            </Link>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowNotifications(!showNotifications);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ffffff] hover:bg-[#f3ebe0] flex items-center justify-center text-[#2b2118] border border-[#e8dccb] transition-all shadow-2xs active:scale-95 relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c2652a] ring-2 ring-[#ffffff]" />
          </button>

          {/* User Profile or Sign In CTA */}
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-[#ffffff] hover:bg-[#f3ebe0] border border-[#e8dccb] transition-all shadow-2xs active:scale-95"
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center font-bold text-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : 'S'}
              </div>
              <span className="hidden md:inline text-xs font-headline font-bold text-[#2b2118] max-w-[90px] truncate">
                {user.fullName || 'Scholar'}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/auth/signup"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] text-xs font-headline font-bold transition-all shadow-xs active:scale-95"
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-[#ffffff] hover:bg-[#f3ebe0] text-[#2b2118] text-xs font-headline font-semibold border border-[#e8dccb] transition-all active:scale-95"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* In-App Notification Center Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-72 sm:w-80 rounded-2xl bg-[#ffffff] border border-[#e8dccb] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#e8dccb]/70">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#c2652a] text-[18px]">
                    notifications_active
                  </span>
                  <h3 className="font-headline text-sm font-bold text-[#2b2118]">
                    Notifications
                  </h3>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[#6e5a49] hover:text-[#2b2118]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#f8f3ec] border border-[#e8dccb]/60 flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#c2652a]/10 flex items-center justify-center text-[#c2652a] shrink-0">
                      <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#2b2118] truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-[#6e5a49] shrink-0">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6e5a49] line-clamp-2 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
