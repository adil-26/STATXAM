'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { TestArenaModal } from '@/components/TestArenaModal';
import { ALL_INDIAN_BOARDS, BoardDefinition } from '@/lib/boards-catalog';
import { PilotProfile, LanguageMedium } from '@/lib/types';

export default function HomePage() {
  const { user, loading, signup, loginAsDemo } = useAuth();
  const [activeModalPaper, setActiveModalPaper] = useState<string | null>(null);

  // Onboarding Wizard State (for new/unauthenticated users)
  const [onboardStep, setOnboardStep] = useState<1 | 2 | 3>(1);
  const [selectedLang, setSelectedLang] = useState<LanguageMedium>('english');
  const [selectedBoard, setSelectedBoard] = useState<BoardDefinition>(
    ALL_INDIAN_BOARDS.find((b) => b.id === 'cbse') || ALL_INDIAN_BOARDS[0]
  );
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleOpenTest = (title: string) => {
    triggerHaptic('medium');
    setActiveModalPaper(title);
  };

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      setFormError('Please fill in your name and 10-digit mobile number');
      return;
    }
    triggerHaptic('medium');
    setIsSubmitting(true);
    setFormError(null);

    const res = await signup(
      {
        fullName: fullName.trim(),
        mobile: mobile.startsWith('+91') ? mobile.trim() : `+91 ${mobile.trim()}`,
        language: selectedLang,
        targetExam: `${selectedBoard.name} (${selectedBoard.classes[0]})`,
        targetInstitution: `${selectedBoard.state} State Merit Top 500`,
      },
      password || 'student123'
    );

    setIsSubmitting(false);
    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleInstantDemoLogin = (boardId?: string) => {
    triggerHaptic('light');
    const board = ALL_INDIAN_BOARDS.find((b) => b.id === boardId) || selectedBoard;
    loginAsDemo({
      fullName: 'Aarav Sharma',
      mobile: '+91 98765 43210',
      language: 'english',
      targetExam: `${board.name} (${board.classes[0]})`,
      targetInstitution: `${board.state} State Merit Rank 120`,
    });
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-label uppercase tracking-widest text-primary font-bold">
          Calibrating 20-Year Archive Cockpit...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated State: Multistep Pan-India Scholar Onboarding & Setup
  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
        {/* Onboarding Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-label font-bold border border-primary/20">
            <span className="material-symbols-outlined text-[16px] text-primary">school</span>
            <span>All-India State Boards & Competitive Entrance Platform</span>
          </div>
          <h1 className="font-headline text-3xl sm:text-5xl font-bold tracking-tight text-on-surface">
            Begin Your 20-Year Board Masterclass
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl mx-auto font-body">
            Master authentic solved previous year questions, Google Drive exam papers, and official step rubrics customized to your state board.
          </p>
        </div>

        {/* Setup Wizard Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Step Indicators */}
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center font-mono">
                {onboardStep}
              </span>
              <span className="text-xs font-label font-bold text-on-surface">
                {onboardStep === 1
                  ? 'Step 1: Choose Language'
                  : onboardStep === 2
                    ? 'Step 2: Choose Your Board'
                    : 'Step 3: Scholar Profile'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-6 h-1.5 rounded-full transition-colors ${step <= onboardStep ? 'bg-primary' : 'bg-surface-container'
                    }`}
                />
              ))}
            </div>
          </div>

          {/* STEP 1: Language / Medium Selection */}
          {onboardStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  What is your preferred study medium?
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Question papers, step-by-step marking rubrics, and AI explanations will adapt to your language.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'english', label: 'English', native: 'English Medium', icon: 'translate' },
                  { id: 'hindi', label: 'Hindi', native: 'हिंदी माध्यम', icon: 'auto_stories' },
                  { id: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ ਮਾਧਿਅਮ', icon: 'history_edu' },
                  { id: 'tamil', label: 'Tamil', native: 'தமிழ் வழி', icon: 'temple_hindu' },
                  { id: 'bengali', label: 'Bengali', native: 'বাংলা মাধ্যম', icon: 'palette' },
                  { id: 'telugu', label: 'Telugu', native: 'తెలుగు మాధ్యమం', icon: 'water_drop' },
                  { id: 'marathi', label: 'Marathi', native: 'मराठी माध्यम', icon: 'security' },
                  { id: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી માધ્યમ', icon: 'local_activity' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedLang(item.id as any);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${selectedLang === item.id
                      ? 'bg-primary-fixed border-primary text-on-primary-fixed shadow-xs'
                      : 'bg-surface-container-low border-outline-variant/50 text-on-surface hover:bg-surface-container'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-[20px] text-primary">
                        {item.icon}
                      </span>
                      {selectedLang === item.id && (
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs sm:text-sm">{item.label}</p>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1">{item.native}</p>
                  </button>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setOnboardStep(2);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-primary/90 flex items-center gap-1.5"
                >
                  <span>Next: Select State Board</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: State / Central Board Selection */}
          {onboardStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  Which examination board are you targeting?
                </h3>
                <p className="text-xs text-on-surface-variant">
                  We have cataloged solved 20-year papers (2005–2024) across all Indian state and central boards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {ALL_INDIAN_BOARDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedBoard(b);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between ${selectedBoard.id === b.id
                      ? 'bg-primary-fixed border-primary shadow-xs'
                      : 'bg-surface-container-low border-outline-variant/50 hover:bg-surface-container'
                      }`}
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary">
                          {b.code}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-label">
                          • {b.region} Zone
                        </span>
                      </div>
                      <h4 className="font-headline font-bold text-sm text-on-surface truncate">
                        {b.name}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant truncate">
                        {b.state}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {selectedBoard.id === b.id ? (
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
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOnboardStep(1)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setOnboardStep(3);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-primary/90 flex items-center gap-1.5"
                >
                  <span>Next: Scholar Profile</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Scholar Details & Launch */}
          {onboardStep === 3 && (
            <form onSubmit={handleCompleteSignup} className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <h3 className="font-headline text-xl font-bold text-on-surface">
                  Create Your Scholar Account
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Enrolling for: <strong className="text-primary font-bold">{selectedBoard.name}</strong> •{' '}
                  <span className="capitalize">{selectedLang} Medium</span>
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                      10-Digit Mobile Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs text-on-surface-variant font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl pl-12 pr-4 py-3 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant font-label uppercase">
                      Account Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secure password"
                      className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-3 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setOnboardStep(2)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-md hover:bg-primary/90 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
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

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
              <span className="text-on-surface-variant">
                Want to evaluate the cockpit instantly without signing up?
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleInstantDemoLogin(selectedBoard.id)}
              className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 text-xs font-label font-bold transition-colors shrink-0"
            >
              One-Click Demo Scholar Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated State: Pan-India Student Cockpit Dashboard
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6">
      {/* Greeting Banner & Personal Badges */}
      <section className="flex flex-col space-y-3 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider uppercase text-primary font-label">
              Exam Cockpit • {user.targetExam || 'National Board Exam'}
            </p>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-on-surface leading-tight truncate">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Scholar'}
            </h1>
          </div>
          <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 shadow-xs border border-outline-variant/40">
            <span className="material-symbols-outlined text-primary text-[24px]">school</span>
          </div>
        </div>

        {/* Telemetry Badges Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant shrink-0 font-medium border border-primary/20">
            <span
              className="material-symbols-outlined text-[16px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <span className="font-label font-bold">{user?.streakDays || 7} Days Streak</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface shrink-0 font-medium border border-outline-variant/50">
            <span className="material-symbols-outlined text-[15px] text-secondary">verified</span>
            <span className="font-label font-semibold">{user?.targetExam || 'Board Exam'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container shrink-0 font-medium border border-outline-variant/40">
            <span className="material-symbols-outlined text-[15px] text-on-secondary-container">cloud_done</span>
            <span className="font-label">20-Year Archive Active</span>
          </div>
        </div>
      </section>

      {/* Responsive 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Daily Workout + Core Hub + Question of the Day */}
        <div className="lg:col-span-8 space-y-6">
          {/* Daily Target Progress Card */}
          <section className="w-full bg-surface-container-low rounded-xl p-5 shadow-xs border border-outline-variant/60 relative overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold font-label text-primary">
                    Daily Commitment
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-on-surface leading-tight">
                  Today&apos;s Board Exam Workout
                </h2>
                <p className="text-xs text-on-surface-variant line-clamp-1">
                  Target: Complete 25 high-probability questions
                </p>
              </div>

              {/* Circular Progress Ring */}
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-primary"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="72, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display text-sm font-bold text-on-surface leading-none">18</span>
                  <span className="text-[9px] text-on-surface-variant font-medium leading-none mt-0.5">/25</span>
                </div>
              </div>
            </div>

            {/* Resume Session Action Bar */}
            <div className="mt-4 pt-3 flex items-center justify-between bg-surface-container-lowest rounded-lg p-3 border border-outline-variant/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface truncate">Annual Solved Paper 2024</p>
                  <p className="text-[11px] text-on-surface-variant truncate">Standard & Basic Mathematical Proofs</p>
                </div>
              </div>
              <button
                onClick={() => handleOpenTest('Annual Solved Paper 2024')}
                className="shrink-0 px-3.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg shadow-xs active:scale-95 transition-all"
              >
                Resume
              </button>
            </div>
          </section>

          {/* Quick Access Core Practice Hub (2x2 on mobile, 4-col on laptop) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold text-on-surface">Core Practice Hub</h3>
              <span className="text-xs font-medium text-primary font-label">Exam Toolkit</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 20-Year Archives */}
              <Link
                href="/practice"
                className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 flex flex-col justify-between h-36 shadow-xs border border-outline-variant/60 relative overflow-hidden group transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary mb-2 border border-outline-variant/40">
                  <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary font-label">28 State Boards</p>
                  <h4 className="font-headline text-base font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
                    Board Archives
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-label">2005–2024 Solved</p>
                </div>
              </Link>

              {/* CBT Live Mock Test */}
              <div
                onClick={() => handleOpenTest('All-India Board Mock Simulator 2024')}
                className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 flex flex-col justify-between h-36 shadow-xs border border-outline-variant/60 relative overflow-hidden cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">timer</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-error-container text-on-error-container">
                    Live
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-tertiary font-label">Real Timer</p>
                  <h4 className="font-headline text-base font-bold text-on-surface leading-snug group-hover:text-tertiary transition-colors">
                    CBT Mock Test
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-label">Exact OMR Sim</p>
                </div>
              </div>

              {/* AI Neural Solver */}
              <Link
                href="/ai-tutor"
                className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 flex flex-col justify-between h-36 shadow-xs border border-outline-variant/60 relative overflow-hidden transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-primary font-label">Step Explainer</p>
                  <h4 className="font-headline text-base font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
                    AI Neural Solver
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-label">Snap &amp; Diagnose</p>
                </div>
              </Link>

              {/* Syllabus Weightage Heatmap */}
              <Link
                href="/practice"
                className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 flex flex-col justify-between h-36 shadow-xs border border-outline-variant/60 relative overflow-hidden transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-secondary border border-outline-variant/40">
                  <span className="material-symbols-outlined text-[20px]">grid_goldenratio</span>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary font-label">Directory</p>
                  <h4 className="font-headline text-base font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
                    Tabular Vault
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 font-label">Drive Scans &amp; Keys</p>
                </div>
              </Link>
            </div>
          </section>

          {/* High-Yield Question of the Day */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                <h3 className="font-headline text-xl font-bold text-on-surface">Question of the Day</h3>
              </div>
              <span className="text-xs font-bold text-tertiary bg-tertiary-fixed px-2.5 py-0.5 rounded-full font-label">
                Board Favorite
              </span>
            </div>
            <div className="w-full bg-surface-container-low rounded-xl p-5 shadow-xs border border-outline-variant/60 space-y-4">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-label">
                <span className="font-semibold text-primary">Class 10 Mathematics · Triangles</span>
                <span>Repeated 11 Times in Past 20 Years</span>
              </div>
              <div className="space-y-2">
                <h4 className="font-headline text-lg sm:text-xl font-bold text-on-surface leading-relaxed">
                  State and prove the Basic Proportionality Theorem (Thales Theorem): If a line is drawn parallel to one side of a triangle intersecting the other two sides, it divides them in the same ratio.
                </h4>
                <div className="p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">draw</span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Features geometric construction with step-by-step marking scheme breakdown
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={() => handleOpenTest('Thales Theorem CBT Challenge')}
                  className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold font-label uppercase tracking-wider rounded-lg shadow-xs text-center active:scale-95 transition-all"
                >
                  Solve in CBT Arena
                </button>
                <Link
                  href="/practice"
                  className="px-4 py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold font-label rounded-lg transition-colors border border-outline-variant/50"
                >
                  View Step Rubric
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (4 cols): Predictive Telemetry & Exam Countdown */}
        <div className="lg:col-span-4 space-y-6">
          {/* Estimated Rank & Board Merit Predictor */}
          <section className="bg-surface-container-low rounded-xl p-5 shadow-xs border border-outline-variant/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold text-on-surface">State Merit Predictor</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label">
                Telemetry
              </span>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/40 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-on-surface-variant font-label">Estimated State Rank</p>
                <p className="font-display text-3xl font-extrabold text-primary">
                  #{user?.estimatedRank || 120}
                </p>
                <p className="text-[10px] text-primary font-semibold mt-0.5 font-label">
                  Target: {user.targetInstitution || 'State Top 500 Merit'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-on-surface-variant font-label">Historical Accuracy</p>
                <p className="font-display text-2xl font-bold text-on-surface">
                  {user?.accuracy || 88.5}%
                </p>
                <span className="text-[10px] font-bold text-secondary font-label">
                  Top 2.4% Percentile
                </span>
              </div>
            </div>

            {/* Micro Topic Mastery Bars */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-on-surface font-label">Quadratic Equations</span>
                <span className="font-mono text-primary font-bold">94%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full w-[94%]" />
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span className="font-semibold text-on-surface font-label">Triangles &amp; Similarity</span>
                <span className="font-mono text-primary font-bold">78%</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-2 rounded-full w-[78%]" />
              </div>
            </div>
          </section>

          {/* Exam Countdown & Critical Milestone */}
          <section className="bg-surface-container-low rounded-xl p-5 shadow-xs border border-outline-variant/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">event</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Exam Countdown</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/40">
                <span className="font-display text-2xl font-bold text-on-surface">42</span>
                <p className="text-[10px] text-on-surface-variant font-label">Days Left</p>
              </div>
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/40">
                <span className="font-display text-2xl font-bold text-on-surface">14</span>
                <p className="text-[10px] text-on-surface-variant font-label">Units Left</p>
              </div>
              <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/40">
                <span className="font-display text-2xl font-bold text-primary">20</span>
                <p className="text-[10px] text-on-surface-variant font-label">Years Bank</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* CBT Modal */}
      {activeModalPaper && (
        <TestArenaModal
          isOpen={true}
          paperTitle={activeModalPaper}
          onClose={() => setActiveModalPaper(null)}
        />
      )}
    </div>
  );
}
