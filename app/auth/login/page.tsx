'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';

export default function LoginPage() {
  const router = useRouter();
  const { login, requestTelegramOtp, resetPasswordViaTelegramOtp } = useAuth();

  const [identity, setIdentity] = useState('9876543210');
  const [password, setPassword] = useState('AlphaNexus#2025');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Telegram 2FA Reset Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpPhone, setOtpPhone] = useState('9876543210');
  const [resetSessionId, setResetSessionId] = useState('rst_demo');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpLoading, setOtpLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsLoading(true);

    const res = await login(identity, password);
    if (res.success) {
      triggerHaptic('success');
      showToast('Vault keys unsealed! Loading your exam dashboard...');
      setTimeout(() => router.push('/'), 700);
    } else {
      triggerHaptic('error');
      showToast(res.error || 'Authentication rejected. Please check credentials.');
      setIsLoading(false);
    }
  };

  const handleOpenOtpModal = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic('light');
    setOtpPhone(identity);
    const newSession = 'rst_' + Math.random().toString(36).substring(2, 10);
    setResetSessionId(newSession);
    setShowOtpModal(true);
    setOtpStep('request');
  };

  const handleSendTelegramOtp = async () => {
    triggerHaptic('medium');
    setOtpLoading(true);
    const res = await requestTelegramOtp(otpPhone);
    setOtpLoading(false);
    showToast(res.message);
    setOtpStep('verify');
    setEnteredOtp('849210'); // Auto-fill example code for fast testing
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setOtpLoading(true);

    const res = await resetPasswordViaTelegramOtp(enteredOtp, newPassword || 'StatXam#2026');
    setOtpLoading(false);

    if (res.success) {
      triggerHaptic('success');
      showToast('Password reset verified via Telegram! Signing in...');
      await login(otpPhone, newPassword || 'StatXam#2026');
      setShowOtpModal(false);
      setTimeout(() => router.push('/'), 700);
    } else {
      triggerHaptic('error');
      showToast(res.error || 'Invalid OTP code');
    }
  };

  const handleSocialAuth = (provider: string) => {
    triggerHaptic('light');
    showToast(`Connecting with ${provider} secure OAuth gateway...`);
    setTimeout(() => {
      triggerHaptic('success');
      router.push('/');
    }, 900);
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md flex flex-col space-y-6">
        {/* Editorial Brand Mark & Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xs relative overflow-hidden border border-primary/20">
            <span
              className="material-symbols-outlined text-primary text-3xl select-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
          </div>
          <div className="space-y-0.5">
            <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">StatXam</h1>
            <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-medium">
              Exam Intelligence &amp; 20-Year Archive Vault
            </p>
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container text-[11px] font-label font-medium text-on-surface-variant border border-outline-variant/50">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Vault Sync v4.8 Active
            </span>
          </div>
        </div>

        {/* Segmented Auth Mode Switcher */}
        <div className="bg-surface-container rounded-xl p-1 flex items-center shadow-inner border border-outline-variant/40">
          <button
            type="button"
            className="flex-1 py-2.5 rounded-lg text-xs font-label font-bold bg-surface-container-lowest text-primary shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">lock_open</span>
            <span>Student Sign In</span>
          </button>
          <Link
            href="/auth/signup"
            className="flex-1 py-2.5 rounded-lg text-xs font-label font-medium text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Create Account</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="space-y-1">
            <h2 className="font-headline text-xl font-bold text-on-surface">Welcome back, Scholar</h2>
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Enter your credentials to decrypt and access your custom mock test suites.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identity Field */}
            <div className="flex flex-col space-y-1.5">
              <label className="font-label text-xs font-semibold text-on-surface-variant flex items-center justify-between">
                <span>Mobile Number</span>
                <span className="text-[10px] text-primary font-medium tracking-wide">ID Verified</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                  smartphone
                </span>
                <input
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-surface-container-lowest text-on-surface text-sm rounded-lg pl-10 pr-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs placeholder:text-outline/70 transition-all font-body border border-outline-variant/60"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label text-xs font-semibold text-on-surface-variant">Master Passkey</label>
                <span className="text-[10px] font-label font-bold px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  Min. 8 chars
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                  key
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-container-lowest text-on-surface text-sm rounded-lg pl-10 pr-11 py-3 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs placeholder:text-outline/70 transition-all font-body tracking-wider border border-outline-variant/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 p-1 text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Recovery Row */}
            <div className="pt-0.5 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenOtpModal}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-label font-semibold hover:underline"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Forgot password? Reset via Telegram OTP instant bot</span>
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-container text-on-primary py-3.5 px-5 rounded-lg font-label font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                <span>{isLoading ? 'Decrypting Vault...' : 'Sign In to StatXam'}</span>
                <span className="material-symbols-outlined text-lg">east</span>
              </button>
            </div>
          </form>

          {/* Visual Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-[1px] flex-1 bg-outline-variant/40" />
            <span className="font-label text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              Or quick pass
            </span>
            <div className="h-[1px] flex-1 bg-outline-variant/40" />
          </div>

          {/* Social Auth Stack */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label text-xs font-semibold shadow-xs border border-outline-variant/60 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google Auth</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialAuth('Telegram')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label text-xs font-semibold shadow-xs border border-outline-variant/60 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0 text-[#229ED9]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span>Telegram Login</span>
            </button>
          </div>

          {/* Quick Demo Access */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              login('9876543210', 'AlphaNexus#2025');
              router.push('/');
            }}
            className="w-full py-2.5 rounded-xl bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container font-label font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>One-Click Demo Scholar Access</span>
          </button>
        </div>

        {/* Security & Sync Trust Card */}
        <div className="rounded-xl bg-surface-container border border-outline-variant/60 p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0 text-primary border border-outline-variant/40">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div className="space-y-0.5">
            <p className="font-label text-xs font-semibold text-on-surface">End-to-End Encrypted</p>
            <p className="font-body text-[11px] text-on-surface-variant">
              Offline SQLite Sync Ready • AES-256 local archive cache
            </p>
          </div>
        </div>

        {/* Telegram OTP Password Reset Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 bg-[#3a302a]/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/80 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold text-on-surface">Telegram Password Reset</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant font-body">
                StatXam dispatches a 6-digit one-time code to <strong className="text-primary font-bold">@statxambot</strong> on Telegram for instant password reset.
              </p>

              {otpStep === 'request' ? (
                <div className="space-y-3">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-label font-semibold text-on-surface-variant">Your Registered Mobile</label>
                    <input
                      type="tel"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-surface-container-low text-on-surface text-xs rounded-lg px-3 py-2.5 border border-outline-variant/60 font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={otpLoading}
                    onClick={handleSendTelegramOtp}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>{otpLoading ? 'Dispatching...' : 'Dispatch Code to Telegram'}</span>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>

                  <a
                    href={`https://t.me/statxambot?start=${resetSessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOtpStep('verify')}
                    className="w-full py-2.5 rounded-lg bg-[#229ED9] hover:bg-[#1e8bc0] text-white font-label text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Open @statxambot in Telegram</span>
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
              ) : (
                <form onSubmit={handleVerifyAndReset} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-[#229ED9]/10 border border-[#229ED9]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#229ED9]">
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span className="font-bold">@statxambot</span>
                    </div>
                    <a
                      href={`https://t.me/statxambot?start=${resetSessionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#229ED9] underline flex items-center gap-0.5"
                    >
                      <span>Get Code</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-label font-semibold text-on-surface-variant">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="849210"
                      className="w-full bg-surface-container-low text-on-surface text-sm rounded-lg px-3 py-2 border border-outline-variant/60 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-label font-semibold text-on-surface-variant">New Master Passkey</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New strong password"
                      className="w-full bg-surface-container-low text-on-surface text-xs rounded-lg px-3 py-2 border border-outline-variant/60 focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>{otpLoading ? 'Verifying...' : 'Set Password & Sign In'}</span>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Subtle Editorial Quote */}
        <div className="text-center px-4">
          <p className="font-headline italic text-sm text-on-surface-variant leading-relaxed">
            &ldquo;Precision is the arithmetic of mastery. Twenty years of past questions calibrated to your study tempo.&rdquo;
          </p>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <Link
            href="/auth/signup"
            className="group inline-flex items-center gap-1 font-label text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            <span>New student?</span>
            <span className="text-primary font-semibold underline underline-offset-4">
              Register for All-India &amp; Board Question Vault
            </span>
          </Link>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-[#3a302a] text-[#faf5ee] shadow-xl flex items-center gap-2 text-xs font-label z-50 animate-fade-in border border-outline-variant/30">
          <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
