'use client';

import React, { useState, useEffect } from 'react';
import { triggerHaptic, hideAppSplash } from '@/lib/native-permissions';

export default function AiLaunchAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState(12);

  const startAnimation = () => {
    setIsVisible(true);
    setIsFadingOut(false);
    setStage(1);
    setProgress(15);
    triggerHaptic('light');

    // Stage 1 -> 2
    const t1 = setTimeout(() => {
      setStage(2);
      setProgress(65);
      triggerHaptic('light');
    }, 700);

    // Stage 2 -> 3
    const t2 = setTimeout(() => {
      setStage(3);
      setProgress(100);
      triggerHaptic('success');
    }, 1450);

    // Fade out
    const t3 = setTimeout(() => {
      handleDismiss();
    }, 2350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  useEffect(() => {
    // Check if previously shown in this session
    const hasSeenIntro = sessionStorage.getItem('statxam_ai_intro_seen');
    if (!hasSeenIntro) {
      sessionStorage.setItem('statxam_ai_intro_seen', 'true');
      const cleanup = startAnimation();
      hideAppSplash();
      return cleanup;
    }

    // Listen for manual replay requests (e.g. from AI Tutor or Profile button)
    const handleReplay = () => {
      startAnimation();
    };
    window.addEventListener('statxam_replay_ai_intro', handleReplay);
    return () => {
      window.removeEventListener('statxam_replay_ai_intro', handleReplay);
    };
  }, []);

  const handleDismiss = () => {
    setIsFadingOut(true);
    triggerHaptic('light');
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
    }, 450);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-between p-6 bg-[#161210] text-[#faf5ee] transition-all duration-450 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top Header / Skip */}
      <div className="w-full flex items-center justify-between pt-safe">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-mono tracking-widest uppercase text-[#f0a878]/80">
            AI Neural Engine v2.4
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="px-3 py-1 rounded-full bg-[#261e1a] hover:bg-[#342923] border border-[#483a32] text-xs font-mono text-[#cec6be] flex items-center gap-1 transition-all active:scale-95"
        >
          <span>Skip</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* Center Quantum AI Neural Orb */}
      <div className="relative flex flex-col items-center justify-center my-auto">
        {/* Ambient Glow */}
        <div className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-[#c2652a]/25 via-[#f0a878]/20 to-amber-500/10 blur-3xl animate-pulse" />

        {/* Outer Orbit Ring */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-[#c2652a]/30 flex items-center justify-center animate-[spin_12s_linear_infinite]">
          {/* Orbital Satellite Node */}
          <div className="absolute -top-1.5 w-3 h-3 rounded-full bg-[#f0a878] shadow-[0_0_12px_#f0a878]" />
          <div className="absolute -bottom-1.5 w-2.5 h-2.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_#fbbf24]" />
        </div>

        {/* Middle Dashed Counter-Orbit Ring */}
        <div className="absolute w-36 h-36 sm:w-42 sm:h-42 rounded-full border border-dashed border-[#f0a878]/40 flex items-center justify-center animate-[spin_8s_linear_infinite_reverse]" />

        {/* Inner Glowing AI Brain Core */}
        <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#2e241f] to-[#1c1613] border border-[#c2652a]/60 shadow-[0_0_30px_rgba(194,101,42,0.4)] flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[#f0a878] text-[36px] sm:text-[42px] animate-bounce">
            psychology
          </span>
        </div>

        {/* Floating Mathematical Constants */}
        <div className="absolute -top-6 -left-12 text-[11px] font-mono text-[#f0a878]/60 animate-pulse">
          {"\\int f(x)dx"}
        </div>
        <div className="absolute -bottom-6 -right-12 text-[11px] font-mono text-emerald-400/60 animate-pulse delay-150">
          {"\\vec{F} = m\\vec{a}"}
        </div>
        <div className="absolute top-1/2 -right-16 text-[10px] font-mono text-amber-300/50">
          {"E = mc^2"}
        </div>
        <div className="absolute top-1/2 -left-16 text-[10px] font-mono text-sky-300/50">
          {"\\lambda = h/p"}
        </div>

        {/* App Title */}
        <div className="mt-10 text-center space-y-1">
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#faf5ee] via-[#f0a878] to-[#c2652a] bg-clip-text text-transparent">
            StatXam
          </h1>
          <p className="text-xs sm:text-sm font-body text-[#cec6be] tracking-wide">
            20-Year Board Exam Archive &amp; AI Neural Tutor
          </p>
        </div>
      </div>

      {/* Bottom Neural Diagnostics & Progress Bar */}
      <div className="w-full max-w-sm space-y-4 pb-safe text-center">
        {/* Status Message */}
        <div className="h-6 flex items-center justify-center gap-2 text-xs font-mono text-[#f0a878] transition-all duration-300">
          {stage === 1 && (
            <span className="animate-in fade-in flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
              <span>Initializing Neural Synapses...</span>
            </span>
          )}
          {stage === 2 && (
            <span className="animate-in fade-in flex items-center gap-1.5 text-amber-300">
              <span className="material-symbols-outlined text-[15px]">database</span>
              <span>Calibrating 20-Year Exam Matrix...</span>
            </span>
          )}
          {stage === 3 && (
            <span className="animate-in fade-in flex items-center gap-1.5 text-emerald-300 font-bold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Groq AI Neural Engine Ready</span>
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#2a221d] overflow-hidden border border-[#3e322b]">
          <div
            className="h-full bg-gradient-to-r from-[#c2652a] via-[#f0a878] to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_#f0a878]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Supported Boards Ticker */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-[#8a7f76]">
          <span>PSEB</span>
          <span>•</span>
          <span>CBSE</span>
          <span>•</span>
          <span>NEET-UG</span>
          <span>•</span>
          <span>JEE MAIN</span>
          <span>•</span>
          <span>BSEB</span>
        </div>
      </div>
    </div>
  );
}
