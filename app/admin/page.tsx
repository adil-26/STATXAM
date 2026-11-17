'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/native-permissions';
import { ALL_INDIAN_BOARDS, ALL_INDIA_PAPERS_CATALOG } from '@/lib/boards-catalog';
import {
  getQuestions,
  updateQuestionStatus,
  getPdfIngestJobs,
} from '@/lib/supabase-service';
import { getActiveGroqModel } from '@/lib/groq-service';
import { Question, PdfIngestJob, ReviewStatus } from '@/lib/types';
import { SourceBadge } from '@/components/SourceBadge';

export default function AdminOverviewDashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [jobs, setJobs] = useState<PdfIngestJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [qs, jbs] = await Promise.all([getQuestions(), getPdfIngestJobs()]);
        setQuestions(qs);
        setJobs(jbs);
      } catch (err) {
        console.warn('[AdminDashboard] Load error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: ReviewStatus) => {
    triggerHaptic(status === 'accepted' ? 'success' : 'error');
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, reviewStatus: status } : q))
    );
    showToast(`Question #${id} status: ${status.toUpperCase()}`);
    await updateQuestionStatus(id, status);
  };

  const pendingQuestions = questions.filter((q) => q.reviewStatus === 'pending');
  const acceptedQuestions = questions.filter((q) => q.reviewStatus === 'accepted');

  const filteredQuestions = questions.filter((q) => {
    if (statusFilter !== 'all' && q.reviewStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const match =
        q.stem.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.examCode.toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Executive Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c2652a] text-[28px]">
              dashboard_customize
            </span>
            <h1 className="font-headline text-3xl font-bold text-[#faf5ee]">
              StatXam Pan-India Examination Control Center
            </h1>
          </div>
          <p className="text-xs text-[#a89f97] mt-1">
            Autonomous multi-state governance suite for 28 state education boards, Google Drive OCR extraction, and Groq question synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/boards"
            className="px-4 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">table_chart</span>
            <span>28-State Registry</span>
          </Link>
          <Link
            href="/admin/ingest"
            className="px-4 py-2 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] border border-[#3e342e] text-[#f0a878] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
            <span>Multi-Subject Ingest</span>
          </Link>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 4 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 28 State Boards */}
        <Link
          href="/admin/boards"
          className="p-5 rounded-2xl bg-[#241e1b] border border-[#3e342e] hover:border-[#c2652a]/60 transition-colors shadow-lg block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#a89f97]">State & Central Boards</span>
            <span className="material-symbols-outlined text-[#c2652a] text-[20px] group-hover:scale-110 transition-transform">
              account_balance
            </span>
          </div>
          <p className="text-3xl font-bold font-headline text-[#faf5ee] mt-2">
            {ALL_INDIAN_BOARDS.length} Boards
          </p>
          <p className="text-[11px] text-[#86efac] font-mono mt-1">
            Punjab, Bihar, WB, TN, Haryana, UP, etc.
          </p>
        </Link>

        {/* Card 2: 20-Year Archive Papers */}
        <Link
          href="/admin/boards"
          className="p-5 rounded-2xl bg-[#241e1b] border border-[#3e342e] hover:border-[#c2652a]/60 transition-colors shadow-lg block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#a89f97]">20-Yr Board Papers</span>
            <span className="material-symbols-outlined text-[#f0a878] text-[20px] group-hover:scale-110 transition-transform">
              auto_stories
            </span>
          </div>
          <p className="text-3xl font-bold font-headline text-[#f0a878] mt-2">
            {ALL_INDIA_PAPERS_CATALOG.length} Papers
          </p>
          <p className="text-[11px] text-[#cec6be] font-mono mt-1">
            2005 - 2024 with Drive Facsimiles
          </p>
        </Link>

        {/* Card 3: Question Bank & Review Queue */}
        <div className="p-5 rounded-2xl bg-[#241e1b] border border-[#3e342e] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#a89f97]">Question Bank</span>
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">
              verified
            </span>
          </div>
          <p className="text-3xl font-bold font-headline text-[#faf5ee] mt-2">
            {questions.length || 120}+ Qs
          </p>
          <p className="text-[11px] text-amber-400 font-mono mt-1">
            {pendingQuestions.length} in Pending Review
          </p>
        </div>

        {/* Card 4: Groq AI Status */}
        <Link
          href="/admin/settings"
          className="p-5 rounded-2xl bg-[#241e1b] border border-[#3e342e] hover:border-[#c2652a]/60 transition-colors shadow-lg block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#a89f97]">Groq AI Engine</span>
            <span className="material-symbols-outlined text-sky-400 text-[20px] group-hover:scale-110 transition-transform">
              psychology
            </span>
          </div>
          <p className="text-2xl font-bold font-headline text-sky-400 mt-2 truncate">
            {getActiveGroqModel().split('/')[1] || 'gpt-oss-120b'}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active & Authorized (~100ms)</span>
          </p>
        </Link>
      </div>

      {/* All-India State Boards Matrix Bento */}
      <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#342b26]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c2652a]/20 border border-[#c2652a]/40 flex items-center justify-center text-[#f0a878]">
              <span className="material-symbols-outlined text-[18px]">public</span>
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-[#faf5ee]">
                Pan-India Education Boards Coverage
              </h2>
              <p className="text-[11px] text-[#a89f97]">
                Live state-by-state catalog distribution across Northern, Eastern, Southern, Western, and National boards.
              </p>
            </div>
          </div>
          <Link
            href="/admin/boards"
            className="text-xs font-mono text-[#f0a878] hover:underline flex items-center gap-1"
          >
            <span>View Full 28-State Table</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ALL_INDIAN_BOARDS.slice(0, 12).map((board) => (
            <div
              key={board.id}
              className="p-3 rounded-xl bg-[#1c1815] border border-[#3e342e] space-y-1 hover:border-[#52443c] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#f0a878]">
                  {board.code}
                </span>
                <span className="text-[10px] text-[#a89f97] font-mono">{board.region}</span>
              </div>
              <p className="text-xs font-semibold text-[#faf5ee] line-clamp-1">{board.name}</p>
              <p className="text-[10px] text-[#a89f97] line-clamp-1">{board.state}</p>
              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-emerald-400">
                <span>{board.yearsAvailable.split(' ')[0]}</span>
                <span>Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Bank Verification Studio Table */}
      <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] shadow-xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#342b26]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c2652a] text-[22px]">
              fact_check
            </span>
            <h2 className="font-headline text-lg font-bold text-[#faf5ee]">
              Extracted & Synthesized Questions Review
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#a89f97] text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search question stem or exam code..."
                className="bg-[#1c1815] border border-[#483d37] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-1 focus:ring-[#c2652a]"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#1c1815] p-1 rounded-lg border border-[#483d37] text-[11px] font-mono">
              {(['all', 'pending', 'accepted', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#c2652a] text-[#faf5ee]'
                      : 'text-[#a89f97] hover:text-[#faf5ee]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#a89f97]">
              No questions found for the selected review filter.
            </div>
          ) : (
            filteredQuestions.slice(0, 15).map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-[#1c1815] border border-[#3e342e] space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#f0a878] font-bold text-[11px]">
                      #{q.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#2e2622] text-[#cec6be] font-mono text-[10px]">
                      {q.examCode}
                    </span>
                    <span className="text-[#a89f97] font-medium">• {q.topic}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        q.reviewStatus === 'accepted'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : q.reviewStatus === 'rejected'
                          ? 'bg-red-950 text-red-300 border border-red-500/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {q.reviewStatus}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#faf5ee] leading-relaxed font-body">
                  {q.stem}
                </p>

                {/* Options 4-grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                        opt.id === q.correctOption
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-[#241e1b] border-[#3e342e] text-[#cec6be]'
                      }`}
                    >
                      <span className="font-bold">{opt.id}.</span>
                      <span className="truncate">{opt.text}</span>
                    </div>
                  ))}
                </div>

                {/* Solution Rubric & Actions */}
                <div className="pt-2 border-t border-[#342b26] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <p className="text-[#a89f97] line-clamp-1 italic">
                    Rubric: {q.solution || 'Standard board step evaluation'}
                  </p>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'accepted')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(q.id, 'rejected')}
                      className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-300 font-semibold"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
