'use client';

import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/native-permissions';
import { TestArenaModal } from '@/components/TestArenaModal';
import { PdfViewerModal } from '@/components/PdfViewerModal';
import { ContributePaperModal } from '@/components/ContributePaperModal';
import {
  ALL_INDIAN_BOARDS,
  ALL_INDIA_PAPERS_CATALOG,
  AllIndiaPaperEntry,
} from '@/lib/boards-catalog';
import { SEED_CHAPTERS } from '@/lib/supabase-service';

export default function AllIndiaPracticeCatalogPage() {
  const [papers, setPapers] = useState<AllIndiaPaperEntry[]>(ALL_INDIA_PAPERS_CATALOG);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFormat, setViewFormat] = useState<'tabular' | 'grid' | 'chapters'>('tabular');

  // Load merged official and admin-approved custom papers
  useEffect(() => {
    const loadMergedPapers = () => {
      try {
        const customRaw = localStorage.getItem('statxam_custom_board_papers');
        if (customRaw) {
          const customPapers = JSON.parse(customRaw) as AllIndiaPaperEntry[];
          const existingIds = new Set(ALL_INDIA_PAPERS_CATALOG.map((p) => p.id));
          const filteredCustom = customPapers.filter((p) => !existingIds.has(p.id));
          setPapers([...filteredCustom, ...ALL_INDIA_PAPERS_CATALOG]);
          return;
        }
      } catch (e) {
        console.warn('Failed to load custom papers', e);
      }
      setPapers(ALL_INDIA_PAPERS_CATALOG);
    };

    loadMergedPapers();
    window.addEventListener('statxam_custom_papers_updated', loadMergedPapers);
    return () => {
      window.removeEventListener('statxam_custom_papers_updated', loadMergedPapers);
    };
  }, []);

  // Modals
  const [cbtModalPaper, setCbtModalPaper] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [pdfModalData, setPdfModalData] = useState<{
    title: string;
    driveUrl?: string;
    rubricUrl?: string;
  } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const regions = ['All', 'National', 'North', 'East', 'South', 'West', 'Competitive'];

  // Filter papers
  const filteredPapers = papers.filter((p) => {
    if (selectedRegion !== 'All' && p.region !== selectedRegion) return false;
    if (selectedBoardId !== 'all' && p.boardId !== selectedBoardId) return false;
    if (selectedClass !== 'all' && p.classLevel !== selectedClass) return false;
    if (selectedYear !== 'all' && p.year.toString() !== selectedYear) return false;
    if (selectedSubject !== 'all' && !p.subject.toLowerCase().includes(selectedSubject.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.boardName.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.mediumLanguage.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6">
      {/* Title & Pan-India Scope Banner */}
      <section className="flex flex-col space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold font-label text-primary">
                All-India 20-Year Archive Vault
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs text-on-surface-variant font-mono">
                28 State Boards & Central Councils
              </span>
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight text-on-surface leading-tight">
              Solved Board Papers Directory (2005 – 2024)
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl mt-0.5">
              Access authentic scanned question paper PDFs from Google Drive, official marking schemes, and simulated CBT practice drills.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Upload & Earn Coins Bounty Button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                setShowContributeModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-label font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400">monetization_on</span>
              <span>Upload Missing Paper (+150 Coins)</span>
            </button>

            {/* View Format Switcher (Tabular vs Grid vs Chapters) */}
            <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl border border-outline-variant/60 shadow-xs">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('tabular');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1.5 transition-all ${viewFormat === 'tabular'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>Tabular Form</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('grid');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1.5 transition-all ${viewFormat === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span>Cards View</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('chapters');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1.5 transition-all ${viewFormat === 'chapters'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span>Chapter Units</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Region Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-[11px] font-semibold text-on-surface-variant font-label uppercase mr-1">
          Zone:
        </span>
        {regions.map((reg) => (
          <button
            key={reg}
            onClick={() => {
              triggerHaptic('light');
              setSelectedRegion(reg);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${selectedRegion === reg
              ? 'bg-primary text-on-primary shadow-xs font-bold'
              : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/50'
              }`}
          >
            {reg === 'All' ? 'All-India Boards' : `${reg} Zone`}
          </button>
        ))}
      </div>

      {/* Advanced Filter Matrix Bar */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Bihar, Tamil Nadu, Bengal, Punjab, Maths..."
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            />
          </div>

          {/* Board Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            >
              <option value="all">All Boards ({ALL_INDIAN_BOARDS.length})</option>
              {ALL_INDIAN_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.state})
                </option>
              ))}
            </select>
          </div>

          {/* Class Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            >
              <option value="all">All Classes</option>
              <option value="Class 10">Class 10 (Matric)</option>
              <option value="Class 12">Class 12 (Higher Sec)</option>
            </select>
          </div>

          {/* Year Range Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
            >
              <option value="all">All 20 Years (2005 - 2024)</option>
              <option value="2024">2024 (Latest Annual)</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2020">2020</option>
              <option value="2018">2018</option>
              <option value="2015">2015 (10-Yr Mark)</option>
              <option value="2008">2008</option>
              <option value="2005">2005 (20-Yr Origin)</option>
            </select>
          </div>
        </div>

        {/* Secondary Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
          <span className="text-[11px] text-on-surface-variant font-label font-semibold mr-1">
            Subject:
          </span>
          {['all', 'mathematics', 'science', 'social', 'english', 'hindi', 'punjabi', 'tamil', 'bengali'].map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${selectedSubject === sub
                ? 'bg-primary-fixed text-on-primary-fixed-variant font-bold'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
            >
              {sub === 'all' ? 'All Subjects' : sub}
            </button>
          ))}
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-xs font-medium border border-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* VIEW FORMAT 1: ORGANIZED TABULAR DIRECTORY VIEW */}
      {viewFormat === 'tabular' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/60 font-label uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">State Board</th>
                  <th className="py-3.5 px-3 font-bold">Year</th>
                  <th className="py-3.5 px-3 font-bold">Class</th>
                  <th className="py-3.5 px-4 font-bold">Subject & Title</th>
                  <th className="py-3.5 px-3 font-bold">Medium</th>
                  <th className="py-3.5 px-3 font-bold">Set</th>
                  <th className="py-3.5 px-3 text-center font-bold">Drive PDF</th>
                  <th className="py-3.5 px-3 text-center font-bold">Rubrics</th>
                  <th className="py-3.5 px-4 text-right font-bold">CBT Arena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                {filteredPapers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-on-surface-variant">
                      No board papers found matching your query. Try resetting filters.
                    </td>
                  </tr>
                ) : (
                  filteredPapers.map((paper) => (
                    <tr
                      key={paper.id}
                      className="hover:bg-surface-container-low/60 transition-colors group"
                    >
                      {/* State Board */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {paper.boardCode.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface group-hover:text-primary transition-colors">
                              {paper.boardName}
                            </p>
                            <p className="text-[10px] text-on-surface-variant font-label">
                              {paper.state} • {paper.boardCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-mono text-[11px] font-bold">
                          {paper.year}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-3 font-medium text-on-surface-variant">
                        {paper.classLevel}
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-on-surface">{paper.subject}</p>
                        <p className="text-[10px] text-on-surface-variant line-clamp-1">
                          {paper.title}
                        </p>
                      </td>

                      {/* Medium */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-semibold">
                          {paper.mediumLanguage}
                        </span>
                      </td>

                      {/* Paper Set */}
                      <td className="py-3.5 px-3 font-mono text-[11px] text-secondary">
                        {paper.paperSet}
                      </td>

                      {/* Drive Original PDF */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setPdfModalData({
                              title: paper.title,
                              driveUrl: paper.drivePdfUrl,
                              rubricUrl: paper.driveRubricUrl,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 text-primary text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Open PDF Document"
                        >
                          <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                          <span>PDF</span>
                        </button>
                      </td>

                      {/* Official Marking Rubric */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setPdfModalData({
                              title: `${paper.title} — Official Marking Scheme`,
                              driveUrl: paper.driveRubricUrl,
                              rubricUrl: paper.drivePdfUrl,
                            });
                          }}
                          className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1"
                          title="View Verified Step Rubric"
                        >
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          <span>Key</span>
                        </button>
                      </td>

                      {/* CBT Interactive Simulator */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            setCbtModalPaper(paper.title);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-[11px] font-label font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                          <span>Solve CBT</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-surface-container-low border-t border-outline-variant/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-on-surface-variant font-label">
            <span>Showing {filteredPapers.length} of {papers.length} verified past board papers</span>
            <span>All papers feature original Drive PDF scans & step-by-step rubrics</span>
          </div>
        </div>
      )}

      {/* VIEW FORMAT 2: CARDS GRID VIEW */}
      {viewFormat === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <div
              key={paper.id}
              className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3 hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-bold text-[10px] font-mono">
                    {paper.boardCode} • {paper.year}
                  </span>
                  <span className="text-on-surface-variant text-[11px]">
                    {paper.classLevel}
                  </span>
                </div>

                <h3 className="font-headline text-lg font-bold text-on-surface leading-snug">
                  {paper.title}
                </h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">
                  {paper.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                    {paper.mediumLanguage}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                    {paper.paperSet}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setPdfModalData({
                      title: paper.title,
                      driveUrl: paper.drivePdfUrl,
                      rubricUrl: paper.driveRubricUrl,
                    });
                  }}
                  className="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-xs font-bold text-on-surface flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>View PDF</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setCbtModalPaper(paper.title);
                  }}
                  className="flex-1 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                  <span>Solve CBT</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW FORMAT 3: 14 CHAPTER UNITS BREAKDOWN */}
      {viewFormat === 'chapters' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/50 flex items-center justify-between">
            <div>
              <h3 className="font-headline text-base font-bold text-on-surface">
                Chapter-Wise Question Bank Units
              </h3>
              <p className="text-xs text-on-surface-variant">
                Curated syllabus units calibrated to past 20-year board question frequencies.
              </p>
            </div>
            <span className="text-xs font-bold text-primary font-mono">
              14 Core Units
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SEED_CHAPTERS.map((ch) => (
              <div
                key={ch.id}
                className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-primary font-bold">
                      Unit {ch.unitNumber}
                    </span>
                    <span className="text-on-surface-variant">• {ch.weightageMarks} Marks Weightage</span>
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-on-surface">
                    {ch.nameEn}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">
                    {ch.namePa} • {ch.nameHi}
                  </p>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setCbtModalPaper(`Unit ${ch.unitNumber}: ${ch.nameEn} Drill`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Drill</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-App PDF Viewer Modal */}
      {pdfModalData && (
        <PdfViewerModal
          isOpen={true}
          title={pdfModalData.title}
          driveUrl={pdfModalData.driveUrl}
          rubricUrl={pdfModalData.rubricUrl}
          onClose={() => setPdfModalData(null)}
          onSolveCbt={() => {
            const title = pdfModalData.title;
            setPdfModalData(null);
            setCbtModalPaper(title);
          }}
        />
      )}

      {/* CBT Test Simulator Modal */}
      {cbtModalPaper && (
        <TestArenaModal
          isOpen={true}
          paperTitle={cbtModalPaper}
          onClose={() => setCbtModalPaper(null)}
        />
      )}

      {/* Student Contribute Missing Paper Modal */}
      {showContributeModal && (
        <ContributePaperModal
          isOpen={true}
          onClose={() => setShowContributeModal(false)}
          onOpenExistingPaperCbt={(title) => setCbtModalPaper(title)}
        />
      )}
    </div>
  );
}
