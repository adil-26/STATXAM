'use client';

import React, { useEffect, useState } from 'react';
import { isNative, triggerHaptic, hideAppSplash } from '@/lib/native-permissions';

/**
 * Checks if the current client is running on a phone/mobile device.
 */
function isPhoneClient(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNative()) return true;

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isPhoneWidth = window.innerWidth <= 768;

  return (isMobileUA || isTouchScreen) && isPhoneWidth;
}

export function StatXamSplash({ onFinish }: { onFinish?: () => void }) {
  const [phase, setPhase] = useState<'active' | 'fading' | 'done'>('active');

  const handleComplete = () => {
    setPhase('done');
    onFinish?.();
  };

  useEffect(() => {
    // Only display on phone / mobile devices, skip on desktop website
    if (!isPhoneClient()) {
      handleComplete();
      hideAppSplash();
      return;
    }

    // Play full splash only once per app session
    if (sessionStorage.getItem('statxam_splash_seen')) {
      handleComplete();
      hideAppSplash();
      return;
    }

    // Subtle tactile response as the vector draws
    triggerHaptic('light');
    const hapticTimer = setTimeout(() => {
      triggerHaptic('medium');
    }, 450);

    // Dismiss native Capacitor Android splash seamlessly into SVG canvas
    hideAppSplash();

    const fadeTimer = setTimeout(() => setPhase('fading'), 1400);
    const doneTimer = setTimeout(() => {
      sessionStorage.setItem('statxam_splash_seen', '1');
      handleComplete();
    }, 1850);

    const handleReplay = () => {
      setPhase('active');
      triggerHaptic('medium');
      setTimeout(() => setPhase('fading'), 1400);
      setTimeout(() => setPhase('done'), 1850);
    };
    window.addEventListener('statxam_replay_ai_intro', handleReplay);

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('statxam_replay_ai_intro', handleReplay);
    };
  }, []);

  // Broadcast modal state so BottomNav hides automatically while splash is visible
  useEffect(() => {
    if (phase !== 'done') {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#faf5ee] select-none transition-opacity duration-500 ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <style>{`
        @keyframes drawStroke {
          from { stroke-dashoffset: 220; opacity: 0.2; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes revealUp {
          from { opacity: 0; transform: translateY(10px); letter-spacing: 0.14em; }
          to { opacity: 1; transform: translateY(0); letter-spacing: 0.02em; }
        }
        @keyframes subtlePulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.18); opacity: 0.22; }
        }
        .sx-draw {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawStroke 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sx-draw-delay {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawStroke 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
        }
        .sx-text {
          opacity: 0;
          animation: revealUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards;
        }
        .sx-glow {
          animation: subtlePulse 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Soft Terracotta Ambient Halo */}
      <div className="relative flex items-center justify-center">
        <div className="sx-glow absolute h-28 w-28 rounded-full bg-[#c2652a] blur-2xl" />

        {/* Pure Vector Peak + Open Book Emblem */}
        <svg
          width="88"
          height="88"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-[0_4px_12px_rgba(194,101,42,0.2)]"
        >
          {/* Upward Summit Peak */}
          <path
            d="M34 48 L50 22 L66 48"
            stroke="#c2652a"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sx-draw"
          />
          {/* Left Open Book Page */}
          <path
            d="M50 56 L22 44 V72 L50 82"
            stroke="#c2652a"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sx-draw-delay"
          />
          {/* Right Open Book Page */}
          <path
            d="M50 56 L78 44 V72 L50 82 V56"
            stroke="#c2652a"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sx-draw-delay"
          />
        </svg>
      </div>

      {/* Crisp Editorial Wordmark */}
      <h1 className="sx-text mt-4 font-headline text-3xl font-bold text-[#2b2118] tracking-wide">
        StatXam
      </h1>
      <p className="sx-text mt-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6e5a49]">
        28 State Boards &bull; JEE &bull; NEET &bull; IELTS
      </p>
    </div>
  );
}

export default StatXamSplash;
