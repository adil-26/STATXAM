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
import { useExamMode } from '@/components/ExamModeContext';
import { IeltsDuolingoPath } from '@/components/IeltsDuolingoPath';

export default function AllIndiaPracticeCatalogPage() {
  const { mode } = useExamMode();
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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pdfModalData, setPdfModalData] = useState<{
    title: string;
    driveUrl?: string;
    rubricUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (showFilterModal) {
      document.body.classList.add('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: true } }));
    } else {
      document.body.classList.remove('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
      window.dispatchEvent(new CustomEvent('statxam_modal_state', { detail: { open: false } }));
    };
  }, [showFilterModal]);

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

  const activeFilterCount =
    (selectedRegion !== 'All' ? 1 : 0) +
    (selectedBoardId !== 'all' ? 1 : 0) +
    (selectedClass !== 'all' ? 1 : 0) +
    (selectedYear !== 'all' ? 1 : 0) +
    (selectedSubject !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    triggerHaptic('light');
    setSelectedRegion('All');
    setSelectedBoardId('all');
    setSelectedClass('all');
    setSelectedYear('all');
    setSelectedSubject('all');
    setSearchQuery('');
    showToast('Filters cleared');
  };

  // IELTS Mode Practice & Duolingo Engine
  if (mode === 'ielts') {
    return (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 md:py-6 space-y-6 animate-in fade-in duration-200">
        <section className="flex flex-col space-y-2 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold font-label text-primary">
                  IELTS Academic &amp; General Training
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-on-surface-variant font-mono">
                  Cambridge Assessment • Band 7.5 – 9.0 Drills
                </span>
              </div>
              <h1 className="font-headline text-2xl sm:text-4xl font-bold tracking-tight text-on-surface leading-tight">
                Duolingo-Style IELTS Practice Engine
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl mt-0.5">
                Master True/False/Not Given, Listening decoding, and submit essays to Clara AI for official Band 0–9 rubric evaluation.
              </p>
            </div>
          </div>
        </section>

        <IeltsDuolingoPath />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 md:py-6 space-y-4 sm:space-y-6">
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
            <h1 className="font-headline text-2xl sm:text-4xl font-bold tracking-tight text-on-surface leading-tight">
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
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-label font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-amber-600 dark:text-amber-400">monetization_on</span>
              <span>Upload Missing (+150 Coins)</span>
            </button>

            {/* View Format Switcher (Tabular vs Grid vs Chapters) */}
            <div className="flex items-center gap-1 p-1 bg-surface-container rounded-xl border border-outline-variant/60 shadow-xs">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('tabular');
                }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1 transition-all ${viewFormat === 'tabular'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="Tabular Form"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span className="hidden sm:inline">Tabular</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('grid');
                }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1 transition-all ${viewFormat === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="Cards View"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setViewFormat('chapters');
                }}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-label font-bold flex items-center gap-1 transition-all ${viewFormat === 'chapters'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                title="Chapter Units"
              >
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
                <span className="hidden sm:inline">Chapters</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* COMPACT APP-LIKE SEARCH & FILTER TOOLBAR */}
      <div className="flex items-center gap-2">
        {/* Search Bar with Instant Clear */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search board, subject, state, year (e.g. CBSE, Maths)..."
            className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl pl-9 pr-8 py-2.5 text-xs text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-body shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-on-surface-variant hover:text-on-surface p-0.5"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>

        {/* DEDICATED FILTER BUTTON WITH ACTIVE COUNT BADGE */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setShowFilterModal(true);
          }}
          className={`px-3.5 py-2.5 rounded-xl border font-label font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-xs ${
            activeFilterCount > 0
              ? 'bg-primary text-on-primary border-primary shadow-xs'
              : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/60 text-on-surface'
          }`}
          title="Open Filters Drawer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {activeFilterCount > 0 ? 'filter_alt' : 'tune'}
          </span>
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-white text-primary text-[10px] font-mono font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ACTIVE FILTER CHIPS ROW (One-Tap Dismiss or Quick Selectors) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        {activeFilterCount > 0 ? (
          <>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant shrink-0 font-label">
              Active:
            </span>
            {selectedRegion !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedRegion('All')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold shrink-0 hover:bg-primary/20 transition-colors"
              >
                <span>Zone: {selectedRegion}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
            {selectedBoardId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedBoardId('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold shrink-0 hover:bg-primary/20 transition-colors"
              >
                <span>Board: {ALL_INDIAN_BOARDS.find((b) => b.id === selectedBoardId)?.code || selectedBoardId}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
            {selectedClass !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedClass('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold shrink-0 hover:bg-primary/20 transition-colors"
              >
                <span>{selectedClass}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
            {selectedYear !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedYear('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold shrink-0 hover:bg-primary/20 transition-colors"
              >
                <span>Year: {selectedYear}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
            {selectedSubject !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedSubject('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold shrink-0 hover:bg-primary/20 transition-colors capitalize"
              >
                <span>{selectedSubject}</span>
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-on-surface-variant hover:text-primary underline px-1.5 shrink-0"
            >
              Clear All
            </button>
          </>
        ) : (
          <>
            <span className="text-[10px] uppercase font-bold text-on-surface-variant shrink-0 font-label">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClass(selectedClass === 'Class 10' ? 'all' : 'Class 10')}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-label font-semibold text-on-surface shrink-0 transition-colors"
            >
              Class 10
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass(selectedClass === 'Class 12' ? 'all' : 'Class 12')}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-label font-semibold text-on-surface shrink-0 transition-colors"
            >
              Class 12
            </button>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear === '2024' ? 'all' : '2024')}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-label font-semibold text-on-surface shrink-0 transition-colors"
            >
              2024 Annual
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubject(selectedSubject === 'mathematics' ? 'all' : 'mathematics')}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-label font-semibold text-on-surface shrink-0 transition-colors"
            >
              Mathematics
            </button>
            <button
              type="button"
              onClick={() => setSelectedSubject(selectedSubject === 'science' ? 'all' : 'science')}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-label font-semibold text-on-surface shrink-0 transition-colors"
            >
              Science
            </button>
          </>
        )}
      </div>

      {/* FILTER BOTTOM SHEET / MODAL */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:max-w-xl max-h-[88vh] bg-surface rounded-t-3xl sm:rounded-2xl border border-outline-variant/60 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Top Drag Handle on Mobile */}
            <div className="sm:hidden w-10 h-1 bg-outline-variant/60 rounded-full mx-auto mt-2 mb-1 shrink-0" />

            {/* Sheet Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant/60 flex items-center justify-between shrink-0 bg-surface-container-low">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
                  <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                    Filter Solved Papers
                  </h2>
                </div>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                  {filteredPapers.length} papers match current criteria
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-label font-bold text-primary hover:underline px-2 py-1"
                  >
                    Reset All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Sheet Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* Section 1: Geographic Zone */}
              <div className="space-y-2">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                  1. Zone &amp; Region
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((reg) => (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedRegion(reg);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedRegion === reg
                          ? 'bg-primary text-on-primary font-bold shadow-xs'
                          : 'bg-surface-container border border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {reg === 'All' ? 'All-India Boards' : `${reg} Zone`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Examination Board */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                    2. Examination Board
                  </label>
                  {selectedBoardId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId('all')}
                      className="text-[11px] text-primary font-semibold hover:underline"
                    >
                      Clear Board
                    </button>
                  )}
                </div>
                <select
                  value={selectedBoardId}
                  onChange={(e) => {
                    triggerHaptic('light');
                    setSelectedBoardId(e.target.value);
                  }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/70 rounded-xl px-3 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body"
                >
                  <option value="all">All Boards ({ALL_INDIAN_BOARDS.length})</option>
                  {ALL_INDIAN_BOARDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 3: Class Level */}
              <div className="space-y-2">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                  3. Class Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Classes' },
                    { id: 'Class 10', label: 'Class 10 (Matric)' },
                    { id: 'Class 12', label: 'Class 12 (Higher Sec)' },
                  ].map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedClass(cls.id);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all ${
                        selectedClass === cls.id
                          ? 'bg-primary text-on-primary font-bold shadow-xs'
                          : 'bg-surface-container border border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {cls.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: Examination Year */}
              <div className="space-y-2">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                  4. Exam Year (2005 - 2024)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All 20 Years' },
                    { id: '2024', label: '2024 (Latest)' },
                    { id: '2023', label: '2023' },
                    { id: '2022', label: '2022' },
                    { id: '2020', label: '2020' },
                    { id: '2018', label: '2018' },
                    { id: '2015', label: '2015' },
                    { id: '2008', label: '2008' },
                    { id: '2005', label: '2005 (Origin)' },
                  ].map((yr) => (
                    <button
                      key={yr.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedYear(yr.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedYear === yr.id
                          ? 'bg-primary text-on-primary font-bold shadow-xs'
                          : 'bg-surface-container border border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {yr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 5: Subject */}
              <div className="space-y-2">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                  5. Academic Subject
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'all',
                    'mathematics',
                    'science',
                    'social',
                    'english',
                    'physics',
                    'chemistry',
                    'biology',
                    'hindi',
                    'punjabi',
                  ].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedSubject(sub);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                        selectedSubject === sub
                          ? 'bg-primary text-on-primary font-bold shadow-xs'
                          : 'bg-surface-container border border-outline-variant/50 text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {sub === 'all' ? 'All Subjects' : sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Footer Apply Button */}
            <div className="p-4 border-t border-outline-variant/60 bg-surface-container-low shrink-0 pb-safe">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  setShowFilterModal(false);
                }}
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-label font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Show {filteredPapers.length} Filtered Papers</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
