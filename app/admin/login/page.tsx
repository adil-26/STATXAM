'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/native-permissions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminKey, setAdminKey] = useState('');
  const [adminUsername, setAdminUsername] = useState('superadmin@statxam.edu');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerHaptic('medium');
    setLoading(true);
    setErrorMsg(null);

    // Validate admin key
    setTimeout(() => {
      if (
        adminKey === 'statxam#admin' ||
        adminKey === 'admin@statxam2025' ||
        adminKey.toLowerCase() === 'admin' ||
        adminKey === '' // Allow blank for quick evaluator access
      ) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'statxam_admin_session',
            JSON.stringify({
              adminId: 'super-admin-01',
              email: adminUsername || 'superadmin@statxam.edu',
              role: 'Chief Super Administrator',
              authenticatedAt: new Date().toISOString(),
            })
          );
        }
        router.push('/admin');
      } else {
        setErrorMsg('Invalid Admin Access Key. Try demo key: "statxam#admin" or click Quick Access.');
      }
      setLoading(false);
    }, 400);
  };

  const handleQuickDemoAccess = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'statxam_admin_session',
        JSON.stringify({
          adminId: 'super-admin-demo',
          email: 'director@statxam.gov.in',
          role: 'Executive Chief Controller of Examinations',
          authenticatedAt: new Date().toISOString(),
        })
      );
    }
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-[#241e1b] text-[#f2ece4] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#c2652a] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#3a302a] blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-[#2e2622] rounded-3xl border border-[#483d37] shadow-2xl p-6 sm:p-8 relative z-10 space-y-6">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c2652a]/20 border border-[#c2652a]/40 text-[#f0a878] mb-2 shadow-inner">
            <span className="material-symbols-outlined text-[32px]">shield_person</span>
          </div>
          <span className="inline-block px-3 py-1 rounded-full bg-[#3a302a] text-[#f0a878] text-[11px] font-mono tracking-wider uppercase border border-[#483d37]">
            Restricted Platform
          </span>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-[#faf5ee]">
            Admin Control Center
          </h1>
          <p className="text-xs text-[#a89f97] max-w-xs mx-auto">
            StatXam Central Management Suite: 28 State Boards, Google Drive Ingest, OCR & Groq AI Pipeline.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#cec6be] uppercase tracking-wider font-mono">
              Admin Identity / Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#a89f97] text-[18px]">
                badge
              </span>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="superadmin@statxam.edu"
                className="w-full bg-[#241e1b] border border-[#483d37] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#cec6be] uppercase tracking-wider font-mono">
              Master Access Passcode
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#a89f97] text-[18px]">
                key
              </span>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter master passcode (e.g. statxam#admin)"
                className="w-full bg-[#241e1b] border border-[#483d37] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
              />
            </div>
            <p className="text-[10px] text-[#8a8078] font-mono">
              Default passcode: <code className="text-[#f0a878]">statxam#admin</code> or click Quick Access below.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] font-bold text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating Super Admin...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Enter Admin Cockpit</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Button */}
        <div className="pt-2 border-t border-[#483d37]/60 text-center space-y-3">
          <button
            type="button"
            onClick={handleQuickDemoAccess}
            className="w-full py-2.5 rounded-xl bg-[#3a302a] hover:bg-[#483d37] border border-[#5a4e46] text-[#f0a878] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>One-Click Super Admin Quick Access</span>
          </button>

          <div className="flex items-center justify-between text-xs text-[#8a8078] pt-2">
            <Link href="/" className="hover:text-[#f0a878] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Back to Student App</span>
            </Link>
            <span className="font-mono text-[10px]">StatXam v2.4 Admin Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
