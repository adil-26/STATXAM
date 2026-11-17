'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Question, ReviewStatus } from '@/lib/types';
import { PRE_INGESTED_QUESTIONS } from '@/lib/accuracy-pipeline';
import { getQuestions, updateQuestionStatus } from '@/lib/supabase-service';
import {
  getPaperContributions,
  approvePaperContribution,
  rejectPaperContribution,
  PaperContribution,
} from '@/lib/contributions-service';
import { triggerHaptic } from '@/lib/native-permissions';

export default function AdminReviewPage() {
  const [activeMainTab, setActiveMainTab] = useState<'contributions' | 'questions'>('contributions');

  // Student Paper Contributions State
  const [contributions, setContributions] = useState<PaperContribution[]>([]);
  const [contribFilter, setContribFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Questions Review State
  const [questions, setQuestions] = useState<Question[]>(PRE_INGESTED_QUESTIONS);
  const [questionFilter, setQuestionFilter] = useState<'all' | ReviewStatus>('all');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load contributions & questions
  useEffect(() => {
    setContributions(getPaperContributions());

    const handleContributionsUpdated = () => {
      setContributions(getPaperContributions());
    };
    window.addEventListener('statxam_contributions_updated', handleContributionsUpdated);

    async function loadQuestions() {
      try {
        const fetched = await getQuestions();
        if (fetched && fetched.length > 0) {
          setQuestions(fetched);
        }
      } catch {
        // fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();

    return () => {
      window.removeEventListener('statxam_contributions_updated', handleContributionsUpdated);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Admin approves student contribution
  const handleApproveContribution = (c: PaperContribution) => {
    triggerHaptic('success');
    try {
      const res = approvePaperContribution(c.id);
      setContributions(getPaperContributions());
      showToast(
        `Approved! Awarded +${res.awardedCoins} Coins to ${c.studentName} and published paper to 20-Year Catalog.`
      );
    } catch (err: any) {
      showToast(`Error approving paper: ${err?.message || 'Failed'}`);
    }
  };

  // Admin rejects student contribution
  const handleRejectContribution = (c: PaperContribution) => {
    triggerHaptic('error');
    const reason = prompt('Reason for rejection:', 'File incomplete, illegible scan, or duplicate paper.');
    if (reason !== null) {
      rejectPaperContribution(c.id, reason);
      setContributions(getPaperContributions());
      showToast(`Contribution rejected: ${reason}`);
    }
  };

  // Question status update
  const handleUpdateQuestionStatus = async (id: string, status: ReviewStatus) => {
    triggerHaptic(status === 'accepted' ? 'success' : 'error');
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, reviewStatus: status } : q))
    );
    showToast(`Question #${id} status: ${status.toUpperCase()}`);
    await updateQuestionStatus(id, status);
  };

  const filteredContributions =
    contribFilter === 'all'
      ? contributions
      : contributions.filter((c) => c.status === contribFilter);

  const filteredQuestions =
    questionFilter === 'all'
      ? questions
      : questions.filter((q) => q.reviewStatus === questionFilter);

  const contribCounts = {
    total: contributions.length,
    pending: contributions.filter((c) => c.status === 'pending').length,
    approved: contributions.filter((c) => c.status === 'approved').length,
    rejected: contributions.filter((c) => c.status === 'rejected').length,
  };

  const questionCounts = {
    total: questions.length,
    pending: questions.filter((q) => q.reviewStatus === 'pending').length,
    accepted: questions.filter((q) => q.reviewStatus === 'accepted').length,
    rejected: questions.filter((q) => q.reviewStatus === 'rejected').length,
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-xs text-[#f0a878] hover:underline font-mono"
            >
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Back to Overview</span>
            </Link>
            <span className="text-[#52443c]">•</span>
            <span className="text-xs text-[#a89f97] font-mono">Verification &amp; Bounty Approvals</span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-[#faf5ee] tracking-tight">
            Moderation &amp; Student Bounty Hub
          </h1>
          <p className="text-xs text-[#a89f97] mt-0.5">
            Approve student-uploaded past papers to award coins and publish to the 20-year directory, or moderate question bank items.
          </p>
        </div>

        {/* Main Section Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#241e1b] border border-[#3e342e] rounded-xl self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveMainTab('contributions');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeMainTab === 'contributions'
                ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                : 'text-[#a89f97] hover:text-[#faf5ee]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">toll</span>
            <span>Student Paper Bounties ({contribCounts.pending} pending)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveMainTab('questions');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              activeMainTab === 'questions'
                ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                : 'text-[#a89f97] hover:text-[#faf5ee]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">quiz</span>
            <span>Question Moderation ({questionCounts.pending})</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* SECTION 1: STUDENT PAPER CONTRIBUTIONS & BOUNTY APPROVALS */}
      {activeMainTab === 'contributions' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#241e1b] border border-[#3e342e] rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-[#a89f97] font-mono uppercase">Total Submissions</span>
              <span className="font-headline text-2xl font-bold text-[#faf5ee] mt-1">{contribCounts.total}</span>
              <span className="text-[11px] text-[#78706a] font-mono mt-1">Student contributions</span>
            </div>
            <div className="bg-[#241e1b] border border-amber-500/40 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-amber-400 font-mono uppercase">Awaiting Approval</span>
              <span className="font-headline text-2xl font-bold text-amber-400 mt-1">{contribCounts.pending}</span>
              <span className="text-[11px] text-amber-400/80 font-mono mt-1">+150 coins per approval</span>
            </div>
            <div className="bg-[#241e1b] border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-emerald-400 font-mono uppercase">Approved &amp; Rewarded</span>
              <span className="font-headline text-2xl font-bold text-emerald-300 mt-1">{contribCounts.approved}</span>
              <span className="text-[11px] text-emerald-400/80 font-mono mt-1">Added to 20-yr vault</span>
            </div>
            <div className="bg-[#241e1b] border border-red-500/30 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-red-400 font-mono uppercase">Rejected</span>
              <span className="font-headline text-2xl font-bold text-red-400 mt-1">{contribCounts.rejected}</span>
              <span className="text-[11px] text-red-400/80 font-mono mt-1">Incomplete / duplicate</span>
            </div>
          </div>

          {/* Filter Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#241e1b] border border-[#3e342e] rounded-xl max-w-md">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  triggerHaptic('light');
                  setContribFilter(tab);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold capitalize transition-all ${
                  contribFilter === tab
                    ? 'bg-[#c2652a] text-[#faf5ee] shadow-xs'
                    : 'text-[#a89f97] hover:text-[#faf5ee] hover:bg-[#2e2622]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Contributions List */}
          <div className="space-y-4">
            {filteredContributions.length === 0 ? (
              <div className="bg-[#241e1b] border border-[#3e342e] rounded-2xl p-12 text-center text-xs text-[#a89f97] space-y-2">
                <span className="material-symbols-outlined text-[32px] text-[#78706a]">inbox</span>
                <p>No student contributions found matching this filter.</p>
              </div>
            ) : (
              filteredContributions.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#241e1b] border border-[#3e342e] rounded-2xl p-5 shadow-xs space-y-4 hover:border-[#52443c] transition-colors"
                >
                  {/* Top Row: Student Info & Bounty Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[#342b26] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1c1815] border border-[#3e342e] flex items-center justify-center text-[#f0a878] font-bold text-xs font-mono">
                        {c.studentName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#faf5ee]">{c.studentName}</span>
                          <span className="text-[11px] font-mono text-[#a89f97]">{c.studentMobile}</span>
                        </div>
                        <span className="text-[10px] text-[#78706a] font-mono">
                          Submitted {new Date(c.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-xs font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">toll</span>
                        <span>{c.rewardCoins} Coins Bounty</span>
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          c.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : c.status === 'rejected'
                            ? 'bg-red-950 text-red-300 border border-red-500/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Paper Meta Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-[#1c1815] border border-[#342b26]">
                      <span className="text-[#8a8078] text-[10px] uppercase">Board &amp; State</span>
                      <p className="font-bold text-[#faf5ee] truncate">{c.boardName} ({c.state})</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1c1815] border border-[#342b26]">
                      <span className="text-[#8a8078] text-[10px] uppercase">Class &amp; Year</span>
                      <p className="font-bold text-[#faf5ee]">{c.classLevel} • {c.year}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1c1815] border border-[#342b26]">
                      <span className="text-[#8a8078] text-[10px] uppercase">Subject &amp; Set</span>
                      <p className="font-bold text-[#faf5ee] truncate">{c.subject} ({c.paperSet || 'Set A'})</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#1c1815] border border-[#342b26]">
                      <span className="text-[#8a8078] text-[10px] uppercase">Attached File</span>
                      <p className="font-bold text-[#86efac] truncate">
                        {c.fileName ? c.fileName : c.paperFileUrl}
                      </p>
                    </div>
                  </div>

                  {/* Student Notes if any */}
                  {c.studentNotes && (
                    <div className="p-3 rounded-xl bg-[#1c1815] border border-[#342b26] text-xs text-[#cec6be] space-y-1">
                      <span className="text-[10px] font-mono text-[#f0a878] uppercase">Student Note:</span>
                      <p className="italic">{c.studentNotes}</p>
                    </div>
                  )}

                  {/* Rejection reason if any */}
                  {c.rejectionReason && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200">
                      <span className="font-bold">Rejection Note: </span>
                      <span>{c.rejectionReason}</span>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#342b26]">
                    <div className="flex items-center gap-2">
                      {c.paperFileUrl && (
                        <a
                          href={c.paperFileUrl.startsWith('http') ? c.paperFileUrl : '#'}
                          onClick={(e) => {
                            if (!c.paperFileUrl.startsWith('http')) {
                              e.preventDefault();
                              alert(`Local attachment stream: ${c.fileName || c.paperFileUrl}`);
                            }
                          }}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#1c1815] hover:bg-[#2e2622] text-[#cec6be] hover:text-[#faf5ee] text-xs font-mono border border-[#3e342e] flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px]">description</span>
                          <span>Preview Submitted Paper</span>
                        </a>
                      )}

                      <Link
                        href={`/admin/ingest?board=${c.boardId}&year=${c.year}&subject=${encodeURIComponent(
                          c.subject
                        )}`}
                        className="px-3 py-1.5 rounded-lg bg-[#2e2622] hover:bg-[#382f2a] text-[#f0a878] text-xs font-mono flex items-center gap-1.5 border border-[#3e342e] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                        <span>Open in OCR Studio</span>
                      </Link>
                    </div>

                    {c.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRejectContribution(c)}
                          className="px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-mono font-bold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveContribution(c)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Approve &amp; Award 150 Coins</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: QUESTION BANK MODERATION */}
      {activeMainTab === 'questions' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#241e1b] border border-[#3e342e] rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-[#a89f97] font-mono uppercase">Total Ingested</span>
              <span className="font-headline text-2xl font-bold text-[#faf5ee] mt-1">{questionCounts.total}</span>
              <span className="text-[11px] text-[#78706a] font-mono mt-1">In question bank</span>
            </div>
            <div className="bg-[#241e1b] border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-amber-400 font-mono uppercase">Pending Review</span>
              <span className="font-headline text-2xl font-bold text-amber-400 mt-1">{questionCounts.pending}</span>
              <span className="text-[11px] text-amber-400/80 font-mono mt-1">Awaiting validation</span>
            </div>
            <div className="bg-[#241e1b] border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-emerald-400 font-mono uppercase">Accepted &amp; Active</span>
              <span className="font-headline text-2xl font-bold text-emerald-300 mt-1">{questionCounts.accepted}</span>
              <span className="text-[11px] text-[#78706a] font-mono mt-1">Live in student vault</span>
            </div>
            <div className="bg-[#241e1b] border border-red-500/30 rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <span className="text-xs text-red-400 font-mono uppercase">Rejected / Flagged</span>
              <span className="font-headline text-2xl font-bold text-red-400 mt-1">{questionCounts.rejected}</span>
              <span className="text-[11px] text-red-400/80 font-mono mt-1">Hidden from students</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#241e1b] border border-[#3e342e] rounded-xl max-w-md">
            {(['all', 'pending', 'accepted', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  triggerHaptic('light');
                  setQuestionFilter(tab);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold capitalize transition-all ${
                  questionFilter === tab
                    ? 'bg-[#c2652a] text-[#faf5ee] shadow-xs'
                    : 'text-[#a89f97] hover:text-[#faf5ee] hover:bg-[#2e2622]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="bg-[#241e1b] border border-[#3e342e] rounded-2xl p-12 text-center text-xs text-[#a89f97]">
                No questions found for the current review filter.
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-[#241e1b] border border-[#3e342e] rounded-2xl p-5 shadow-xs space-y-4 hover:border-[#52443c] transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#f0a878] font-bold text-xs">#{q.id}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1c1815] text-[#cec6be] font-mono text-[11px] border border-[#3e342e]">
                        {q.examCode}
                      </span>
                      <span className="text-[#a89f97]">• {q.topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
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

                  <div className="text-xs sm:text-sm text-[#faf5ee] leading-relaxed">
                    {q.stem}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                          opt.id === q.correctOption
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                            : 'bg-[#1c1815] border-[#3e342e] text-[#cec6be]'
                        }`}
                      >
                        <span>{opt.id}.</span>
                        <span className="truncate">{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Solution */}
                  {q.solution && (
                    <div className="text-xs text-[#a89f97] bg-[#1c1815] p-3 rounded-xl border border-[#342b26] leading-relaxed">
                      <span className="text-[#f0a878] font-mono font-bold">Marking Rubric: </span>
                      {q.solution}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#342b26]">
                    <span className="text-[11px] text-[#78706a] font-mono">
                      Weight: {q.marks} Marks • {q.difficulty}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestionStatus(q.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-500/30 text-xs font-mono"
                      >
                        Flag / Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestionStatus(q.id, 'accepted')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 text-xs font-mono font-bold"
                      >
                        Accept &amp; Publish
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
