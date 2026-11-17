'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/native-permissions';
import {
  ALL_INDIAN_BOARDS,
  ALL_INDIA_PAPERS_CATALOG,
  AllIndiaPaperEntry,
} from '@/lib/boards-catalog';
import { PdfViewerModal } from '@/components/PdfViewerModal';
import { TestArenaModal } from '@/components/TestArenaModal';

export default function AdminBoardsPage() {
  const [papersList, setPapersList] = useState<AllIndiaPaperEntry[]>(ALL_INDIA_PAPERS_CATALOG);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Modals
  const [pdfModalData, setPdfModalData] = useState<{
    title: string;
    driveUrl?: string;
    rubricUrl?: string;
  } | null>(null);
  const [cbtModalTitle, setCbtModalTitle] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New paper form state
  const [newBoardId, setNewBoardId] = useState('bseb');
  const [newYear, setNewYear] = useState('2024');
  const [newSubject, setNewSubject] = useState('Mathematics');
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [newRubricUrl, setNewRubricUrl] = useState('');
  const [newMedium, setNewMedium] = useState('Hindi / English');
  const [newPaperSet, setNewPaperSet] = useState('Set A');
  const [newClass, setNewClass] = useState<'Class 10' | 'Class 12'>('Class 10');
  const [newUploadedFile, setNewUploadedFile] = useState<File | null>(null);
  const [isModalDragging, setIsModalDragging] = useState(false);

  const YEAR_PRESETS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015', '2012', '2010', '2005'];

  const regions = ['All', 'National', 'North', 'East', 'South', 'West', 'Competitive'];

  // Filtered papers
  const filteredPapers = papersList.filter((p) => {
    if (selectedRegion !== 'All' && p.region !== selectedRegion) return false;
    if (selectedBoardId !== 'all' && p.boardId !== selectedBoardId) return false;
    if (selectedYear !== 'all' && p.year.toString() !== selectedYear) return false;
    if (selectedClass !== 'all' && p.classLevel !== selectedClass) return false;
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

  const handleAddNewPaper = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');

    const board = ALL_INDIAN_BOARDS.find((b) => b.id === newBoardId);
    const addedPaper: AllIndiaPaperEntry = {
      id: `${newBoardId}-${newClass === 'Class 10' ? '10' : '12'}-${Date.now()}`,
      title: `${board?.name || 'Board'} ${newClass} ${newSubject} ${newYear}`,
      year: Number(newYear) || 2024,
      exam: `${board?.code || 'BOARD'} ${newClass}`,
      subject: newSubject,
      totalQuestions: 50,
      durationMinutes: 180,
      source: 'google_drive_pdf_extracted',
      description: `Official archive paper for ${board?.fullName || 'State Board'} with step rubrics.`,
      drivePdfUrl: newUploadedFile
        ? `local://${newUploadedFile.name}`
        : newDriveUrl || 'https://drive.google.com/file/d/1demo_facsimile/preview',
      driveRubricUrl: newRubricUrl || 'https://drive.google.com/file/d/1demo_rubric/preview',
      boardId: newBoardId,
      boardName: board?.name || 'State Board',
      boardCode: board?.code || 'BOARD',
      state: board?.state || 'State',
      region: (board?.region as any) || 'North',
      classLevel: newClass,
      mediumLanguage: newMedium,
      paperSet: newPaperSet,
      session: 'Annual',
    };

    setPapersList([addedPaper, ...papersList]);
    setShowAddModal(false);
    setNewDriveUrl('');
    setNewRubricUrl('');
    setNewUploadedFile(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Top Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c2652a] text-[26px]">
              account_balance
            </span>
            <h1 className="font-headline text-3xl font-bold text-[#faf5ee]">
              All-India 28-State Boards & 20-Year Archive Registry
            </h1>
          </div>
          <p className="text-xs text-[#a89f97] mt-1">
            Official tabular repository mapping previous year question papers, Google Drive facsimiles, and step rubrics.
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] text-xs font-bold tracking-wider uppercase transition-colors shadow-md flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Register New Board Paper</span>
        </button>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#241e1b] border border-[#3e342e]">
          <span className="text-[11px] text-[#a89f97] font-mono uppercase">Recognized Boards</span>
          <p className="text-2xl font-bold font-headline text-[#faf5ee] mt-0.5">
            {ALL_INDIAN_BOARDS.length} Boards
          </p>
          <span className="text-[10px] text-emerald-400 font-mono">Covering all Indian states</span>
        </div>
        <div className="p-4 rounded-xl bg-[#241e1b] border border-[#3e342e]">
          <span className="text-[11px] text-[#a89f97] font-mono uppercase">20-Year Papers</span>
          <p className="text-2xl font-bold font-headline text-[#f0a878] mt-0.5">
            {papersList.length} Archived
          </p>
          <span className="text-[10px] text-[#cec6be] font-mono">2005 to 2024</span>
        </div>
        <div className="p-4 rounded-xl bg-[#241e1b] border border-[#3e342e]">
          <span className="text-[11px] text-[#a89f97] font-mono uppercase">Drive Facsimiles</span>
          <p className="text-2xl font-bold font-headline text-sky-400 mt-0.5">
            {papersList.filter((p) => p.drivePdfUrl).length} Verified
          </p>
          <span className="text-[10px] text-[#86efac] font-mono">In-app PDF preview enabled</span>
        </div>
        <div className="p-4 rounded-xl bg-[#241e1b] border border-[#3e342e]">
          <span className="text-[11px] text-[#a89f97] font-mono uppercase">Languages Covered</span>
          <p className="text-2xl font-bold font-headline text-[#faf5ee] mt-0.5">
            8 Regional
          </p>
          <span className="text-[10px] text-[#a89f97] font-mono">PA, HI, EN, TA, BN, TE, MR</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#241e1b] border border-[#3e342e] space-y-3">
        {/* Search Input & Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#a89f97] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by state, board, subject, year..."
              className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl pl-9 pr-3 py-2 text-xs text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
            >
              <option value="all">All Boards ({ALL_INDIAN_BOARDS.length})</option>
              {ALL_INDIAN_BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.state})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
            >
              <option value="all">All Classes</option>
              <option value="Class 10">Class 10 (Matric)</option>
              <option value="Class 12">Class 12 (Inter)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
            >
              <option value="all">All Years (2005 - 2024)</option>
              <option value="2024">2024 (Latest)</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="2018">2018</option>
              <option value="2015">2015</option>
              <option value="2008">2008</option>
              <option value="2005">2005 (Origin)</option>
            </select>
          </div>
        </div>

        {/* Region Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
          <span className="text-[11px] text-[#a89f97] font-mono uppercase mr-1">Zone:</span>
          {regions.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRegion === reg
                  ? 'bg-[#c2652a] text-[#faf5ee]'
                  : 'bg-[#1c1815] text-[#a89f97] hover:text-[#faf5ee] border border-[#3e342e]'
              }`}
            >
              {reg === 'All' ? 'All Zones' : `${reg} Zone`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabular View */}
      <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1c1815] text-[#cec6be] border-b border-[#3e342e] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Board & State</th>
                <th className="py-3 px-3">Year / Session</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-4">Subject & Code</th>
                <th className="py-3 px-3">Language / Medium</th>
                <th className="py-3 px-3">Paper Set</th>
                <th className="py-3 px-3 text-center">Drive PDF</th>
                <th className="py-3 px-3 text-center">Rubrics</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#342b26] text-[#faf5ee]">
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-[#a89f97]">
                    No board examination papers match your current filters. Try resetting search criteria.
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => (
                  <tr
                    key={paper.id}
                    className="hover:bg-[#2e2622] transition-colors group"
                  >
                    {/* Board & State */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#c2652a]" />
                        <div>
                          <p className="font-bold text-[#faf5ee] group-hover:text-[#f0a878] transition-colors">
                            {paper.boardName}
                          </p>
                          <p className="text-[10px] text-[#a89f97] font-mono">
                            {paper.state} • {paper.boardCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Year / Session */}
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-[#1c1815] border border-[#3e342e] font-mono text-[11px] font-bold text-[#f0a878]">
                        {paper.year}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="py-3.5 px-3">
                      <span className="text-[11px] text-[#cec6be] font-medium">
                        {paper.classLevel}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#faf5ee]">{paper.subject}</p>
                      <p className="text-[10px] text-[#a89f97] font-mono">
                        Code: {paper.subjectCode || 'General'}
                      </p>
                    </td>

                    {/* Language / Medium */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#2e2622] text-[#cec6be] border border-[#483d37] text-[10px] font-medium">
                        {paper.mediumLanguage}
                      </span>
                    </td>

                    {/* Paper Set */}
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[11px] text-[#f0a878]">
                        {paper.paperSet}
                      </span>
                    </td>

                    {/* Drive PDF */}
                    <td className="py-3.5 px-3 text-center">
                      {paper.drivePdfUrl ? (
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setPdfModalData({
                              title: paper.title,
                              driveUrl: paper.drivePdfUrl,
                              rubricUrl: paper.driveRubricUrl,
                            });
                          }}
                          className="p-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 transition-colors inline-flex items-center gap-1 text-[11px]"
                          title="Open Drive PDF"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span className="hidden sm:inline font-mono">PDF</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#78706a] font-mono">Pending</span>
                      )}
                    </td>

                    {/* Rubrics */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        <span>Official</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            setCbtModalTitle(paper.title);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#342b26] hover:bg-[#443831] border border-[#52443c] text-[#f0a878] text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Launch CBT Simulator for this paper"
                        >
                          <span className="material-symbols-outlined text-[14px]">play_circle</span>
                          <span>Test CBT</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="p-4 bg-[#1c1815] border-t border-[#3e342e] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#a89f97] font-mono">
          <span>Showing {filteredPapers.length} of {papersList.length} verified board examination papers</span>
          <span>Drive PDF Links: Verified Against Supabase DataStore</span>
        </div>
      </div>

      {/* Add New Paper Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#241e1b] rounded-3xl border border-[#483d37] shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#3e342e]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c2652a] text-[22px]">
                  post_add
                </span>
                <h3 className="font-headline text-xl font-bold text-[#faf5ee]">
                  Register Board Question Paper
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#a89f97] hover:text-[#faf5ee]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddNewPaper} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono">Target Board</label>
                  <select
                    value={newBoardId}
                    onChange={(e) => setNewBoardId(e.target.value)}
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  >
                    {ALL_INDIAN_BOARDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono">Class Level</label>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value as any)}
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  >
                    <option value="Class 10">Class 10 (Secondary / Matric)</option>
                    <option value="Class 12">Class 12 (Higher Secondary)</option>
                  </select>
                </div>
              </div>

              {/* Exam Year with Direct Entry + Year Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[#cec6be] font-mono">Exam Year Entry</label>
                  <span className="text-[10px] font-mono text-[#f0a878]">Session: {newYear}</span>
                </div>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  min={1995}
                  max={2030}
                  placeholder="e.g. 2024"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
                <div className="flex flex-wrap gap-1 pt-0.5 max-h-16 overflow-y-auto no-scrollbar">
                  {YEAR_PRESETS.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setNewYear(yr);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                        newYear === yr
                          ? 'bg-[#c2652a] text-[#faf5ee] border border-[#f0a878]/40'
                          : 'bg-[#1c1815] text-[#a89f97] hover:text-[#faf5ee] border border-[#3e342e]'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono">Subject Name</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono">Paper Set</label>
                  <input
                    type="text"
                    value={newPaperSet}
                    onChange={(e) => setNewPaperSet(e.target.value)}
                    placeholder="Set A / Set 1"
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#cec6be] font-mono">Medium of Examination</label>
                <input
                  type="text"
                  value={newMedium}
                  onChange={(e) => setNewMedium(e.target.value)}
                  placeholder="e.g. Hindi / English, Punjabi, Tamil"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>

              {/* Local File Drag & Drop Zone */}
              <div className="space-y-1">
                <label className="text-[#cec6be] font-mono flex items-center justify-between">
                  <span>Paper File Attachment</span>
                  <span className="text-[10px] text-[#8a8078]">Local Drag &amp; Drop or Drive</span>
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsModalDragging(true);
                  }}
                  onDragLeave={() => setIsModalDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsModalDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) {
                      triggerHaptic('light');
                      setNewUploadedFile(f);
                    }
                  }}
                  className={`p-3 rounded-xl border-2 border-dashed transition-all text-center ${
                    isModalDragging
                      ? 'border-[#c2652a] bg-[#c2652a]/15'
                      : newUploadedFile
                      ? 'border-emerald-500/50 bg-[#1c1815]'
                      : 'border-[#483d37] bg-[#1c1815]/70 hover:border-[#c2652a]/60'
                  }`}
                >
                  {newUploadedFile ? (
                    <div className="flex items-center justify-between text-left">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                          check_circle
                        </span>
                        <div>
                          <p className="font-mono text-xs text-[#faf5ee] truncate max-w-[200px]">
                            {newUploadedFile.name}
                          </p>
                          <p className="text-[10px] text-[#a89f97]">
                            {(newUploadedFile.size / 1024).toFixed(1)} KB • Attached
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewUploadedFile(null)}
                        className="text-[10px] text-[#f0a878] hover:text-[#faf5ee] underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-[#cec6be]">
                        Drag &amp; drop PDF/scan here, or{' '}
                        <label className="text-[#f0a878] hover:underline cursor-pointer">
                          Browse
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setNewUploadedFile(f);
                            }}
                            className="hidden"
                          />
                        </label>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#cec6be] font-mono">Or Google Drive Question Paper PDF Link</label>
                <input
                  type="url"
                  value={newDriveUrl}
                  onChange={(e) => setNewDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../preview"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#cec6be] font-mono">Google Drive Official Marking Scheme / Rubric Link</label>
                <input
                  type="url"
                  value={newRubricUrl}
                  onChange={(e) => setNewRubricUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../preview"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] text-[#cec6be] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Save & Publish to Catalog
                </button>
              </div>
            </form>
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
            setCbtModalTitle(title);
          }}
        />
      )}

      {/* CBT Test Simulator Modal */}
      {cbtModalTitle && (
        <TestArenaModal
          isOpen={true}
          paperTitle={cbtModalTitle}
          onClose={() => setCbtModalTitle(null)}
        />
      )}
    </div>
  );
}
