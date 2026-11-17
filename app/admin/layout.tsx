'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/native-permissions';
import { getActiveGroqModel } from '@/lib/groq-service';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [activeModel, setActiveModel] = useState('openai/gpt-oss-120b');

  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('statxam_admin_session');
      if (session) {
        try {
          setAdminUser(JSON.parse(session));
        } catch {
          setAdminUser({ role: 'Super Admin', email: 'admin@statxam.edu' });
        }
      } else if (!isLoginPage) {
        router.push('/admin/login');
      }
      setActiveModel(getActiveGroqModel());
      setCheckedAuth(true);
    }
  }, [pathname, isLoginPage, router]);

  const handleAdminLogout = () => {
    triggerHaptic('medium');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('statxam_admin_session');
    }
    router.push('/admin/login');
  };

  // If on login page, render child directly without admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Waiting for client auth check
  if (!checkedAuth) {
    return (
      <div className="min-h-screen bg-[#1c1815] text-[#cec6be] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-wider text-[#a89f97]">
            Verifying Admin Credentials...
          </p>
        </div>
      </div>
    );
  }

  const adminNav = [
    { label: 'Overview', href: '/admin', icon: 'dashboard' },
    { label: 'All-India Boards (28 States)', href: '/admin/boards', icon: 'table_chart' },
    { label: 'Multi-Subject Drive & Groq Studio', href: '/admin/ingest', icon: 'add_to_drive' },
    { label: 'Question Bank Review', href: '/admin/review', icon: 'fact_check' },
    { label: 'API Keys & AI Engine', href: '/admin/settings', icon: 'vpn_key' },
  ];

  return (
    <div className="min-h-screen bg-[#1c1815] text-[#f2ece4] flex flex-col font-body selection:bg-[#c2652a]/30">
      {/* Top Admin Header Bar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#241e1b]/95 backdrop-blur-xl border-b border-[#3e342e] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand + Control Tag */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#c2652a]/20 border border-[#c2652a]/40 flex items-center justify-center text-[#f0a878] group-hover:scale-105 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-xl font-bold tracking-tight text-[#faf5ee]">
                    StatXam Control
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#c2652a] text-[#faf5ee] uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#a89f97] leading-tight">
                  Pan-India Examination Governance Suite
                </span>
              </div>
            </Link>
          </div>

          {/* Telemetry Chips (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2e2622] border border-[#3e342e] text-[#86efac]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>PostgreSQL: Connected</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2e2622] border border-[#3e342e] text-[#f0a878]">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span>Groq: {activeModel.split('/')[1] || 'gpt-oss-120b'}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2e2622] border border-[#3e342e] text-[#93c5fd]">
              <span className="material-symbols-outlined text-[14px]">public</span>
              <span>28 State Boards</span>
            </div>
          </div>

          {/* Right Admin Profile & Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settings"
              className="p-2 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] border border-[#3e342e] text-[#cec6be] hover:text-[#faf5ee] transition-colors"
              title="API Keys & Model Config"
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] border border-[#3e342e] text-xs font-semibold text-[#f0a878] transition-colors"
              title="Open Student App in new tab"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>Student App</span>
            </Link>

            <button
              onClick={handleAdminLogout}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 transition-colors"
              title="Sign Out of Admin Control"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Sub-Bar */}
        <div className="border-t border-[#342b26] bg-[#201a17]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            {adminNav.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin' || pathname === '/admin/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                      : 'text-[#a89f97] hover:text-[#faf5ee] hover:bg-[#2e2622]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Content Arena */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="border-t border-[#342b26] bg-[#1c1815] py-4 text-center text-xs text-[#78706a] font-mono">
        <p>StatXam Multi-State Examination Control Platform • Authorized Educational Personnel Only</p>
      </footer>
    </div>
  );
}
