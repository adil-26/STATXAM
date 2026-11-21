'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { useExamMode } from '@/components/ExamModeContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { setMode } = useExamMode();

  // Multi-step state: 1 = Account Details, 2 = Telegram Link Onboarding
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<'indian' | 'ielts'>('indian');

  // Telegram Link Session State
  const [sessionId, setSessionId] = useState('');
  const [tgAppLink, setTgAppLink] = useState('');
  const [tgWebLink, setTgWebLink] = useState('');
  const [botHandle, setBotHandle] = useState('@statxambot');
  const [isTgVerified, setIsTgVerified] = useState(false);
  const [manualOtp, setManualOtp] = useState('');
  const [showManualOtp, setShowManualOtp] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STEP 1: Continue to Telegram Link Step
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    triggerHaptic('medium');
    setIsLoading(true);

    try {
      // 1. Initialize user profile
      const res = await signup(
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          mobile: email.trim(),
          language: 'english',
          targetExam: selectedTrack === 'ielts' ? 'IELTS Academic (Band 8.0+)' : 'CBSE & Pan-India Board',
          targetInstitution: selectedTrack === 'ielts' ? 'Global University Admission' : 'National Merit Rank',
          telegramLinked: false,
        },
        password
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Sync active track
      setMode(selectedTrack);

      // 2. Create Telegram Link Session
      const tgRes = await fetch('/api/auth/tg/session/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const tgData = await tgRes.json();

      if (tgData.success) {
        setSessionId(tgData.sessionId);
        setTgAppLink(tgData.appLink);
        setTgWebLink(tgData.webLink);
        setBotHandle(tgData.botHandle || '@statxambot');
      }

      triggerHaptic('success');
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error initializing account setup');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Polling for Telegram Linking
  useEffect(() => {
    if (step !== 2 || !sessionId || isTgVerified) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/tg/session/?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.verified) {
          setIsTgVerified(true);
          triggerHaptic('success');
          clearInterval(interval);
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }
      } catch {
        // continue polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [step, sessionId, isTgVerified, router]);

  // Open Telegram App with Web Fallback
  const handleOpenTelegram = () => {
    triggerHaptic('medium');
    const appUrl = tgAppLink || `tg://resolve?domain=statxambot&start=${sessionId}`;
    const webUrl = tgWebLink || `https://t.me/statxambot?start=${sessionId}`;

    const start = Date.now();
    window.location.href = appUrl;

    setTimeout(() => {
      if (Date.now() - start < 1800) {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
    }, 700);
  };

  // Verify Manual OTP if entered
  const handleVerifyManualOtp = async () => {
    if (manualOtp.length !== 6) {
      setErrorMsg('Please enter the 6-digit code received from @statxambot');
      return;
    }
    triggerHaptic('medium');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/tg/session/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: manualOtp.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsTgVerified(true);
        triggerHaptic('success');
        setTimeout(() => router.push('/'), 700);
      } else {
        triggerHaptic('error');
        setErrorMsg(data.error || 'Invalid verification code');
      }
    } catch {
      setErrorMsg('Failed verifying code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip Telegram for now
  const handleSkipTelegram = () => {
    triggerHaptic('light');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#faf5ee] flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & Progress Bar */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-[#c2652a]/10 border border-[#c2652a]/20 flex items-center justify-center text-[#c2652a] shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                menu_book
              </span>
            </div>
            <span className="font-headline text-3xl font-black tracking-tight text-[#2b2118]">
              StatXam
            </span>
          </Link>

          {/* iOS Segmented Step Tracker */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#f3ebe0] p-1 rounded-full border border-[#e8dccb]">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-headline font-bold transition-all ${
                  step === 1 ? 'bg-[#c2652a] text-[#faf5ee] shadow-2xs' : 'text-[#6e5a49]'
                }`}
              >
                1. Account Details
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-headline font-bold transition-all ${
                  step === 2 ? 'bg-[#c2652a] text-[#faf5ee] shadow-2xs' : 'text-[#6e5a49]'
                }`}
              >
                2. Telegram 2FA
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: Account Creation Form */}
        {step === 1 && (
          <div className="bg-[#ffffff] rounded-[28px] border border-[#e8dccb]/80 p-6 sm:p-8 shadow-[0_8px_30px_rgba(43,33,24,0.06)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="font-headline text-2xl font-bold text-[#2b2118]">
                Create Scholar Account
              </h2>
              <p className="text-xs text-[#6e5a49] mt-1 font-body">
                Join thousands of students preparing for Indian Boards &amp; IELTS.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">
                  error
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Examination Track Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-headline font-bold text-[#2b2118] uppercase tracking-wider">
                  Select Study Track
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedTrack('indian');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                      selectedTrack === 'indian'
                        ? 'bg-[#c2652a]/10 border-[#c2652a] shadow-2xs'
                        : 'bg-[#f3ebe0]/60 border-[#e8dccb] hover:bg-[#f3ebe0]'
                    }`}
                  >
                    <div className="text-xl">🇮🇳</div>
                    <p className="font-headline text-xs font-bold text-[#2b2118] mt-1">
                      Indian Exams
                    </p>
                    <p className="text-[10px] text-[#6e5a49] leading-tight mt-0.5">
                      Boards, JEE, NEET, CBT
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedTrack('ielts');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                      selectedTrack === 'ielts'
                        ? 'bg-[#c2652a]/10 border-[#c2652a] shadow-2xs'
                        : 'bg-[#f3ebe0]/60 border-[#e8dccb] hover:bg-[#f3ebe0]'
                    }`}
                  >
                    <div className="text-xl">🌍</div>
                    <p className="font-headline text-xs font-bold text-[#2b2118] mt-1">
                      IELTS Global
                    </p>
                    <p className="text-[10px] text-[#6e5a49] leading-tight mt-0.5">
                      Duolingo-style Units
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full h-11 px-3.5 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-[#2b2118] placeholder-[#9c8979] text-sm focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@example.com"
                  className="w-full h-11 px-3.5 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-[#2b2118] placeholder-[#9c8979] text-sm focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-11 pl-3.5 pr-10 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-[#2b2118] placeholder-[#9c8979] text-sm focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#6e5a49] hover:text-[#2b2118]"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-11 pl-3.5 pr-10 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-[#2b2118] placeholder-[#9c8979] text-sm focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-[#6e5a49] hover:text-[#2b2118]"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] font-headline font-bold text-sm tracking-wide transition-all shadow-[0_4px_14px_rgba(194,101,42,0.35)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#ffffff] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue to Telegram 2FA</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-[#e8dccb]/60">
              <p className="text-xs text-[#6e5a49]">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-[#c2652a] font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Telegram Link Onboarding Screen */}
        {step === 2 && (
          <div className="bg-[#ffffff] rounded-[28px] border border-[#e8dccb]/80 p-6 sm:p-8 shadow-[0_8px_30px_rgba(43,33,24,0.06)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Telegram Icon Header */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 shadow-sm animate-pulse">
                <span className="material-symbols-outlined text-[32px]">send</span>
              </div>
              <h2 className="font-headline text-2xl font-bold text-[#2b2118]">
                Connect Telegram for Instant Recovery
              </h2>
              <p className="text-xs text-[#6e5a49] max-w-sm leading-relaxed">
                StatXam uses <span className="font-bold text-[#2b2118]">{botHandle}</span> for instant, free 6-digit OTP password resets and high-yield exam alerts.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">
                  error
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Verification Status Banner */}
            {isTgVerified ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-headline font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">
                  check_circle
                </span>
                <span>Telegram Connected Successfully! Entering StatXam...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleOpenTelegram}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-headline font-bold text-sm tracking-wide transition-all shadow-[0_4px_14px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 active:scale-98"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Open {botHandle} to Link</span>
                </button>

                {/* Live Waiting Indicator */}
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#6e5a49] py-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Waiting for bot authorization...</span>
                </div>

                {/* Manual Code Option Toggle */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualOtp(!showManualOtp)}
                    className="text-xs font-headline font-semibold text-[#c2652a] hover:underline"
                  >
                    {showManualOtp ? 'Hide manual code entry' : 'Prefer to enter 6-digit code manually?'}
                  </button>
                </div>

                {showManualOtp && (
                  <div className="p-3.5 rounded-2xl bg-[#f3ebe0]/70 border border-[#e8dccb] space-y-2.5 animate-in fade-in duration-150">
                    <label className="text-[11px] font-headline font-bold text-[#6e5a49] uppercase tracking-wider block">
                      6-Digit Telegram Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={manualOtp}
                        onChange={(e) => setManualOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="flex-1 h-10 px-3 rounded-xl bg-[#ffffff] border border-[#e8dccb] text-[#2b2118] text-center font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyManualOtp}
                        disabled={isLoading || manualOtp.length !== 6}
                        className="px-4 rounded-xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] text-xs font-headline font-bold transition-all disabled:opacity-50"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Helper: Don't have Telegram? + Skip Button */}
            <div className="pt-2 border-t border-[#e8dccb]/60 space-y-3">
              <div className="p-3 rounded-2xl bg-[#f8f3ec] border border-[#e8dccb]/70 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[18px] text-[#6e5a49] shrink-0 mt-0.5">
                  info
                </span>
                <div className="text-[11px] text-[#6e5a49] leading-tight">
                  <span className="font-bold text-[#2b2118]">Don&apos;t have Telegram installed?</span>
                  <div className="mt-1 flex items-center gap-3">
                    <a
                      href="https://play.google.com/store/apps/details?id=org.telegram.messenger"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>Get on Play Store</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                    <span>•</span>
                    <a
                      href="https://web.telegram.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 font-bold hover:underline"
                    >
                      Telegram Web
                    </a>
                  </div>
                </div>
              </div>

              {/* Skip for now CTA */}
              <button
                type="button"
                onClick={handleSkipTelegram}
                className="w-full py-2.5 text-xs font-headline font-semibold text-[#6e5a49] hover:text-[#2b2118] transition-colors"
              >
                Skip for now &amp; proceed to Dashboard &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
