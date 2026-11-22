'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { ALL_INDIAN_BOARDS, BoardDefinition } from '@/lib/boards-catalog';
import { LanguageMedium } from '@/lib/types';
import { useExamMode } from '@/components/ExamModeContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { setMode } = useExamMode();

  // Multi-step Onboarding State
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Language
  const [selectedLang, setSelectedLang] = useState<LanguageMedium>('english');

  // Step 2: Board
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [boardSearch, setBoardSearch] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<BoardDefinition>(
    ALL_INDIAN_BOARDS.find((b) => b.id === 'cbse') || ALL_INDIAN_BOARDS[0]
  );

  // Step 3: Scholar Credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [targetClass, setTargetClass] = useState<'Class 10' | 'Class 12'>('Class 12');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const zones = ['All', 'National', 'North', 'East', 'South', 'West', 'Competitive'];

  const filteredBoards = ALL_INDIAN_BOARDS.filter((board) => {
    if (selectedZone !== 'All' && board.region !== selectedZone) return false;
    if (boardSearch.trim()) {
      const q = boardSearch.toLowerCase();
      const match =
        board.name.toLowerCase().includes(q) ||
        board.code.toLowerCase().includes(q) ||
        board.state.toLowerCase().includes(q) ||
        board.fullName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const languages: {
    id: LanguageMedium;
    name: string;
    script: string;
    icon: string;
  }[] = [
    { id: 'english', name: 'English', script: 'English Medium', icon: 'translate' },
    { id: 'hindi', name: 'Hindi', script: 'हिंदी माध्यम', icon: 'menu_book' },
    { id: 'punjabi', name: 'Punjabi', script: 'ਪੰਜਾਬੀ ਮਾਧਿਅਮ', icon: 'history_edu' },
    { id: 'tamil', name: 'Tamil', script: 'தமிழ் வழி', icon: 'temple_hindu' },
    { id: 'bengali', name: 'Bengali', script: 'বাংলা মাধ্যম', icon: 'palette' },
    { id: 'telugu', name: 'Telugu', script: 'తెలుగు మాధ్యమం', icon: 'water_drop' },
    { id: 'marathi', name: 'Marathi', script: 'मराठी माध्यम', icon: 'shield' },
    { id: 'gujarati', name: 'Gujarati', script: 'ગુજરાતી માધ્યમ', icon: 'confirmation_number' },
  ];

  const handleCompleteRegistration = async (e: React.FormEvent) => {
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
    if (!acceptedTerms) {
      setErrorMsg('Please review and accept the Terms & Conditions and Privacy Policy to proceed.');
      return;
    }

    triggerHaptic('medium');
    setIsLoading(true);

    const formattedMobile = mobile.trim()
      ? mobile.startsWith('+91')
        ? mobile.trim()
        : `+91 ${mobile.trim()}`
      : email.trim();

    const res = await signup(
      {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: formattedMobile,
        language: selectedLang,
        targetExam: `${selectedBoard.name} (${targetClass})`,
        targetInstitution: `${selectedBoard.state} State Merit Top 500`,
        accepted_terms_at: new Date().toISOString(),
      },
      password
    );

    setIsLoading(false);

    if (res.success) {
      triggerHaptic('success');
      setMode('indian');
      router.push('/');
    } else {
      triggerHaptic('error');
      setErrorMsg(res.error || 'Registration failed. Please check your details.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6 animate-in fade-in duration-300">
      {/* Brand Header & Segmented Auth Switcher */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-xs border border-primary/20">
          <span
            className="material-symbols-outlined text-primary text-3xl select-none"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            menu_book
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-label font-bold border border-primary/20">
            <span className="material-symbols-outlined text-[16px] text-primary">school</span>
            <span>All-India State Boards &amp; Competitive Entrance Platform</span>
          </div>
          <h1 className="font-headline text-3xl sm:text-5xl font-bold tracking-tight text-on-surface">
            Begin Your 20-Year Board Masterclass
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl mx-auto font-body">
            Master authentic solved previous year questions, Google Drive exam papers, and official step rubrics customized to your state board.
          </p>
        </div>

        {/* Segmented Auth Switcher */}
        <div className="w-full max-w-md bg-surface-container rounded-xl p-1 flex items-center shadow-inner border border-outline-variant/40">
          <Link
            href="/auth/login"
            className="flex-1 py-2.5 rounded-lg text-xs font-label font-medium text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">lock_open</span>
            <span>Student Sign In</span>
          </Link>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-lg text-xs font-label font-bold bg-surface-container-lowest text-primary shadow-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            <span>Create Account</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Step Onboarding Card */}
      <div className="bg-surface-container-low border border-outline-variant/60 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6">
        {/* Step Progress Pills */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold font-mono flex items-center justify-center">
              {step}
            </span>
            <span className="font-headline font-bold text-sm text-on-surface">
              {step === 1 && 'Step 1: Choose Language'}
              {step === 2 && 'Step 2: Choose Your Board'}
              {step === 3 && 'Step 3: Scholar Profile & Account'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
            <div className={`w-6 h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
            <div className={`w-6 h-1.5 rounded-full transition-all ${step === 3 ? 'bg-primary' : 'bg-surface-container-highest'}`} />
          </div>
        </div>

        {/* STEP 1: CHOOSE LANGUAGE */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                What is your preferred study medium?
              </h2>
              <p className="text-xs text-on-surface-variant font-body">
                Question papers, step-by-step marking rubrics, and AI explanations will adapt to your language.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {languages.map((lang) => {
                const isSelected = selectedLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedLang(lang.id);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between h-28 ${
                      isSelected
                        ? 'bg-primary-fixed/30 border-primary text-on-surface shadow-xs'
                        : 'bg-surface-container-lowest border-outline-variant/50 text-on-surface hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="material-symbols-outlined text-primary text-2xl">
                        {lang.icon}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          check_circle
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-headline font-bold text-sm">{lang.name}</div>
                      <div className="text-[11px] text-on-surface-variant font-body">{lang.script}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-primary/90 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span>Next: Select State Board</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE BOARD */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                Which examination board are you targeting?
              </h2>
              <p className="text-xs text-on-surface-variant font-body">
                We have cataloged solved 20-year papers (2005-2024) across all Indian state and central boards.
              </p>
            </div>

            {/* Zone Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
              <span className="text-[11px] font-label font-bold uppercase text-on-surface-variant shrink-0">
                Zone:
              </span>
              {zones.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedZone(zone);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    selectedZone === zone
                      ? 'bg-primary text-on-primary font-bold shadow-2xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {zone === 'All' ? 'All-India Boards' : `${zone} Zone`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                type="text"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                placeholder="Search CBSE, Punjab, UP, Bihar, Tamil Nadu, ICSE, NIOS, Maths..."
                className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
              />
            </div>

            {/* Board Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredBoards.map((board) => {
                const isSelected = selectedBoard.id === board.id;
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedBoard(board);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-2 active:scale-98 ${
                      isSelected
                        ? 'bg-primary-fixed/25 border-primary shadow-xs'
                        : 'bg-surface-container-lowest border-outline-variant/50 hover:border-primary/50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface-container text-primary">
                          {board.code} &bull; {board.region} Zone
                        </span>
                      </div>
                      <h4 className="font-headline font-bold text-sm text-on-surface truncate">
                        {board.name}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant font-body truncate">
                        {board.state}
                      </p>
                    </div>

                    <div className="shrink-0 mt-1">
                      {isSelected ? (
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          check_circle
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-on-surface-variant/40 text-[18px]">
                          radio_button_unchecked
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStep(1);
                }}
                className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setStep(3);
                }}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-primary/90 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span>Next: Scholar Profile</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCHOLAR PROFILE & CREDENTIALS */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                Create Your Scholar Account
              </h2>
              <p className="text-xs text-on-surface-variant">
                Enrolling for: <strong className="text-primary font-bold">{selectedBoard.name}</strong> &bull;{' '}
                <span className="capitalize">{selectedLang} Medium</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">error</span>
                <span className="font-body font-semibold">{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    person
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="scholar@example.com"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                  Mobile Number (Optional)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    phone
                  </span>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
                  />
                </div>
              </div>

              {/* Target Class */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                  Target Class / Level
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    school
                  </span>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(e.target.value as 'Class 10' | 'Class 12')}
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-3.5 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body appearance-none"
                  >
                    <option value="Class 12">Class 12 (Higher Secondary)</option>
                    <option value="Class 10">Class 10 (Secondary / Matric)</option>
                  </select>
                </div>
              </div>

              {/* Master Passkey */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase flex items-center justify-between">
                  <span>Master Passkey</span>
                  <span className="text-[10px] text-primary">Min. 6 characters</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    key
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure passkey"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-10 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-on-surface-variant/60 hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Passkey */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                  Confirm Passkey
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/60 text-lg">
                    verified_user
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your passkey"
                    className="w-full bg-surface-container-lowest text-on-surface text-xs rounded-xl pl-10 pr-10 py-2.5 border border-outline-variant/60 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-body"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-on-surface-variant/60 hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* DPDP & UGC Compliance Consent Checkbox */}
            <label className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-container-lowest p-3.5 border border-outline-variant/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary rounded cursor-pointer shrink-0"
                required
              />
              <span className="text-xs leading-relaxed text-on-surface-variant font-body">
                I agree to StatXam&apos;s{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-primary underline">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="font-semibold text-primary underline">
                  Privacy Policy
                </Link>
                , including community safety rules for student profiles, chat, and calling features.
              </span>
            </label>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStep(2);
                }}
                className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!acceptedTerms || isLoading}
                className="px-6 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-md hover:bg-primary/90 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isLoading ? (
                  <span>Registering Scholar...</span>
                ) : (
                  <>
                    <span>Launch StatXam Cockpit</span>
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Already Registered Bottom Bar */}
        <div className="pt-4 border-t border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">account_circle</span>
            <span className="text-on-surface-variant">
              Already registered with StatXam?
            </span>
          </div>
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-label font-bold transition-colors shrink-0 shadow-xs text-center"
          >
            Sign In to Existing Account &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
