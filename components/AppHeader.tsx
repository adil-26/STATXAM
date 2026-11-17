'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';

export default function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Strictly decouple Admin Platform from student shell
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const getPageTitle = () => {
    if (pathname === '/') return 'Cockpit Dashboard';
    if (pathname.startsWith('/practice')) return 'All-India 20-Yr Archives';
    if (pathname.startsWith('/ai-tutor')) return 'AI Doubt Tutor';
    if (pathname.startsWith('/progress')) return 'Performance Analytics';
    if (pathname.startsWith('/profile')) return 'Scholar Profile';
    if (pathname.startsWith('/auth/login')) return 'Sign In';
    if (pathname.startsWith('/auth/signup')) return 'Scholar Setup';
    return 'StatXam';
  };

  // Pure Student Navigation
  const navItems = [
    { label: 'Dashboard', href: '/', icon: 'home' },
    { label: '20-Yr Archive & Catalog', href: '/practice', icon: 'auto_stories' },
    { label: 'AI Doubt Tutor', href: '/ai-tutor', icon: 'psychology' },
    { label: 'Performance', href: '/progress', icon: 'insights' },
    { label: 'Profile', href: '/profile', icon: 'account_circle' },
  ];

  const notifications = [
    {
      id: 'n-1',
      title: 'Board Exam Schedules Announced',
      time: '1 hour ago',
      desc: 'Annual Board Exam 20-year archive question banks updated with verified step rubrics.',
      icon: 'campaign',
      unread: true,
    },
    {
      id: 'n-2',
      title: 'New Google Drive Papers Added',
      time: '3 hours ago',
      desc: 'Annual paper facsimiles for Class 10 & 12 ready with instant CBT practice simulations.',
      icon: 'auto_awesome',
      unread: true,
    },
    {
      id: 'n-3',
      title: 'Telegram 2FA Security Linked',
      time: 'Yesterday',
      desc: '@StatXamAuthBot verified for instant 6-digit OTP password recovery.',
      icon: 'send',
      unread: false,
    },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/60 shadow-[0_1px_12px_rgba(58,48,42,0.04)] pt-safe">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Brand Mark + Active Section */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
            </div>
            <span className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              StatXam
            </span>
          </Link>
          <div className="h-4 w-px bg-outline-variant/60 mx-0.5 hidden sm:block" />
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-label hidden sm:block">
            {getPageTitle()}
          </span>
        </div>

        {/* Desktop Top Navbar Links (visible on md: and above) */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-container/60 p-1 rounded-xl border border-outline-variant/40">
          {navItems.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-label font-semibold transition-all ${isActive
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Tools: Coins Balance + Notification Center + Profile / Auth */}
        <div className="flex items-center gap-2 relative">
          {/* Scholar Coins Wallet Badge */}
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold transition-colors"
              title="Scholar Coins Balance"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400">
                monetization_on
              </span>
              <span>{user.coins ?? 250}</span>
            </Link>
          )}

          {/* Notification Bell Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowNotifications(!showNotifications);
            }}
            className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface border border-outline-variant/50 transition-colors relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
          </button>

          {/* User Profile or Sign In CTA */}
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {user.fullName ? user.fullName[0].toUpperCase() : 'S'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-on-surface leading-tight max-w-[110px] truncate">
                  {user.fullName || 'Scholar'}
                </span>
                <span className="text-[10px] text-on-surface-variant leading-tight truncate">
                  {user.targetExam || 'Board Exam'}
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/auth/signup"
                className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-label font-bold hover:bg-primary/90 transition-colors shadow-xs"
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                className="px-2.5 py-1.5 rounded-xl bg-surface-container-low text-on-surface text-xs font-label font-semibold border border-outline-variant/60 hover:bg-surface-container transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* In-App Notification Center Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest border border-outline-variant/70 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    notifications_active
                  </span>
                  <h3 className="font-headline text-base font-bold text-on-surface">
                    Notification Center
                  </h3>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-semibold text-on-surface line-clamp-1">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-on-surface-variant shrink-0">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Verified Alerts Only</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  Mark All Read
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
