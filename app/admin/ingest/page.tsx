'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { triggerHaptic } from '@/lib/native-permissions';
import { ALL_INDIAN_BOARDS } from '@/lib/boards-catalog';
import {
  extractRawOcrTextFromPdf,
  refineRawOcrTextWithGroq,
  commitQuestionsAndPaperToBank,
} from '@/lib/ocr-groq-pipeline';
import { getActiveGroqApiKey, getActiveGroqModel } from '@/lib/groq-service';
import { Question } from '@/lib/types';
import { TestArenaModal } from '@/components/TestArenaModal';
import { AskQuestionModal } from '@/components/AskQuestionModal';

export default function DriveOcrGroqStudioPage() {
  // Source Mode: 'local_file' or 'google_drive'
  const [sourceMode, setSourceMode] = useState<'local_file' | 'google_drive'>('local_file');

  // Local File Drag & Drop State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [localFileText, setLocalFileText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive State
  const [driveUrl, setDriveUrl] = useState(
    'https://drive.google.com/file/d/1pseb2024maths_facsimile/view'
  );
  const [rubricDriveUrl, setRubricDriveUrl] = useState('');

  // Paper Metadata State (with Year Entry)
  const [selectedBoardId, setSelectedBoardId] = useState('rbse');
  const [examYear, setExamYear] = useState('2014');
  const [subjectName, setSubjectName] = useState('English');
  const [classLevel, setClassLevel] = useState<'Class 10' | 'Class 12'>('Class 10');
  const [paperSet, setPaperSet] = useState('Code 02');

  // Processing & Pipeline State
  const [currentStage, setCurrentStage] = useState<
    'idle' | 'downloading' | 'ocr_extracting' | 'groq_refining' | 'committing' | 'completed'
  >('idle');
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  // Extracted Data State
  const [rawOcrStream, setRawOcrStream] = useState<string>('');
  const [refinedQuestions, setRefinedQuestions] = useState<Question[]>([]);
  const [activeOutputTab, setActiveOutputTab] = useState<'refined' | 'raw_ocr'>('refined');
  const [searchQuestionQuery, setSearchQuestionQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All');
  const [cbtModalTitle, setCbtModalTitle] = useState<string | null>(null);
  const [activeQuestionModal, setActiveQuestionModal] = useState<Question | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Year chips presets for fast 1-click selection
  const YEAR_PRESETS = [
    '2025',
    '2024',
    '2023',
    '2022',
    '2021',
    '2020',
    '2019',
    '2018',
    '2017',
    '2016',
    '2015',
    '2014',
    '2012',
    '2010',
    '2005',
  ];

  const selectedBoard =
    ALL_INDIAN_BOARDS.find((b) => b.id === selectedBoardId) || ALL_INDIAN_BOARDS[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper: Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Process Local File (from Drag & Drop or File Picker)
  const processLocalFile = (file: File) => {
    triggerHaptic('light');
    setUploadedFile(file);

    // Auto-detect year from filename if present (e.g., 'RBSE_2014_English.pdf')
    const yearMatch = file.name.match(/\b(20\d\d)\b/);
    if (yearMatch && yearMatch[1]) {
      setExamYear(yearMatch[1]);
    }

    // Auto-detect board from filename if present
    const lowerName = file.name.toLowerCase();
    for (const b of ALL_INDIAN_BOARDS) {
      if (
        lowerName.includes(b.id) ||
        lowerName.includes(b.code.toLowerCase()) ||
        lowerName.includes(b.state.toLowerCase())
      ) {
        setSelectedBoardId(b.id);
        break;
      }
    }

    // Auto-detect subject from filename
    if (lowerName.includes('eng')) setSubjectName('English');
    else if (lowerName.includes('hin')) setSubjectName('Hindi');
    else if (lowerName.includes('math')) setSubjectName('Mathematics');
    else if (lowerName.includes('phys')) setSubjectName('Physics');
    else if (lowerName.includes('chem')) setSubjectName('Chemistry');
    else if (lowerName.includes('bio')) setSubjectName('Biology');
    else if (lowerName.includes('sci')) setSubjectName('Science');
    else if (lowerName.includes('soc') || lowerName.includes('hist')) setSubjectName('Social Science');
    else if (lowerName.includes('punj')) setSubjectName('Punjabi');

    // Read file text or binary data
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setLocalFileText(result.slice(0, 60000));
      }
    };

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file.slice(0, 100000));
    }

    showToast(`Loaded "${file.name}" (${formatFileSize(file.size)})`);
  };

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processLocalFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLocalFile(file);
    }
  };

  // Main Full OCR + Groq Pipeline
  const handleStartOcrAndAiPipeline = async (e: React.FormEvent) => {
    e.preventDefault();

    if (sourceMode === 'local_file' && !uploadedFile) {
      showToast('Please drag & drop or select a question paper file first.');
      return;
    }

    if (sourceMode === 'google_drive' && !driveUrl.trim()) {
      showToast('Please provide a valid Google Drive PDF link.');
      return;
    }

    if (!examYear || !examYear.trim()) {
      showToast('Please specify the exam year (e.g. 2014).');
      return;
    }

    triggerHaptic('medium');
    setRefinedQuestions([]);
    setRawOcrStream('');
    setSelectedSectionFilter('All');

    try {
      // Stage 1: Download / Read Stream
      setCurrentStage('downloading');
      if (sourceMode === 'local_file' && uploadedFile) {
        setProgressMsg(
          `Reading local file "${uploadedFile.name}" (${formatFileSize(uploadedFile.size)}) stream...`
        );
      } else {
        setProgressMsg('Connecting to Google Drive document stream & verifying authorization...');
      }
      await new Promise((r) => setTimeout(r, 900));

      // Stage 2: Extract Every Single Raw Text Character via OCR
      setCurrentStage('ocr_extracting');
      setProgressMsg(
        `Running Tesseract OCR & Text Extractor across ${selectedBoard.name} ${examYear} ${subjectName}...`
      );

      const ocrResult = await extractRawOcrTextFromPdf({
        driveUrl:
          sourceMode === 'local_file' && uploadedFile
            ? `local://${uploadedFile.name}`
            : driveUrl,
        boardName: selectedBoard.name,
        boardCode: selectedBoard.code,
        subject: subjectName,
        year: Number(examYear) || 2014,
        classLevel,
        paperSet,
        uploadedFileName: uploadedFile ? uploadedFile.name : undefined,
        uploadedFileSize: uploadedFile ? uploadedFile.size : undefined,
        localFileText: localFileText || undefined,
        localFile: uploadedFile || null,
        onOcrProgress: (pct, status) => {
          setProgressMsg(`Tesseract OCR Engine: ${pct}% (${status})...`);
        },
      });

      setRawOcrStream(ocrResult.rawText);
      showToast(
        `OCR Complete (${ocrResult.ocrEngineUsed}): Extracted ${ocrResult.totalCharacters.toLocaleString()} characters across ${ocrResult.detectedQuestionCount} questions.`
      );

      // Stage 3: Send Raw OCR to Groq AI for Noise Cleaning & Step Rubric Extraction
      setCurrentStage('groq_refining');
      const activeModelShort = getActiveGroqModel().split('/')[1] || 'gpt-oss-120b';
      setProgressMsg(
        `Groq AI (${activeModelShort}) is cleaning OCR noise, extracting only questions, and deriving step rubrics...`
      );

      const questionsParsed = await refineRawOcrTextWithGroq({
        rawText: ocrResult.rawText,
        boardName: selectedBoard.fullName,
        boardCode: selectedBoard.code,
        subject: subjectName,
        year: Number(examYear) || 2014,
        apiKey: getActiveGroqApiKey(),
        model: getActiveGroqModel(),
      });

      setRefinedQuestions(questionsParsed);

      // Stage 4: Commit Directly into Question Bank & Catalog
      setCurrentStage('committing');
      setProgressMsg(
        `Committing ${questionsParsed.length} finalized questions into Question Bank and updating ${examYear} Board Catalog...`
      );

      const commitRes = await commitQuestionsAndPaperToBank({
        questions: questionsParsed,
        boardId: selectedBoard.id,
        boardName: selectedBoard.name,
        boardCode: selectedBoard.code,
        state: selectedBoard.state,
        subject: subjectName,
        year: Number(examYear) || 2014,
        classLevel,
        driveUrl:
          sourceMode === 'local_file' && uploadedFile
            ? `local://${uploadedFile.name}`
            : driveUrl,
        rubricUrl: rubricDriveUrl || driveUrl,
        paperSet,
      });

      setCurrentStage('completed');
      setProgressMsg(null);
      triggerHaptic('success');
      showToast(
        `Success! Finalized ${commitRes.questionsAdded} questions for ${selectedBoard.name} ${examYear} and committed to Question Bank.`
      );
    } catch (err: any) {
      console.error('OCR & AI Pipeline failed:', err);
      setCurrentStage('idle');
      setProgressMsg(null);
      showToast(`Error in pipeline: ${err?.message || 'Failed processing'}`);
    }
  };

  // Section list for filtering
  const sectionFilters = ['All', ...Array.from(new Set(refinedQuestions.map((q) => q.topic)))];

  const filteredQuestions = refinedQuestions.filter((q) => {
    if (selectedSectionFilter !== 'All' && q.topic !== selectedSectionFilter) {
      return false;
    }
    if (!searchQuestionQuery.trim()) return true;
    const query = searchQuestionQuery.toLowerCase();
    return (
      q.stem.toLowerCase().includes(query) ||
      q.topic.toLowerCase().includes(query) ||
      q.id.toLowerCase().includes(query) ||
      (q.solution ? q.solution.toLowerCase().includes(query) : false)
    );
  });

  // Export Question Bank to JSON
  const handleExportJson = () => {
    if (refinedQuestions.length === 0) return;
    triggerHaptic('light');
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(refinedQuestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${selectedBoard.code}_${examYear}_${subjectName}_QuestionBank.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Question Bank exported as JSON file!');
  };

  // Copy Question Bank to Clipboard
  const handleCopyBank = () => {
    if (refinedQuestions.length === 0) return;
    triggerHaptic('light');
    const formatted = refinedQuestions
      .map(
        (q, i) =>
          `Q${i + 1} [${q.topic} - ${q.marks} Marks]:\n${q.stem}\n\nOptions:\n${q.options
            .map((o) => `  ${o.id}. ${o.text}`)
            .join('\n')}\n\nCorrect: Option ${q.correctOption}\nStep-by-Step Marking Rubric: ${
            q.solution
          }\n`
      )
      .join('\n========================================\n\n');
    navigator.clipboard.writeText(formatted);
    showToast('Formatted Question Bank copied to clipboard!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3e342e]">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#c2652a] text-[28px]">
              document_scanner
            </span>
            <h1 className="font-headline text-3xl font-bold text-[#faf5ee]">
              Multi-Subject Drive &amp; Local OCR Question Studio
            </h1>
          </div>
          <p className="text-xs text-[#a89f97] mt-1 max-w-3xl">
            Extract verbatim raw text using Tesseract OCR, isolate every clean question, format step rubrics, and construct an interactive Question Bank where you can solve, test, and ask questions created directly from that paper.
          </p>
        </div>

        <Link
          href="/admin/settings"
          className="px-3.5 py-1.5 rounded-xl bg-[#2e2622] hover:bg-[#382f2a] border border-[#3e342e] text-xs font-mono text-[#f0a878] flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">vpn_key</span>
          <span>Engine: {getActiveGroqModel().split('/')[1] || 'gpt-oss-120b'}</span>
        </Link>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in zoom-in-95">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (5 cols): Ingestion Controls & Year Entry */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#342b26]">
              <h2 className="font-headline text-base font-bold text-[#faf5ee]">
                1. Question Paper Ingestion
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1815] text-[#f0a878] border border-[#3e342e]">
                {selectedBoard.state} • {selectedBoard.code}
              </span>
            </div>

            <form onSubmit={handleStartOcrAndAiPipeline} className="space-y-4 text-xs">
              {/* SOURCE SELECTOR TABS: Drag & Drop Local File vs Google Drive */}
              <div className="space-y-2">
                <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold text-[11px] flex items-center justify-between">
                  <span>Paper Ingestion Source</span>
                  <span className="text-[10px] text-[#f0a878] font-normal">
                    {sourceMode === 'local_file' ? 'Local Upload' : 'Cloud Link'}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#1c1815] rounded-xl border border-[#3e342e]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSourceMode('local_file');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono text-xs font-semibold transition-all ${
                      sourceMode === 'local_file'
                        ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                        : 'text-[#a89f97] hover:text-[#faf5ee]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span>Local Drag &amp; Drop</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSourceMode('google_drive');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono text-xs font-semibold transition-all ${
                      sourceMode === 'google_drive'
                        ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                        : 'text-[#a89f97] hover:text-[#faf5ee]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
                    <span>Google Drive</span>
                  </button>
                </div>
              </div>

              {/* MODE A: DRAG & DROP ZONE FOR LOCAL FILES */}
              {sourceMode === 'local_file' && (
                <div className="space-y-2">
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2.5 ${
                      isDragging
                        ? 'border-[#c2652a] bg-[#c2652a]/15 shadow-[0_0_20px_rgba(194,101,42,0.3)] scale-[1.01]'
                        : uploadedFile
                        ? 'border-emerald-500/60 bg-[#1c1815]'
                        : 'border-[#483d37] hover:border-[#c2652a]/70 bg-[#1c1815]/80 hover:bg-[#1c1815]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.json"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {uploadedFile ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-[22px]">
                            {uploadedFile.name.endsWith('.pdf')
                              ? 'picture_as_pdf'
                              : uploadedFile.type.includes('image')
                              ? 'image'
                              : 'description'}
                          </span>
                        </div>
                        <div>
                          <p className="font-mono text-xs font-bold text-[#faf5ee] truncate max-w-xs mx-auto">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[11px] font-mono text-[#a89f97] mt-0.5">
                            {formatFileSize(uploadedFile.size)} • Ready for OCR &amp; Groq Refinement
                          </p>
                        </div>
                        <div className="pt-1 flex items-center justify-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                            File Attached
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFile(null);
                              setLocalFileText('');
                            }}
                            className="text-[10px] font-mono text-[#f0a878] hover:text-[#faf5ee] underline"
                          >
                            Replace File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-1">
                        <div className="w-10 h-10 rounded-xl bg-[#2e2622] text-[#f0a878] flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                          <span className="material-symbols-outlined text-[22px]">
                            {isDragging ? 'file_download' : 'cloud_upload'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#faf5ee]">
                            {isDragging
                              ? 'Drop your Question Paper file here!'
                              : 'Drag & Drop your Question Paper file here'}
                          </p>
                          <p className="text-[10px] text-[#a89f97] mt-0.5">
                            Supports PDF, scanned images (PNG, JPG), or text banks up to 50MB
                          </p>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-lg bg-[#2e2622] hover:bg-[#382f2a] text-[#f0a878] font-mono text-[10px] font-semibold border border-[#483d37] mt-1">
                          Browse Local Storage
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE B: GOOGLE DRIVE LINK INPUT */}
              {sourceMode === 'google_drive' && (
                <div className="space-y-1.5">
                  <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold flex items-center justify-between">
                    <span>Google Drive PDF Link</span>
                    <span className="text-[10px] text-[#8a8078] lowercase">Shared Link</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#a89f97] text-[18px]">
                      add_to_drive
                    </span>
                    <input
                      type="url"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                    />
                  </div>
                </div>
              )}

              {/* DEDICATED YEAR ENTRY SECTION (With Direct Entry + 1-Click Year Chips) */}
              <div className="space-y-2 pt-1 border-t border-[#342b26]">
                <div className="flex items-center justify-between">
                  <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#c2652a]">
                      calendar_month
                    </span>
                    <span>Exam Year Entry</span>
                  </label>
                  <span className="text-[10px] font-mono text-[#f0a878]">
                    Selected: {examYear || '—'}
                  </span>
                </div>

                {/* Direct Number Entry Input */}
                <div className="relative">
                  <input
                    type="number"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    placeholder="Enter exam session year (e.g. 2014, 2024)"
                    min={1995}
                    max={2030}
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-mono text-[#8a8078]">
                    Annual Exam
                  </span>
                </div>

                {/* 1-Click Preset Year Pills */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#8a8078] font-mono">
                    Quick Year Presets:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar">
                    {YEAR_PRESETS.map((yr) => {
                      const isSelected = examYear === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setExamYear(yr);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm scale-105 border border-[#f0a878]/50'
                              : 'bg-[#1c1815] text-[#a89f97] hover:text-[#faf5ee] hover:bg-[#2e2622] border border-[#3e342e]'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Target Board Selector */}
              <div className="space-y-1.5 pt-1 border-t border-[#342b26]">
                <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold">
                  Target State / National Board
                </label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                >
                  {ALL_INDIAN_BOARDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.state}) • {b.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Name Input */}
              <div className="space-y-1.5">
                <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. English, Mathematics, Science, Hindi"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
                {/* Quick Subject Presets */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    'English',
                    'Hindi',
                    'Mathematics',
                    'Science',
                    'Social Science',
                    'Physics',
                    'Chemistry',
                    'Biology',
                    'Punjabi',
                  ].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubjectName(sub)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        subjectName.toLowerCase().includes(sub.toLowerCase())
                          ? 'bg-[#c2652a]/20 text-[#f0a878] border-[#c2652a]/50'
                          : 'bg-[#1c1815] text-[#a89f97] hover:text-[#faf5ee] border-[#3e342e]'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Level & Paper Set Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold">
                    Class Level
                  </label>
                  <select
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value as any)}
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-2 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  >
                    <option value="Class 10">Class 10 (Secondary / Matric)</option>
                    <option value="Class 12">Class 12 (Senior Secondary)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold">
                    Set / Series Code
                  </label>
                  <input
                    type="text"
                    value={paperSet}
                    onChange={(e) => setPaperSet(e.target.value)}
                    placeholder="Code 02 / Set A"
                    className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-2 py-2 text-xs text-[#faf5ee] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                  />
                </div>
              </div>

              {/* Optional Rubrics Drive Link */}
              <div className="space-y-1 pt-1">
                <label className="text-[#cec6be] font-mono uppercase tracking-wider font-semibold flex items-center justify-between">
                  <span>Marking Scheme / Rubric URL</span>
                  <span className="text-[10px] text-[#8a8078]">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={rubricDriveUrl}
                  onChange={(e) => setRubricDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../marking_scheme"
                  className="w-full bg-[#1c1815] border border-[#483d37] rounded-xl px-3 py-2 text-xs font-mono text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]"
                />
              </div>

              {/* Action Trigger Button */}
              <button
                type="submit"
                disabled={currentStage !== 'idle' && currentStage !== 'completed'}
                className="w-full mt-2 py-3.5 rounded-xl bg-[#c2652a] hover:bg-[#a85220] disabled:opacity-50 text-[#faf5ee] font-bold text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {currentStage !== 'idle' && currentStage !== 'completed' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing OCR &amp; AI Extraction...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>Extract Raw OCR &amp; Build Question Bank</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Real-Time Processing Stepper Card */}
          {currentStage !== 'idle' && (
            <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] p-5 shadow-xl space-y-3">
              <h3 className="font-headline text-sm font-bold text-[#faf5ee] flex items-center justify-between">
                <span>Pipeline Stage Monitor</span>
                <span className="text-xs font-mono text-[#f0a878] uppercase">
                  {currentStage}
                </span>
              </h3>

              <div className="space-y-2 text-xs font-mono">
                <div
                  className={`flex items-center gap-2.5 p-2 rounded-lg ${
                    currentStage === 'downloading'
                      ? 'bg-[#c2652a]/20 text-[#f0a878] border border-[#c2652a]/40'
                      : 'text-emerald-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {currentStage === 'downloading' ? 'sync' : 'check_circle'}
                  </span>
                  <span>
                    1.{' '}
                    {sourceMode === 'local_file'
                      ? 'Reading Local File Stream'
                      : 'Connecting & Downloading Drive PDF'}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2.5 p-2 rounded-lg ${
                    currentStage === 'ocr_extracting'
                      ? 'bg-[#c2652a]/20 text-[#f0a878] border border-[#c2652a]/40'
                      : ['groq_refining', 'committing', 'completed'].includes(currentStage)
                      ? 'text-emerald-400'
                      : 'text-[#8a8078]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {currentStage === 'ocr_extracting' ? 'sync' : 'check_circle'}
                  </span>
                  <span>2. Tesseract OCR &amp; Raw Paper Extraction</span>
                </div>

                <div
                  className={`flex items-center gap-2.5 p-2 rounded-lg ${
                    currentStage === 'groq_refining'
                      ? 'bg-[#c2652a]/20 text-[#f0a878] border border-[#c2652a]/40'
                      : ['committing', 'completed'].includes(currentStage)
                      ? 'text-emerald-400'
                      : 'text-[#8a8078]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {currentStage === 'groq_refining' ? 'sync' : 'check_circle'}
                  </span>
                  <span>3. Groq AI Cleaning Noise &amp; Step Rubrics</span>
                </div>

                <div
                  className={`flex items-center gap-2.5 p-2 rounded-lg ${
                    currentStage === 'committing'
                      ? 'bg-[#c2652a]/20 text-[#f0a878] border border-[#c2652a]/40'
                      : currentStage === 'completed'
                      ? 'text-emerald-400'
                      : 'text-[#8a8078]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {currentStage === 'committing' ? 'sync' : 'check_circle'}
                  </span>
                  <span>4. Direct Commit to Question Bank &amp; Catalog</span>
                </div>
              </div>

              {progressMsg && (
                <p className="text-[11px] font-mono text-[#cec6be] pt-1 italic">
                  {progressMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Dual-Tab Results Viewer & Full Question Bank */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#241e1b] rounded-2xl border border-[#3e342e] shadow-xl p-6 space-y-4">
            {/* Tab Switcher: Full Question Bank vs Raw OCR Stream */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#342b26]">
              <div className="flex items-center gap-1.5 p-1 bg-[#1c1815] rounded-xl border border-[#3e342e]">
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('refined')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'refined'
                      ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                      : 'text-[#a89f97] hover:text-[#faf5ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>Full Question Bank ({refinedQuestions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputTab('raw_ocr')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeOutputTab === 'raw_ocr'
                      ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                      : 'text-[#a89f97] hover:text-[#faf5ee]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">raw_on</span>
                  <span>Raw OCR Stream</span>
                </button>
              </div>

              {refinedQuestions.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c1815] hover:bg-[#2e2622] border border-[#3e342e] text-[#cec6be] hover:text-[#faf5ee] text-xs font-mono flex items-center gap-1 transition-colors"
                    title="Export JSON Question Bank"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span className="hidden sm:inline">JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBank}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1c1815] hover:bg-[#2e2622] border border-[#3e342e] text-[#cec6be] hover:text-[#faf5ee] text-xs font-mono flex items-center gap-1 transition-colors"
                    title="Copy Formatted Questions to Clipboard"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span className="hidden sm:inline">Copy</span>
                  </button>

                  <Link
                    href="/admin/review"
                    className="px-3 py-1.5 rounded-lg bg-[#2e2622] hover:bg-[#382f2a] border border-[#3e342e] text-[#f0a878] text-xs font-semibold"
                  >
                    Review Suite
                  </Link>
                </div>
              )}
            </div>

            {/* TAB 1: FULL QUESTION BANK VIEW WITH INTERACTIVE ASKING */}
            {activeOutputTab === 'refined' && (
              <div className="space-y-4">
                {refinedQuestions.length > 0 ? (
                  <>
                    {/* Paper Details Banner */}
                    <div className="p-4 rounded-2xl bg-[#1c1815] border border-[#3e342e] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#2e2622]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#faf5ee]">
                              {selectedBoard.name} ({selectedBoard.code})
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c2652a]/20 text-[#f0a878] border border-[#c2652a]/30">
                              {examYear} Session
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2e2622] text-[#cec6be]">
                              {classLevel}
                            </span>
                          </div>
                          <p className="text-xs text-[#a89f97] mt-0.5">
                            Subject: <strong className="text-[#faf5ee]">{subjectName}</strong> • Set:{' '}
                            <strong className="text-[#faf5ee]">{paperSet}</strong> • Total Marks:{' '}
                            <strong className="text-emerald-400">
                              {refinedQuestions.reduce((sum, q) => sum + q.marks, 0)} Marks
                            </strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            setCbtModalTitle(
                              `${selectedBoard.code} ${classLevel} ${subjectName} (${examYear})`
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a85220] text-[#faf5ee] text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shrink-0 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_circle</span>
                          <span>Launch Full Paper CBT</span>
                        </button>
                      </div>

                      {/* Section Filter Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-[#8a8078] font-mono uppercase tracking-wider">
                          Filter by Section:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {sectionFilters.map((sec) => {
                            const count =
                              sec === 'All'
                                ? refinedQuestions.length
                                : refinedQuestions.filter((q) => q.topic === sec).length;
                            const isSelected = selectedSectionFilter === sec;
                            return (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setSelectedSectionFilter(sec);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all ${
                                  isSelected
                                    ? 'bg-[#c2652a] text-[#faf5ee] shadow-sm'
                                    : 'bg-[#241e1b] text-[#a89f97] hover:text-[#faf5ee] border border-[#3e342e]'
                                }`}
                              >
                                {sec} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative pt-1">
                        <span className="material-symbols-outlined absolute left-3 top-3 text-[#a89f97] text-[16px]">
                          search
                        </span>
                        <input
                          type="text"
                          value={searchQuestionQuery}
                          onChange={(e) => setSearchQuestionQuery(e.target.value)}
                          placeholder="Search questions, topics, stems, or marking rubrics..."
                          className="w-full bg-[#14110f] border border-[#3e342e] rounded-xl pl-9 pr-3 py-2 text-xs text-[#faf5ee] placeholder-[#78706a] focus:outline-none focus:ring-1 focus:ring-[#c2652a]"
                        />
                      </div>
                    </div>

                    {/* Question Cards List */}
                    <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                      {filteredQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 sm:p-5 rounded-2xl bg-[#1c1815] border border-[#3e342e] space-y-3 hover:border-[#52443c] transition-all shadow-sm"
                        >
                          {/* Card Top Row */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#f0a878] font-bold text-sm">
                                #{idx + 1}
                              </span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#241e1b] text-[#cec6be] border border-[#342b26]">
                                {q.id}
                              </span>
                              <span className="text-[11px] text-[#a89f97] truncate max-w-[200px]">
                                • {q.topic}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                              {q.marks} Marks
                            </span>
                          </div>

                          {/* Question Stem */}
                          <p className="text-xs sm:text-sm text-[#faf5ee] leading-relaxed font-body select-text">
                            {q.stem}
                          </p>

                          {/* Options Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                                  opt.id === q.correctOption
                                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                                    : 'bg-[#241e1b] border-[#3e342e] text-[#cec6be]'
                                }`}
                              >
                                <span className="font-bold">{opt.id}.</span>
                                <span className="truncate">{opt.text}</span>
                              </div>
                            ))}
                          </div>

                          {/* Step Rubric */}
                          <div className="pt-2 border-t border-[#2e2622] text-[11px] text-[#a89f97] font-mono leading-relaxed">
                            <span className="text-[#f0a878] font-bold">Official Step Rubric: </span>
                            <span className="text-[#cec6be]">{q.solution}</span>
                          </div>

                          {/* Card Footer: Interactive Solve / Ask Question Action */}
                          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2e2622]">
                            <span className="text-[10px] font-mono text-[#8a8078]">
                              Created from {selectedBoard.name} {examYear} paper
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setActiveQuestionIndex(idx);
                                setActiveQuestionModal(q);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#c2652a]/20 hover:bg-[#c2652a] text-[#f0a878] hover:text-[#faf5ee] border border-[#c2652a]/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[16px]">quiz</span>
                              <span>Ask / Solve This Question</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#1c1815] border border-[#3e342e] flex items-center justify-center text-[#a89f97] mx-auto">
                      <span className="material-symbols-outlined text-[24px]">folder_zip</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-headline text-base font-bold text-[#faf5ee]">
                        No Questions Extracted Yet
                      </h4>
                      <p className="text-xs text-[#a89f97] max-w-sm mx-auto">
                        Drag &amp; drop a local question paper file or paste a Google Drive PDF link on the left, specify the exam year, and click &quot;Extract Raw OCR &amp; Build Question Bank&quot; to begin.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RAW OCR TEXT STREAM VIEWER */}
            {activeOutputTab === 'raw_ocr' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#a89f97] font-mono">
                  <span>Verbatim OCR Characters Extracted: {rawOcrStream.length.toLocaleString()}</span>
                  <span>Unfiltered Paper Stream</span>
                </div>

                <div className="p-4 rounded-xl bg-[#14110f] border border-[#3e342e] max-h-[550px] overflow-y-auto">
                  {rawOcrStream ? (
                    <pre className="text-xs font-mono text-[#86efac] whitespace-pre-wrap leading-relaxed select-text">
                      {rawOcrStream}
                    </pre>
                  ) : (
                    <div className="py-12 text-center text-xs font-mono text-[#78706a]">
                      Raw OCR stream will render here once extraction begins.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CBT Test Simulator Modal (Full Paper) */}
      {cbtModalTitle && (
        <TestArenaModal
          isOpen={true}
          paperTitle={cbtModalTitle}
          customQuestions={refinedQuestions.length > 0 ? refinedQuestions : undefined}
          onClose={() => setCbtModalTitle(null)}
        />
      )}

      {/* Interactive Ask / Solve Single Question Modal */}
      {activeQuestionModal && (
        <AskQuestionModal
          isOpen={true}
          question={activeQuestionModal}
          paperTitle={`${selectedBoard.name} ${examYear} ${subjectName}`}
          questionIndex={activeQuestionIndex}
          totalQuestions={filteredQuestions.length}
          hasPrev={activeQuestionIndex > 0}
          hasNext={activeQuestionIndex < filteredQuestions.length - 1}
          onPrevQuestion={() => {
            const newIdx = activeQuestionIndex - 1;
            if (newIdx >= 0) {
              setActiveQuestionIndex(newIdx);
              setActiveQuestionModal(filteredQuestions[newIdx]);
            }
          }}
          onNextQuestion={() => {
            const newIdx = activeQuestionIndex + 1;
            if (newIdx < filteredQuestions.length) {
              setActiveQuestionIndex(newIdx);
              setActiveQuestionModal(filteredQuestions[newIdx]);
            }
          }}
          onClose={() => setActiveQuestionModal(null)}
        />
      )}
    </div>
  );
}
