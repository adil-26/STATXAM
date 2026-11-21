'use client';

import React, { useState, useEffect, useRef } from 'react';
import { isNative, triggerHaptic, hideAppSplash } from '@/lib/native-permissions';

/**
 * Checks if the current client is a phone (Capacitor native Android/iOS shell, or mobile viewport)
 * Ensures the launch video plays ON THE PHONE ONLY, NOT on the desktop website.
 */
function isPhoneClient(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Always true in Capacitor native app (Android APK)
  if (isNative()) return true;

  // 2. Mobile device User Agent check
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isPhoneWidth = window.innerWidth <= 768;

  return (isMobileUA || isTouchScreen) && isPhoneWidth;
}

export default function AiLaunchAnimation() {
  const [isPhone, setIsPhone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const handleDismiss = () => {
    setIsFadingOut(true);
    triggerHaptic('light');
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 450);
  };

  const toggleSound = () => {
    triggerHaptic('light');
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const startPhoneIntro = () => {
    clearAllTimers();
    setIsVisible(true);
    setIsFadingOut(false);

    // Initial haptic spark
    triggerHaptic('medium');

    // Sync subtle haptics with the video keyframes:
    // t = 2.8s: Lines weave and spiral into center vortex
    const tVortex = setTimeout(() => {
      triggerHaptic('medium');
    }, 2800);

    // t = 4.2s: StatXam Book Emblem emerges from vortex
    const tEmblem = setTimeout(() => {
      triggerHaptic('heavy');
    }, 4200);

    // t = 5.8s: "StatXam" typography solidifies
    const tLogo = setTimeout(() => {
      triggerHaptic('light');
    }, 5800);

    // Fallback safety timer if video fails to fire onEnded (duration is ~8.5s)
    const tEnd = setTimeout(() => {
      handleDismiss();
    }, 9200);

    timersRef.current = [tVortex, tEmblem, tLogo, tEnd];

    // Attempt video playback
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Video started playing successfully
            })
            .catch(() => {
              // Fallback: force muted autoplay if unmuted was blocked by policy
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play().catch(() => {});
              }
            });
        }
      }
    }, 50);
  };

  useEffect(() => {
    // Determine whether this device is a phone
    const checkPhone = isPhoneClient();
    setIsPhone(checkPhone);

    // If not a phone (i.e. desktop website), exit immediately
    if (!checkPhone) {
      hideAppSplash();
      return;
    }

    // On phone: check if seen in this session
    const hasSeenIntro = sessionStorage.getItem('statxam_phone_launch_intro_seen');
    if (!hasSeenIntro) {
      sessionStorage.setItem('statxam_phone_launch_intro_seen', 'true');
      startPhoneIntro();
      hideAppSplash();
    }

    // Allow user to trigger replay anytime (e.g. from Settings or Profile)
    const handleReplay = () => {
      startPhoneIntro();
    };
    window.addEventListener('statxam_replay_ai_intro', handleReplay);

    return () => {
      clearAllTimers();
      window.removeEventListener('statxam_replay_ai_intro', handleReplay);
    };
  }, []);

  // Broadcast modal state so BottomNav hides automatically while intro plays
  useEffect(() => {
    if (isVisible) {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
  }, [isVisible]);

  // NEVER render on website / desktop browsers
  if (!isPhone || !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#d5bfab] overflow-hidden select-none transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Cinematic Fullscreen Launch Video */}
      <video
        ref={videoRef}
        src="/intro.mp4"
        playsInline
        autoPlay
        muted={isMuted}
        onEnded={handleDismiss}
        className="w-full h-full object-cover object-center"
      />

      {/* Top Floating Controls (Safe-Area Aware) */}
      <div className="absolute top-0 inset-x-0 p-4 pt-safe flex items-center justify-between z-50 pointer-events-auto">
        {/* StatXam Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b2118]/40 backdrop-blur-md border border-[#ffffff]/20 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-[#f0a878] animate-pulse" />
          <span className="text-[10px] font-mono tracking-widest uppercase text-[#ffffff] font-bold">
            STATXAM
          </span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute/Unmute Button */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="w-8 h-8 rounded-full bg-[#2b2118]/50 hover:bg-[#2b2118]/70 backdrop-blur-md border border-[#ffffff]/20 text-[#ffffff] flex items-center justify-center transition-all active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3.5 py-1.5 rounded-full bg-[#2b2118]/60 hover:bg-[#2b2118]/80 backdrop-blur-md border border-[#ffffff]/20 text-xs font-headline font-bold text-[#ffffff] flex items-center gap-1 transition-all active:scale-95 shadow-md"
          >
            <span>Skip</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Bottom Production Badge */}
      <div className="absolute bottom-4 inset-x-0 text-center pb-safe z-40 pointer-events-none">
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#543b2b]/70 font-semibold drop-shadow-xs">
          20-Year Archive &bull; AI Neural Engine
        </p>
      </div>
    </div>
  );
}
