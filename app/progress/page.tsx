'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { shareScorecard, triggerHaptic } from '@/lib/native-permissions';
import { useAuth } from '@/lib/auth-context';
import { getSubmissions } from '@/lib/supabase-service';
import { GradedScorecard } from '@/lib/types';

export default function ProgressPage() {
  const { user } = useAuth();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<GradedScorecard[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const history = await getSubmissions(user?.id || 'scholar-gurpreet-01');
        setSubmissions(history);
      } catch {
        // fallback to empty or default
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchHistory();
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleShare = async (title: string, score: string, accuracy: string) => {
    triggerHaptic('medium');
    const success = await shareScorecard(
      title,
      `StatXam Scorecard: Scored ${score} with ${accuracy} accuracy on ${title}! #StatXam #ExamPrep`,
      'https://statxamp.vercel.app'
    );
    if (success) {
      showToast('Scorecard shared successfully');
    } else {
      showToast('Scorecard summary copied to clipboard');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-label bg-primary-fixed text-on-primary-fixed-variant border border-primary/20">
              Live Telemetry
            </span>
            <span className="text-xs text-on-surface-variant font-label">Updated after every test</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Performance &amp; Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 font-body">
            Real-time accuracy metrics, topic mastery index, and verified mock test history.
          </p>
        </div>

        {/* Telegram 2FA Quick Badge */}
        <div className="flex items-center gap-2.5 bg-surface-container-low border border-outline-variant/60 rounded-xl px-3.5 py-2 self-start sm:self-auto shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px]">send</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-on-surface font-label">Telegram 2FA Protected</span>
            <span className="text-[11px] text-primary font-medium font-label">Instant OTP Recovery Active</span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Metrics + Topic Diagnostics */}
        <div className="lg:col-span-7 space-y-6">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Solved */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-label font-semibold">Total Solved</span>
                <span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>
              </div>
              <div className="my-2">
                <span className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  {user?.questionsSolved || 1280}
                </span>
              </div>
              <div className="flex items-center gap-1 text-primary text-xs font-label font-semibold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+42 today</span>
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-label font-semibold">Accuracy</span>
                <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
              </div>
              <div className="my-2">
                <span className="font-headline text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {user?.accuracy || 89.4}%
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-label">Top 8th percentile</span>
            </div>

            {/* Board Papers Accuracy */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-label font-semibold">Rank Estimate</span>
                <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
              </div>
              <div className="my-2">
                <span className="font-headline text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  #{user?.estimatedRank || 142}
                </span>
              </div>
              <span className="text-[11px] text-primary font-label font-medium">State Merit Tier</span>
            </div>

            {/* Study Streak */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-xs font-label font-semibold">Daily Streak</span>
                <span className="material-symbols-outlined text-[18px] text-primary">local_fire_department</span>
              </div>
              <div className="my-2">
                <span className="font-headline text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {user?.streakDays || 7} <span className="text-xs text-on-surface-variant font-normal">days</span>
                </span>
              </div>
              <span className="text-[11px] text-primary font-label font-medium">Keep it going!</span>
            </div>
          </div>

          {/* Topic Diagnostics & Radar Section */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">radar</span>
                  <h2 className="font-headline text-xl font-bold text-on-surface">Subject &amp; Topic Mastery</h2>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 font-body">
                  Calculated from your verified graded questions
                </p>
              </div>
              <span className="text-xs font-label font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/50">
                Adaptive Mastery Index
              </span>
            </div>

            {/* Radar Visualizer + Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="w-48 h-48 transform -rotate-90 overflow-visible" viewBox="0 0 200 200">
                    <circle className="stroke-outline-variant/50" cx="100" cy="100" fill="none" r="90" strokeDasharray="4 4" strokeWidth="1" />
                    <circle className="stroke-outline-variant/50" cx="100" cy="100" fill="none" r="60" strokeWidth="1" />
                    <circle className="stroke-outline-variant/50" cx="100" cy="100" fill="none" r="30" strokeDasharray="2 2" strokeWidth="1" />
                    <line className="stroke-outline-variant/50" strokeWidth="1" x1="10" x2="190" y1="100" y2="100" />
                    <line className="stroke-outline-variant/50" strokeWidth="1" x1="100" x2="100" y1="10" y2="190" />

                    {/* Proficiency Polygon */}
                    <polygon
                      className="stroke-primary fill-primary/15"
                      points="100,17.2 172.9,100 100,161.2 51.4,100"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <circle className="fill-primary" cx="100" cy="17.2" r="4" />
                    <circle className="fill-primary-container" cx="172.9" cy="100" r="4" />
                    <circle className="fill-secondary" cx="100" cy="161.2" r="4" />
                    <circle className="fill-tertiary" cx="51.4" cy="100" r="4" />
                  </svg>
                  <div className="absolute flex flex-col items-center pointer-events-none">
                    <span className="font-headline text-3xl font-bold text-on-surface">89.4</span>
                    <span className="text-[10px] text-on-surface-variant font-label uppercase font-bold">
                      Mastery Score
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="sm:col-span-7 space-y-3">
                <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/50 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-1 font-label">
                    <span className="font-semibold text-on-surface">Triangles &amp; Geometry Theorems</span>
                    <span className="font-bold text-primary">92%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '92%' }} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 block font-label">
                    Mastered • 140 questions answered
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/50 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-1 font-label">
                    <span className="font-semibold text-on-surface">Algebra &amp; Quadratic Equations</span>
                    <span className="font-bold text-primary">81%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-container h-full rounded-full" style={{ width: '81%' }} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 block font-label">
                    Proficient • 120 questions answered
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/50 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-1 font-label">
                    <span className="font-semibold text-on-surface">Coordinate Geometry</span>
                    <span className="font-bold text-secondary">68%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: '68%' }} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 block font-label">
                    Needs Practice • 95 questions answered
                  </span>
                </div>
              </div>
            </div>

            {/* Weak Spot Callout */}
            <div className="bg-surface-container-lowest border border-error/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-error font-label">Target Area: Rotational Dynamics &amp; Optics</span>
                    <span className="text-[10px] font-bold text-error bg-error-container px-1.5 py-0.2 rounded font-mono">
                      54% Accuracy
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-body">
                    Frequent errors on Prism Angle of Minimum Deviation and Tangent length proofs.
                  </p>
                </div>
              </div>
              <Link
                href="/practice"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold font-label uppercase tracking-wider shadow-xs transition-all active:scale-95 flex-shrink-0"
              >
                <span>Drill 15 Questions</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Graded Mock Tests */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">history_edu</span>
                <h2 className="font-headline text-lg font-bold text-on-surface">Recent Graded Tests</h2>
              </div>
              <span className="text-xs text-on-surface-variant font-label">
                {submissions.length} Submissions
              </span>
            </div>

            {/* Submissions List */}
            {loadingSubmissions ? (
              <div className="p-8 text-center text-xs text-on-surface-variant font-label">
                Loading verified scorecards...
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center text-xs text-on-surface-variant font-label bg-surface-container-lowest rounded-xl border border-outline-variant/40">
                No mock tests taken yet. Launch the CBT Practice Arena to generate your first verified scorecard!
              </div>
            ) : (
              submissions.map((sub, idx) => (
                <div
                  key={`${sub.testId}-${sub.submittedAt}-${idx}`}
                  className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline text-base font-bold text-on-surface">{sub.testTitle}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-primary font-label font-semibold">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>Server Graded • {new Date(sub.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="font-headline text-2xl font-bold text-primary">{sub.score}</span>
                        <span className="text-xs text-on-surface-variant font-label">/ {sub.totalMarks}</span>
                      </div>
                      <span className="text-[11px] text-primary font-bold font-label">
                        {sub.rankEstimate || `${sub.percentile}%ile`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-surface-container-low rounded-lg p-2.5 text-center text-xs font-label">
                    <div>
                      <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Accuracy</span>
                      <span className="font-bold text-on-surface">{sub.accuracy}%</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Time Spent</span>
                      <span className="font-bold text-on-surface">{sub.timeSpentMinutes}m</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant block text-[10px] uppercase font-semibold">Percentile</span>
                      <span className="font-bold text-primary">{sub.percentile}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleShare(
                        sub.testTitle,
                        `${sub.score}/${sub.totalMarks}`,
                        `${sub.accuracy}%`
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider shadow-xs transition-all active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                    <span>Share Scorecard</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-[#3a302a] text-[#faf5ee] shadow-xl flex items-center gap-2 text-xs font-label z-50 animate-fade-in border border-outline-variant/30">
          <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
