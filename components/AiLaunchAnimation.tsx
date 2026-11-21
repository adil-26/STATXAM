'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { triggerHaptic, hideAppSplash } from '@/lib/native-permissions';

/**
 * Atmospheric low-frequency drone during the slow-mo creation of the 'S'
 */
function playSlowmoGenesisSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t); // A1 note
    osc.frequency.linearRampToValueAtTime(82, t + 2.5);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 1.2);
    gain.gain.linearRampToValueAtTime(0.4, t + 2.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 2.7);
  } catch {
    // Graceful fallback if audio is blocked by browser autoplay policy
  }
}

/**
 * Netflix-style dramatic "Ta-Dum" cinematic sub-bass & resonant chime on full monogram ignition
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

    // 1. Initial "Ta" impact
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    gain1.gain.setValueAtTime(0.6, t);
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
      osc2.frequency.exponentialRampToValueAtTime(32, now + 1.4);
      gain2.gain.setValueAtTime(0.8, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, now);
      filter.frequency.linearRampToValueAtTime(60, now + 1.4);

      osc2.connect(filter);
      filter.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.4);

      // 3. Shimmering Crystal Harmonics (The high-end reverb tail)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(523.25, now); // C5
      osc3.frequency.linearRampToValueAtTime(659.25, now + 1.1); // E5
      gain3.gain.setValueAtTime(0.2, now);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now);
      osc3.stop(now + 1.2);
    }, 180);
  } catch {
    // Graceful fallback
  }
}

// 24 Spectral Light Ribbons for the Ray Burst (matching StatXam desert palette)
const SPECTRUM_RAYS = [
  { color: '#c2652a', height: '100%', delay: '0.00s', width: '3px' },
  { color: '#f0a878', height: '85%', delay: '0.04s', width: '2px' },
  { color: '#e07a38', height: '95%', delay: '0.02s', width: '4px' },
  { color: '#fb923c', height: '110%', delay: '0.08s', width: '3px' },
  { color: '#d97706', height: '90%', delay: '0.03s', width: '2px' },
  { color: '#f59e0b', height: '105%', delay: '0.06s', width: '4px' },
  { color: '#c2652a', height: '120%', delay: '0.01s', width: '5px' },
  { color: '#f0a878', height: '95%', delay: '0.07s', width: '2px' },
  { color: '#ffedd5', height: '130%', delay: '0.05s', width: '4px' },
  { color: '#fdba74', height: '115%', delay: '0.03s', width: '3px' },
  { color: '#f97316', height: '145%', delay: '0.07s', width: '6px' }, // Center primary
  { color: '#ea580c', height: '125%', delay: '0.02s', width: '4px' },
  { color: '#f0a878', height: '130%', delay: '0.06s', width: '3px' },
  { color: '#c2652a', height: '100%', delay: '0.08s', width: '5px' },
  { color: '#fbbf24', height: '105%', delay: '0.03s', width: '3px' },
  { color: '#f59e0b', height: '90%', delay: '0.05s', width: '2px' },
  { color: '#d97706', height: '110%', delay: '0.01s', width: '4px' },
  { color: '#fb923c', height: '85%', delay: '0.07s', width: '3px' },
  { color: '#e07a38', height: '95%', delay: '0.04s', width: '2px' },
  { color: '#f0a878', height: '80%', delay: '0.06s', width: '3px' },
  { color: '#c2652a', height: '90%', delay: '0.02s', width: '2px' },
];

export default function AiLaunchAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<'slowmo_s' | 'burst' | 'reveal' | 'zoom' | 'done'>('slowmo_s');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const handleDismiss = () => {
    setIsFadingOut(true);
    triggerHaptic('light');
    setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      setPhase('done');
    }, 450);
  };

  const runAnimation = () => {
    clearAllTimers();
    setIsVisible(true);
    setIsFadingOut(false);
    setPhase('slowmo_s');

    // 1. Initial slowmo ambient drone & haptic spark
    playSlowmoGenesisSound();
    triggerHaptic('light');

    // 2. Midpoint haptic sweep as 'S' crosses center (t = 1.35s)
    const tMid = setTimeout(() => {
      triggerHaptic('medium');
    }, 1350);

    // 3. Phase 2: 'S' Ignites + Ta-Dum Bass & Spectral Burst (t = 2.65s)
    const t1 = setTimeout(() => {
      setPhase('burst');
      playCinematicTaDum();
      triggerHaptic('heavy');
    }, 2650);

    // 4. Phase 3: Brand Reveal & Golden Glow (t = 3.45s)
    const t2 = setTimeout(() => {
      setPhase('reveal');
      triggerHaptic('light');
    }, 3450);

    // 5. Phase 4: Forward Cinematic Glide & Warp (t = 4.35s)
    const t3 = setTimeout(() => {
      setPhase('zoom');
    }, 4350);

    // 6. Complete & Dissolve into App (t = 4.95s)
    const t4 = setTimeout(() => {
      handleDismiss();
    }, 4950);

    timersRef.current = [tMid, t1, t2, t3, t4];
  };

  useEffect(() => {
    // Show on initial session launch
    const hasSeenIntro = sessionStorage.getItem('statxam_netflix_intro_seen');
    if (!hasSeenIntro) {
      sessionStorage.setItem('statxam_netflix_intro_seen', 'true');
      runAnimation();
      hideAppSplash();
    }

    // Allow user to replay anytime via custom event
    const handleReplay = () => {
      runAnimation();
    };
    window.addEventListener('statxam_replay_ai_intro', handleReplay);

    return () => {
      clearAllTimers();
      window.removeEventListener('statxam_replay_ai_intro', handleReplay);
    };
  }, []);

  // Broadcast modal state so BottomNav hides automatically while intro is playing
  useEffect(() => {
    if (isVisible) {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
  }, [isVisible]);

  // Three.js 3D Slow-Mo "S" WebGL Scene
  useEffect(() => {
    if (!isVisible || !canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0.6, 1.8, 5.8);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xfff0e6, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd6, 3.2);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc2652a, 4.0);
    rimLight.position.set(-4, -3, -2);
    scene.add(rimLight);

    // 4. Mathematical 3D Curve for the uppercase letter "S" (StatXam Monogram)
    const sControlPoints = [
      new THREE.Vector3(1.2, 2.05, 0.0),
      new THREE.Vector3(0.8, 2.55, 0.12),
      new THREE.Vector3(0.0, 2.75, 0.22),
      new THREE.Vector3(-0.9, 2.55, 0.16),
      new THREE.Vector3(-1.3, 1.85, 0.06),
      new THREE.Vector3(-1.15, 1.05, -0.05),
      new THREE.Vector3(-0.55, 0.45, -0.14),
      new THREE.Vector3(0.0, 0.0, -0.18),
      new THREE.Vector3(0.55, -0.45, -0.14),
      new THREE.Vector3(1.15, -1.05, -0.05),
      new THREE.Vector3(1.3, -1.85, 0.06),
      new THREE.Vector3(0.9, -2.55, 0.16),
      new THREE.Vector3(0.0, -2.75, 0.22),
      new THREE.Vector3(-0.8, -2.55, 0.12),
      new THREE.Vector3(-1.2, -2.05, 0.0),
    ];
    const sCurve = new THREE.CatmullRomCurve3(sControlPoints);

    // 5. Geometries for the 'S'
    // A) Outer Sculpted Terracotta & Gold Tube
    const tubeOuterGeo = new THREE.TubeGeometry(sCurve, 200, 0.24, 18, false);
    const totalOuterIndices = tubeOuterGeo.index ? tubeOuterGeo.index.count : 0;
    tubeOuterGeo.setDrawRange(0, 0);

    const tubeOuterMat = new THREE.MeshStandardMaterial({
      color: 0xc2652a,
      emissive: 0x9e4314,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.88,
      transparent: true,
      opacity: 0.95,
    });
    const tubeOuterMesh = new THREE.Mesh(tubeOuterGeo, tubeOuterMat);
    scene.add(tubeOuterMesh);

    // B) Inner White-Hot Laser Core
    const tubeInnerGeo = new THREE.TubeGeometry(sCurve, 200, 0.09, 12, false);
    const totalInnerIndices = tubeInnerGeo.index ? tubeInnerGeo.index.count : 0;
    tubeInnerGeo.setDrawRange(0, 0);

    const tubeInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const tubeInnerMesh = new THREE.Mesh(tubeInnerGeo, tubeInnerMat);
    scene.add(tubeInnerMesh);

    // C) Leading Spark Flare & Dynamic Point Light
    const sparkGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    scene.add(sparkMesh);

    const sparkLight = new THREE.PointLight(0xffd5b3, 4.5, 5);
    scene.add(sparkLight);

    // D) 3D Floating Ember Star Dust Particles
    const particleCount = 380;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 11;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf0a878,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 6. Animation State Variables
    const startTime = performance.now();
    const DURATION_DRAW_MS = 2550; // Majestic slow-motion sweep duration

    const renderLoop = (now: number) => {
      const elapsed = now - startTime;

      // Slow-mo drawing progress with smooth cubic easing
      const rawT = Math.min(Math.max(elapsed / DURATION_DRAW_MS, 0), 1);
      // Smooth cubic bezier easing
      const progress = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      // Update visible range of the 'S'
      const activeOuterCount = Math.floor(totalOuterIndices * progress);
      const activeInnerCount = Math.floor(totalInnerIndices * progress);
      tubeOuterGeo.setDrawRange(0, activeOuterCount);
      tubeInnerGeo.setDrawRange(0, activeInnerCount);

      // Position leading spark flare at the head of the curve
      const clampedProg = Math.max(0.001, Math.min(progress, 0.999));
      const headPoint = sCurve.getPointAt(clampedProg);
      sparkMesh.position.copy(headPoint);
      sparkLight.position.copy(headPoint);

      if (progress >= 1.0) {
        // Once full 'S' is drawn, fade the spark into the ambient body
        sparkMesh.scale.setScalar(Math.max(0, 1 - (elapsed - DURATION_DRAW_MS) / 500));
        sparkLight.intensity = Math.max(0.5, 4.5 - (elapsed - DURATION_DRAW_MS) / 300);
        tubeOuterMat.emissiveIntensity = 1.35 + Math.sin(elapsed * 0.005) * 0.3;
      }

      // Camera Slow-Mo Dolly & 3D Parallax:
      // Starts close to the top hook, smoothly dollys back and centers
      const camT = Math.min(elapsed / 3200, 1);
      const startCam = new THREE.Vector3(0.6, 1.8, 5.8);
      const endCam = new THREE.Vector3(0.0, 0.0, 7.5);
      camera.position.lerpVectors(startCam, endCam, camT);
      camera.position.x += Math.sin(elapsed * 0.0008) * 0.15;
      camera.position.y += Math.cos(elapsed * 0.0008) * 0.08;
      camera.lookAt(0, 0, 0);

      // Subtle rotation of the letter 'S' for 3D depth
      tubeOuterMesh.rotation.y = Math.sin(elapsed * 0.0007) * 0.12;
      tubeOuterMesh.rotation.x = Math.cos(elapsed * 0.0009) * 0.06;
      tubeInnerMesh.rotation.copy(tubeOuterMesh.rotation);

      // Slowly rotate ember dust particles
      particleSystem.rotation.y = elapsed * 0.00015;
      particleSystem.rotation.x = elapsed * 0.0001;

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      tubeOuterGeo.dispose();
      tubeInnerGeo.dispose();
      sparkGeo.dispose();
      particleGeo.dispose();
      tubeOuterMat.dispose();
      tubeInnerMat.dispose();
      sparkMat.dispose();
      particleMat.dispose();
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070504] text-[#faf5ee] overflow-hidden select-none transition-all duration-450 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
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

      {/* THREE.JS 3D CANVAS STAGE FOR THE LETTER 'S' */}
      <div
        ref={canvasContainerRef}
        className={`absolute inset-0 z-10 transition-opacity duration-700 pointer-events-none ${
          phase === 'zoom' ? 'scale-125 opacity-0 blur-[4px]' : 'scale-100 opacity-100'
        }`}
      />

      {/* MAIN CINEMATIC 2D OVERLAYS & SPECTRAL LIGHT RAYS */}
      <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none z-20">
        {/* Horizontal Anamorphic Lens Flare Streak */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-[#f0a878] to-transparent shadow-[0_0_25px_#f0a878,0_0_50px_#c2652a] pointer-events-none animate-[anamorphicFlarePulse_3.2s_ease-out_forwards]" />

        {/* PHASE 2 & 3: THE SPECTRAL RAY BURST & NEURAL CREST (from t = 2.65s) */}
        {(phase === 'burst' || phase === 'reveal' || phase === 'zoom') && (
          <div
            className={`relative w-full h-[360px] sm:h-[460px] flex items-center justify-center transition-all duration-700 ease-in ${
              phase === 'zoom' ? 'scale-[2.8] opacity-0 blur-[3px]' : 'scale-100 opacity-100'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Luminous Core Light Explosion */}
            <div className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-[#c2652a] via-[#f0a878] to-amber-200 blur-3xl opacity-80 animate-ping duration-1000" />

            {/* 21 Streaming 3D Light Rays */}
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
                    animation: `netflixSpectrumRay 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) ${ray.delay} forwards`,
                    transformOrigin: 'center center',
                  }}
                />
              ))}
            </div>

            {/* Center Neural Icon Burst */}
            <div className="relative z-30 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#1f1712]/90 border border-[#f0a878] shadow-[0_0_50px_#f0a878] flex items-center justify-center backdrop-blur-md">
                <span className="material-symbols-outlined text-[#f0a878] text-[40px] animate-pulse">
                  psychology
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CINEMATIC BRAND TITLE REVEAL (from t = 3.45s) */}
        <div
          className={`mt-6 text-center space-y-2 z-30 transition-all duration-700 ${
            phase === 'reveal' || phase === 'zoom'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95'
          }`}
        >
          <h1
            className="font-headline text-4xl sm:text-6xl font-black tracking-[0.38em] uppercase bg-gradient-to-b from-[#ffffff] via-[#f0a878] to-[#c2652a] bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(240,168,120,0.5)]"
            style={{
              textShadow: '0 0 45px rgba(194,101,42,0.65)',
            }}
          >
            STATXAM
          </h1>
          <p className="text-xs sm:text-sm font-mono tracking-[0.32em] uppercase text-[#cec6be]/85">
            20-Year Board Exam Archive • AI Neural Intelligence
          </p>
        </div>
      </div>

      {/* Bottom Production Credits */}
      <div className="absolute bottom-6 inset-x-0 text-center pb-safe z-30 pointer-events-none">
        <p className="text-[10px] font-mono tracking-widest uppercase text-[#73655b]">
          Calibrated to 28 State Education Boards &bull; NEET-UG &bull; JEE
        </p>
      </div>
    </div>
  );
}
