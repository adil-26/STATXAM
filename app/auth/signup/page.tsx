'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';
import { ALL_INDIAN_BOARDS } from '@/lib/boards-catalog';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loginAsDemo } = useAuth();

  const [selectedBoardId, setSelectedBoardId] = useState('cbse');
  const [selectedMedium, setSelectedMedium] = useState('english');
  const [includeDiagnostic, setIncludeDiagnostic] = useState(true);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedBoard = ALL_INDIAN_BOARDS.find((b) => b.id === selectedBoardId) || ALL_INDIAN_BOARDS[0];

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      setErrorMsg('Please enter your full name and 10-digit mobile number');
      return;
    }
    triggerHaptic('medium');
    setIsLoading(true);
    setErrorMsg(null);

    const res = await signup(
      {
        fullName: fullName.trim(),
        mobile: mobile.startsWith('+91') ? mobile.trim() : `+91 ${mobile.trim()}`,
        language: selectedMedium as any,
        targetExam: `${selectedBoard.name} (${selectedBoard.classes[0]})`,
        targetInstitution: `${selectedBoard.state} State Merit Top 500`,
      },
      password || 'student123'
    );

    if (res.success) {
      triggerHaptic('success');
      setTimeout(() => router.push('/'), 400);
    } else {
      triggerHaptic('error');
      setErrorMsg(res.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    triggerHaptic('light');
    loginAsDemo({
      fullName: 'Aarav Sharma',
      mobile: '+91 98765 43210',
      language: 'english',
      targetExam: `${selectedBoard.name} (${selectedBoard.classes[0]})`,
      targetInstitution: `${selectedBoard.state} State Merit Rank 120`,
    });
    router.push('/');
  };

  return (
    <div className="w-full max-w-xl mx-auto px-5 py-4 space-y-7 animate-in fade-in duration-200">
      {/* Progress Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-label font-bold tracking-widest text-primary">
            Pan-India Scholar Setup
          </span>
          <span className="text-xs text-on-surface-variant font-label font-bold">
            28 State Boards Active
          </span>
        </div>
        <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
          <div className="bg-primary h-1.5 rounded-full w-full" />
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface pt-1">
          Target Board &amp; Language Calibration
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Configure your study medium and examination board to calibrate past 20-year solved papers and official step rubrics.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleContinue} className="space-y-6">
        {/* Section 1: Language / Medium Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
            <span>1. Preferred Medium of Study</span>
            <span className="text-[10px] text-primary lowercase font-normal">
              Adapts all papers &amp; AI answers
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'english', label: 'English', desc: 'Standard' },
              { id: 'hindi', label: 'Hindi', desc: 'हिंदी माध्यम' },
              { id: 'punjabi', label: 'Punjabi', desc: 'ਪੰਜਾਬੀ ਮਾਧਿਅਮ' },
              { id: 'tamil', label: 'Tamil', desc: 'தமிழ் வழி' },
              { id: 'bengali', label: 'Bengali', desc: 'বাংলা মাধ্যম' },
              { id: 'telugu', label: 'Telugu', desc: 'తెలుగు' },
              { id: 'marathi', label: 'Marathi', desc: 'मराठी' },
              { id: 'gujarati', label: 'Gujarati', desc: 'ગુજરાતી' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedMedium(m.id);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-label font-bold border text-center transition-all ${
                  selectedMedium === m.id
                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                    : 'bg-surface-container-low text-on-surface border-outline-variant/50 hover:bg-surface-container'
                }`}
              >
                <p className="text-xs">{m.label}</p>
                <p className="text-[10px] font-normal opacity-80 truncate">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Examination Board Selection */}
        <div className="space-y-2.5">
          <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant flex items-center justify-between">
            <span>2. Target Examination Board</span>
            <span className="text-[10px] text-secondary font-mono">
              2005–2024 Archives Included
            </span>
          </label>
          <div className="relative">
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/70 rounded-xl px-4 py-3 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            >
              {ALL_INDIAN_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.fullName} ({b.state}) • {b.yearsAvailable}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 3: Scholar Details */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
            3. Scholar Registration Details
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-on-surface-variant font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl pl-12 pr-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure password"
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl px-4 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Diagnostic Benchmark Option */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setIncludeDiagnostic(!includeDiagnostic);
          }}
          className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/50 cursor-pointer hover:bg-surface-container transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[18px]">biotech</span>
            </div>
            <div>
              <p className="text-xs font-label font-bold text-on-surface">
                Enroll in Initial Diagnostic Benchmark
              </p>
              <p className="text-[11px] text-on-surface-variant">
                5-min rapid diagnostic to calibrate your State Merit Rank estimate
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary text-[22px]">
            {includeDiagnostic ? 'check_box' : 'check_box_outline_blank'}
          </span>
        </div>

        {/* Launch Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 bg-primary hover:bg-primary-container text-on-primary font-label font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span>Calibrating Board Syllabus...</span>
          ) : (
            <>
              <span>Initialize StatXam Cockpit</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      {/* Demo Access Button & Sign In Link */}
      <div className="pt-2 border-t border-outline-variant/40 space-y-3 text-center">
        <button
          type="button"
          onClick={handleQuickDemo}
          className="w-full py-2.5 rounded-xl bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container text-xs font-label font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>Instant Demo Scholar Access (1-Click)</span>
        </button>

        <p className="text-xs text-on-surface-variant font-label">
          Already registered?{' '}
          <Link href="/auth/login" className="text-primary font-bold hover:underline">
            Sign In with Mobile
          </Link>
        </p>
      </div>
    </div>
  );
}
