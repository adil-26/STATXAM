'use client';

import React, { useState, useEffect, useRef } from 'react';
import { triggerHaptic, hideAppSplash } from '@/lib/native-permissions';

/**
 * Synthesize Netflix-style dramatic "Ta-Dum" cinematic sub-bass & resonant chime
 * Uses pure Web Audio API (zero external assets, 100% offline, zero latency).
 */
function playCinematicTaDum() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // 1. Initial "Ta" (Crisp low-mid drum kick at t=0.0s)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    gain1.gain.setValueAtTime(0.5, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // 2. Heavy Sub-Bass "DUMMMM" (Cinematic seismic impact at t=0.18s)
    setTimeout(() => {
      const now = ctx.currentTime;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(95, now);
      osc2.frequency.exponentialRampToValueAtTime(32, now + 1.2);
      gain2.gain.setValueAtTime(0.7, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      // Lowpass filter for deep cinematic weight
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);
      filter.frequency.linearRampToValueAtTime(60, now + 1.2);

      osc2.connect(filter);
      filter.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.2);

      // 3. Shimmering Crystal Harmonics (The high-end Netflix reverb tail)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(523.25, now); // C5
      osc3.frequency.linearRampToValueAtTime(659.25, now + 0.8); // E5
      gain3.gain.setValueAtTime(0.15, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now);
      osc3.stop(now + 0.9);
    }, 180);
  } catch {
    // Graceful fallback if audio context is blocked by browser policy
  }
}

// 24 Spectral Light Ribbons for the Netflix Ray Burst (representing Indian Board Archives)
const SPECTRUM_RAYS = [
  { color: '#c2652a', height: '100%', delay: '0.95s', width: '3px', left: '10%' },
  { color: '#f0a878', height: '85%', delay: '1.02s', width: '2px', left: '14%' },
  { color: '#e07a38', height: '95%', delay: '0.98s', width: '4px', left: '18%' },
  { color: '#fb923c', height: '110%', delay: '1.05s', width: '3px', left: '22%' },
  { color: '#d97706', height: '90%', delay: '0.97s', width: '2px', left: '26%' },
  { color: '#f59e0b', height: '105%', delay: '1.01s', width: '4px', left: '30%' },
  { color: '#c2652a', height: '120%', delay: '0.96s', width: '5px', left: '34%' },
  { color: '#f0a878', height: '95%', delay: '1.04s', width: '2px', left: '38%' },
  { color: '#ffedd5', height: '130%', delay: '1.00s', width: '4px', left: '42%' },
  { color: '#fdba74', height: '115%', delay: '0.99s', width: '3px', left: '46%' },
  { color: '#f97316', height: '140%', delay: '1.03s', width: '6px', left: '50%' }, // Center primary
  { color: '#ea580c', height: '120%', delay: '0.97s', width: '4px', left: '54%' },
  { color: '#f0a878', height: '130%', delay: '1.01s', width: '3px', left: '58%' },
  { color: '#c2652a', height: '100%', delay: '1.05s', width: '5px', left: '62%' },
  { color: '#fbbf24', height: '105%', delay: '0.98s', width: '3px', left: '66%' },
  { color: '#f59e0b', height: '90%', delay: '1.02s', width: '2px', left: '70%' },
  { color: '#d97706', height: '110%', delay: '0.96s', width: '4px', left: '74%' },
  { color: '#fb923c', height: '85%', delay: '1.04s', width: '3px', left: '78%' },
  { color: '#e07a38', height: '95%', delay: '0.99s', width: '2px', left: '82%' },
  { color: '#f0a878', height: '80%', delay: '1.03s', width: '3px', left: '86%' },
  { color: '#c2652a', height: '90%', delay: '1.00s', width: '2px', left: '90%' },
];

export default function AiLaunchAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<'ribbon' | 'burst' | 'zoom' | 'done'>('ribbon');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const runAnimation = () => {
    clearAllTimers();
    setIsVisible(true);
    setIsFadingOut(false);
    setPhase('ribbon');

    // 1. Start Ta-Dum Audio & First Haptic Impact
    playCinematicTaDum();
    triggerHaptic('heavy');

    // 2. Phase 2: Netflix Spectral Ray Burst at 1.05s
    const t1 = setTimeout(() => {
      setPhase('burst');
      triggerHaptic('medium');
    }, 1050);

    // 3. Phase 3: 3D Hyper-Zoom at 1.85s
    const t2 = setTimeout(() => {
      setPhase('zoom');
      triggerHaptic('light');
    }, 1850);

    // 4. Phase 4: Dissolve into app at 2.65s
    const t3 = setTimeout(() => {
      handleDismiss();
    }, 2650);

    timersRef.current = [t1, t2, t3];
  };

  useEffect(() => {
    // Show on initial session launch
    const hasSeenIntro = sessionStorage.getItem('statxam_netflix_intro_seen');
    if (!hasSeenIntro) {
      sessionStorage.setItem('statxam_netflix_intro_seen', 'true');
      runAnimation();
      hideAppSplash();
    }

    // Allow user to replay anytime
    const handleReplay = () => {
      runAnimation();
    };
    window.addEventListener('statxam_replay_ai_intro', handleReplay);

    return () => {
      clearAllTimers();
      window.removeEventListener('statxam_replay_ai_intro', handleReplay);
    };
  }, []);

  const handleDismiss = () => {
    setIsFadingOut(true);
    triggerHaptic('light');
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      setPhase('done');
    }, 400);
  };

  useEffect(() => {
    if (isVisible) {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070504] text-[#faf5ee] overflow-hidden select-none transition-all duration-400 ease-out ${
        isFadingOut ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ perspective: '1200px' }}
    >
      {/* Cinematic Radial Backlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(194,101,42,0.22)_0%,_rgba(10,8,7,0.85)_55%,_#050403_100%)] pointer-events-none" />

      {/* Top Header / Skip Button */}
      <div className="absolute top-0 inset-x-0 p-5 pt-safe flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#f0a878] shadow-[0_0_8px_#f0a878] animate-ping" />
          <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-[#f0a878]/90">
            STATXAM STUDIOS
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="px-3.5 py-1.5 rounded-full bg-[#1e1713]/80 hover:bg-[#2c221c] border border-[#48372d] text-xs font-mono text-[#cec6be] flex items-center gap-1.5 transition-all active:scale-95 shadow-md backdrop-blur-xs"
        >
          <span>Skip</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>

      {/* MAIN CINEMATIC STAGE */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Horizontal Anamorphic Lens Flare Streak */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#f0a878] to-transparent shadow-[0_0_20px_#f0a878,0_0_40px_#c2652a] pointer-events-none animate-[anamorphicFlarePulse_2.4s_ease-out_forwards]" />

        {/* PHASE 1: THE MONOGRAM RIBBON (0.0s - 1.1s) */}
        {phase === 'ribbon' && (
          <div className="relative w-44 h-56 sm:w-56 sm:h-72 flex items-center justify-center animate-in zoom-in-75 duration-700">
            {/* Ambient Behind-Glow */}
            <div className="absolute w-48 h-48 rounded-full bg-[#c2652a]/30 blur-2xl animate-pulse" />

            {/* Left Vertical Ribbon Bar */}
            <div
              className="absolute left-6 top-0 bottom-0 w-8 sm:w-10 rounded-xs bg-gradient-to-b from-[#ff8d3f] via-[#c2652a] to-[#592205] shadow-[0_0_35px_rgba(240,168,120,0.6)]"
              style={{
                transformOrigin: 'bottom center',
                animation: 'netflixRibbonLeft 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Top Leading Lens Spark */}
              <div className="absolute -top-1 inset-x-0 h-2 bg-[#fff2e8] rounded-full blur-[1px] shadow-[0_0_12px_#ffffff]" />
            </div>

            {/* Diagonal Connecting Ribbon Bar */}
            <div
              className="absolute w-8 sm:w-10 h-[125%] rounded-xs bg-gradient-to-b from-[#ffa35c] via-[#d46d2c] to-[#421702] shadow-[0_0_45px_rgba(194,101,42,0.8)] z-10"
              style={{
                transformOrigin: 'center center',
                animation: 'netflixRibbonDiag 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <div className="absolute top-0 inset-x-0 h-3 bg-[#ffffff] rounded-full blur-[1px] shadow-[0_0_16px_#ffffff]" />
            </div>

            {/* Right Vertical Ribbon Bar */}
            <div
              className="absolute right-6 top-0 bottom-0 w-8 sm:w-10 rounded-xs bg-gradient-to-b from-[#ff8d3f] via-[#c2652a] to-[#592205] shadow-[0_0_35px_rgba(240,168,120,0.6)]"
              style={{
                transformOrigin: 'top center',
                animation: 'netflixRibbonRight 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <div className="absolute -bottom-1 inset-x-0 h-2 bg-[#fff2e8] rounded-full blur-[1px] shadow-[0_0_12px_#ffffff]" />
            </div>
          </div>
        )}

        {/* PHASE 2 & 3: THE NETFLIX SPECTRAL RAY BURST (1.05s - 2.6s) */}
        {(phase === 'burst' || phase === 'zoom') && (
          <div
            className={`relative w-full h-[380px] sm:h-[480px] flex items-center justify-center transition-transform duration-700 ease-in ${
              phase === 'zoom' ? 'scale-[3.2] opacity-0 blur-[3px]' : 'scale-100 opacity-100'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Luminous Core Light Explosion */}
            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-r from-[#c2652a] via-[#f0a878] to-amber-200 blur-3xl opacity-80 animate-ping duration-1000" />

            {/* 24 Streaming 3D Light Rays */}
            <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between">
              {SPECTRUM_RAYS.map((ray, idx) => (
                <div
                  key={idx}
                  className="relative rounded-full shadow-[0_0_15px_currentColor]"
                  style={{
                    height: ray.height,
                    width: ray.width,
                    backgroundColor: ray.color,
                    color: ray.color,
                    animation: `netflixSpectrumRay 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) ${ray.delay} forwards`,
                    transformOrigin: 'center center',
                  }}
                />
              ))}
            </div>

            {/* Center Neural Icon Burst */}
            <div className="relative z-20 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#1f1712]/90 border border-[#f0a878] shadow-[0_0_50px_#f0a878] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#f0a878] text-[40px] animate-pulse">
                  psychology
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CINEMATIC BRAND TITLE REVEAL (1.4s - 2.6s) */}
        <div className="mt-8 text-center space-y-2 z-20">
          <h1
            className="font-headline text-4xl sm:text-6xl font-black tracking-[0.35em] uppercase bg-gradient-to-b from-[#ffffff] via-[#f0a878] to-[#c2652a] bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(240,168,120,0.45)]"
            style={{
              textShadow: '0 0 40px rgba(194,101,42,0.6)',
            }}
          >
            STATXAM
          </h1>
          <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-[#cec6be]/80">
            20-Year Board Exam Archive • AI Neural Intelligence
          </p>
        </div>
      </div>

      {/* Bottom Production Credits */}
      <div className="absolute bottom-6 inset-x-0 text-center pb-safe z-30">
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#73655b]">
          Calibrated to 28 State Education Boards &bull; NEET-UG &bull; JEE
        </p>
      </div>
    </div>
  );
}
