'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { triggerHaptic } from '@/lib/native-permissions';
import { supabase } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api-config';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Stages: 'email' -> 'otp' -> 'success'
  const [stage, setStage] = useState<'email' | 'otp' | 'success'>('email');

  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [tgAppLink, setTgAppLink] = useState('');
  const [tgWebLink, setTgWebLink] = useState('');
  const [botHandle, setBotHandle] = useState('@statxambot');

  // Case B: Telegram not verified fallback state
  const [telegramNotLinked, setTelegramNotLinked] = useState(false);
  const [emailResetSent, setEmailResetSent] = useState(false);

  // 6 Individual OTP Digits
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // New Password Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Initial Email Submission
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid registered email');
      return;
    }

    triggerHaptic('medium');
    setIsLoading(true);
    setErrorMsg(null);
    setTelegramNotLinked(false);

    try {
      // 1. Check if profile has Telegram linked in Supabase
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('telegram_linked, telegram_handle, mobile')
          .eq('mobile', email.trim())
          .single();

        if (profile && !profile.telegram_linked) {
          // Case B: Telegram is not linked! Show fallback alert card
          setTelegramNotLinked(true);
          setIsLoading(false);
          return;
        }
      } catch {
        // Continue to session creation
      }

      // 2. Request OTP Session
      const res = await fetch(getApiUrl('/api/auth/tg/session/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setTgAppLink(data.appLink);
        setTgWebLink(data.webLink);
        setBotHandle(data.botHandle || '@statxambot');
        triggerHaptic('success');
        setStage('otp');
      } else {
        setErrorMsg(data.error || 'Failed to dispatch Telegram OTP');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error requesting password reset');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Telegram App directly
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

  // Handle 6-Digit Individual Input Changes & Auto-Focus
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Single digit input
    const nextDigits = [...digits];
    nextDigits[index] = clean.slice(-1);
    setDigits(nextDigits);

    // Auto-focus next input
    if (index < 5 && clean) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Paste Event into OTP Inputs
  const handlePasteOtp = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setDigits(nextDigits);

    // Focus last filled or next input
    const targetIdx = Math.min(pasted.length, 5);
    digitInputRefs.current[targetIdx]?.focus();
  };

  // Handle Backspace navigation across digits
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  // Submit OTP & Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join('');

    if (otpCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    triggerHaptic('medium');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/auth/tg/session/'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: otpCode,
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        triggerHaptic('success');
        setStage('success');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2200);
      } else {
        triggerHaptic('error');
        setErrorMsg(data.error || 'Invalid OTP code. Please check your Telegram message.');
      }
    } catch {
      setErrorMsg('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Case B: Fallback Email Reset
  const handleFallbackEmailReset = async () => {
    triggerHaptic('light');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/login`,
      });
      setEmailResetSent(true);
    } catch {
      setErrorMsg('Failed sending email reset. Please contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf5ee] flex flex-col justify-center items-center px-4 py-8 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
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
          <p className="text-xs text-[#6e5a49]">
            Telegram 2FA Identity &amp; Password Recovery
          </p>
        </div>

        {/* STAGE 1: Email Input */}
        {stage === 'email' && (
          <div className="bg-[#ffffff] rounded-[28px] border border-[#e8dccb]/80 p-6 sm:p-8 shadow-[0_8px_30px_rgba(43,33,24,0.06)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="font-headline text-2xl font-bold text-[#2b2118]">
                Recover Password
              </h2>
              <p className="text-xs text-[#6e5a49] mt-1">
                Enter your registered email to receive an instant 6-digit code via Telegram.
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

            {/* Case B: Telegram Not Linked Alert Card */}
            {telegramNotLinked ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">
                    warning
                  </span>
                  <h4 className="font-headline text-xs font-bold">
                    Telegram is not linked to this account yet
                  </h4>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  You can use our email recovery fallback below, and link Telegram from your Profile page once signed in.
                </p>

                {emailResetSent ? (
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Password reset email dispatched to {email}.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleFallbackEmailReset}
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-headline font-bold transition-all shadow-xs"
                  >
                    Send Reset Link via Email
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                    Registered Email Address
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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] font-headline font-bold text-sm tracking-wide transition-all shadow-[0_4px_14px_rgba(194,101,42,0.35)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#ffffff] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Code to Telegram</span>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-[#e8dccb]/60">
              <Link href="/auth/login" className="text-xs font-headline font-semibold text-[#6e5a49] hover:text-[#2b2118]">
                &larr; Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* STAGE 2: 6 Individual Digit Boxes + New Password */}
        {stage === 'otp' && (
          <div className="bg-[#ffffff] rounded-[28px] border border-[#e8dccb]/80 p-6 sm:p-8 shadow-[0_8px_30px_rgba(43,33,24,0.06)] space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <h2 className="font-headline text-2xl font-bold text-[#2b2118]">
                Enter 6-Digit Code
              </h2>
              <p className="text-xs text-[#6e5a49]">
                Check your Telegram message from <span className="font-bold text-[#2b2118]">{botHandle}</span>.
              </p>
            </div>

            {/* Open Telegram Quick Button */}
            <button
              type="button"
              onClick={handleOpenTelegram}
              className="w-full py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 border border-sky-400/40 text-xs font-headline font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span className="material-symbols-outlined text-[18px] text-sky-600">send</span>
              <span>Open {botHandle}</span>
            </button>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0">
                  error
                </span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* 6 Individual iOS-Style Digit Boxes */}
              <div className="space-y-1.5">
                <label className="text-xs font-headline font-semibold text-center text-[#6e5a49] block">
                  Verification Code
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2 on-paste-container" onPaste={handlePasteOtp}>
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        digitInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-11 sm:w-12 h-14 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-center font-mono text-xl font-bold text-[#2b2118] focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="text-xs font-headline font-semibold text-[#6e5a49]">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full h-11 px-3.5 rounded-2xl bg-[#f3ebe0]/60 border border-[#e8dccb] text-[#2b2118] placeholder-[#9c8979] text-sm focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:bg-[#ffffff] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-[#c2652a] hover:bg-[#a8531e] text-[#faf5ee] font-headline font-bold text-sm tracking-wide transition-all shadow-[0_4px_14px_rgba(194,101,42,0.35)] flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#ffffff] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Update Password &amp; Sign In</span>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-[#e8dccb]/60">
              <button
                type="button"
                onClick={() => setStage('email')}
                className="text-xs font-headline font-semibold text-[#6e5a49] hover:text-[#2b2118]"
              >
                &larr; Try different email
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: Success Screen */}
        {stage === 'success' && (
          <div className="bg-[#ffffff] rounded-[28px] border border-[#e8dccb]/80 p-8 shadow-[0_8px_30px_rgba(43,33,24,0.06)] text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-[#2b2118]">
              Password Updated Successfully!
            </h2>
            <p className="text-xs text-[#6e5a49]">
              Your account has been secured. Redirecting you to the sign-in screen...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
