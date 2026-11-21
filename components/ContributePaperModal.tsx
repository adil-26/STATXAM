'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ALL_INDIAN_BOARDS, AllIndiaPaperEntry } from '@/lib/boards-catalog';
import {
  checkPaperAvailabilityInVault,
  submitPaperContribution,
  getStudentCoins,
} from '@/lib/contributions-service';
import { useAuth } from '@/lib/auth-context';
import { triggerHaptic } from '@/lib/native-permissions';

interface ContributePaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExistingPaperCbt?: (title: string) => void;
}

export const ContributePaperModal: React.FC<ContributePaperModalProps> = ({
  isOpen,
  onClose,
  onOpenExistingPaperCbt,
}) => {
  const { user } = useAuth();

  // Inquiry Form State
  const [boardId, setBoardId] = useState('rbse');
  const [classLevel, setClassLevel] = useState<'Class 10' | 'Class 12'>('Class 10');
  const [examYear, setExamYear] = useState('2014');
  const [subject, setSubject] = useState('English');
  const [paperSet, setPaperSet] = useState('Set A');

  // Vault Check State: 'untested' | 'checking' | 'exists' | 'missing'
  const [checkStatus, setCheckStatus] = useState<'untested' | 'checking' | 'exists' | 'missing'>(
    'untested'
  );
  const [existingPaper, setExistingPaper] = useState<AllIndiaPaperEntry | null>(null);

  // Upload State for Missing Paper
  const [sourceType, setSourceType] = useState<'local' | 'drive'>('local');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [rubricUrl, setRubricUrl] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBoard = ALL_INDIAN_BOARDS.find((b) => b.id === boardId) || ALL_INDIAN_BOARDS[0];

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  if (!isOpen) return null;

  // Perform database check
  const handleCheckDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setCheckStatus('checking');

    setTimeout(() => {
      const result = checkPaperAvailabilityInVault({
        boardId,
        classLevel,
        year: Number(examYear) || 2014,
        subject,
      });

      if (result.exists && result.paper) {
        setCheckStatus('exists');
        setExistingPaper(result.paper);
      } else {
        setCheckStatus('missing');
        setExistingPaper(null);
      }
    }, 450);
  };

  // Process Local File
  const handleFileSelect = (file: File) => {
    triggerHaptic('light');
    setUploadedFile(file);
  };

  // Submit Paper for Admin Approval
  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === 'local' && !uploadedFile) {
      alert('Please attach your question paper PDF or scanned document.');
      return;
    }
    if (sourceType === 'drive' && !driveUrl.trim()) {
      alert('Please provide a Google Drive shared link to the question paper.');
      return;
    }

    triggerHaptic('success');
    setIsSubmitting(true);

    setTimeout(() => {
      submitPaperContribution({
        studentId: user?.id || 'scholar-allindia-01',
        studentName: user?.fullName || 'Aarav Sharma',
        studentMobile: user?.mobile || '+91 98765 43210',
        boardId: selectedBoard.id,
        boardName: selectedBoard.name,
        boardCode: selectedBoard.code,
        state: selectedBoard.state,
        classLevel,
        year: Number(examYear) || 2014,
        subject,
        paperSet,
        paperFileUrl:
          sourceType === 'local' && uploadedFile
            ? `local://${uploadedFile.name}`
            : driveUrl,
        fileName: uploadedFile ? uploadedFile.name : undefined,
        fileSize: uploadedFile ? uploadedFile.size : undefined,
        rubricUrl: rubricUrl.trim() || undefined,
        studentNotes: studentNotes.trim() || undefined,
      });

      setIsSubmitting(false);
      setSubmittedSuccess(true);
    }, 600);
  };

  const handleReset = () => {
    setCheckStatus('untested');
    setExistingPaper(null);
    setUploadedFile(null);
    setDriveUrl('');
    setRubricUrl('');
    setStudentNotes('');
    setSubmittedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-surface border-b border-outline-variant/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">monetization_on</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                  Contribute Paper &amp; Earn Coins
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono">
                  +150 Coins Bounty
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-body">
                Check our 20-year database. If a paper is missing, upload it for admin approval and get rewarded!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* SUCCESS SCREEN */}
          {submittedSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                <span className="material-symbols-outlined text-[36px]">verified</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline text-xl font-bold text-on-surface">
                  Paper Submitted for Admin Review!
                </h4>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Thank you, <strong className="text-on-surface">{user?.fullName || 'Scholar'}</strong>! Your submission for <strong className="text-on-surface">{selectedBoard.name} {classLevel} {subject} ({examYear})</strong> has been received.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-outline-variant/60 max-w-sm mx-auto text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-on-surface-variant">Bounty Reward:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">toll</span>
                    <span>150 Scholar Coins</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-on-surface-variant">Review Status:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold text-[10px]">
                    Pending Admin Approval
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant/80 pt-1 border-t border-outline-variant/40">
                  Once an admin verifies the questions and rubrics, your wallet will automatically receive +150 Coins.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold font-label transition-colors"
                >
                  Contribute Another Paper
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold font-label shadow-md hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: PAPER SELECTION FORM */}
              <form onSubmit={handleCheckDatabase} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                  <span className="font-mono uppercase tracking-wider font-bold text-[11px] text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">search_check</span>
                    <span>1. Which Question Paper Do You Want to Upload?</span>
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-mono">Step 1 of 2</span>
                </div>

                {/* Target Board */}
                <div className="space-y-1">
                  <label className="font-label font-semibold text-on-surface">Target Board</label>
                  <select
                    value={boardId}
                    onChange={(e) => {
                      setBoardId(e.target.value);
                      setCheckStatus('untested');
                    }}
                    className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ALL_INDIAN_BOARDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.state}) • {b.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class & Year Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-label font-semibold text-on-surface">Class Level</label>
                    <select
                      value={classLevel}
                      onChange={(e) => {
                        setClassLevel(e.target.value as any);
                        setCheckStatus('untested');
                      }}
                      className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Class 10">Class 10 (Secondary / Matric)</option>
                      <option value="Class 12">Class 12 (Senior Secondary)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-label font-semibold text-on-surface">Exam Year</label>
                    <input
                      type="number"
                      value={examYear}
                      onChange={(e) => {
                        setExamYear(e.target.value);
                        setCheckStatus('untested');
                      }}
                      min={1995}
                      max={2026}
                      placeholder="e.g. 2014, 2017, 2022"
                      className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Subject Name */}
                <div className="space-y-1">
                  <label className="font-label font-semibold text-on-surface">Subject Name</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setCheckStatus('untested');
                    }}
                    placeholder="e.g. English, Mathematics, Science, Social Science"
                    className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {/* Subject Quick Presets */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Physics', 'Chemistry', 'Biology'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSubject(sub);
                          setCheckStatus('untested');
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          subject.toLowerCase() === sub.toLowerCase()
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-surface border-outline-variant/60 text-on-surface-variant'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Check Database Button */}
                <button
                  type="submit"
                  disabled={checkStatus === 'checking'}
                  className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-outline-variant/60"
                >
                  {checkStatus === 'checking' ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Checking 20-Year Archive Database...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">database</span>
                      <span>Check Paper Availability in Vault</span>
                    </>
                  )}
                </button>
              </form>

              {/* CASE A: PAPER ALREADY EXISTS */}
              {checkStatus === 'exists' && existingPaper && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span className="font-headline text-sm font-bold">
                      Paper Already Available in the Archive!
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    This paper is already fully archived in our 20-year database with verified step-by-step marking rubrics.
                  </p>

                  <div className="p-3 rounded-xl bg-surface border border-outline-variant/60 space-y-1">
                    <p className="font-bold text-xs text-on-surface">{existingPaper.title}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {existingPaper.boardName} • {existingPaper.classLevel} • {existingPaper.totalQuestions} Questions • {existingPaper.durationMinutes} mins
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenExistingPaperCbt?.(existingPaper.title);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">play_circle</span>
                      <span>Practice in CBT Simulator</span>
                    </button>
                    {existingPaper.drivePdfUrl && (
                      <a
                        href={existingPaper.drivePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface font-label font-semibold text-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        <span>View Drive PDF</span>
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant/80 italic">
                    Tip: Try selecting an earlier year or another subject where papers are missing to earn your +150 coins bounty!
                  </p>
                </div>
              )}

              {/* CASE B: PAPER IS MISSING -> UNLOCK BOUNTY UPLOAD */}
              {checkStatus === 'missing' && (
                <div className="space-y-4 pt-2 border-t border-outline-variant/60 animate-in fade-in">
                  {/* Bounty Banner */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <span className="material-symbols-outlined text-[20px]">stars</span>
                      <span className="font-headline text-sm font-bold">
                        Missing Paper Found! +150 Coins Bounty Available
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      This paper ({selectedBoard.name} {classLevel} {subject} {examYear}) is not in our archives yet. Upload it now to help fellow students and claim your reward!
                    </p>
                  </div>

                  {/* Upload Form */}
                  <form onSubmit={handleSubmitContribution} className="space-y-4">
                    {/* Source Switcher */}
                    <div className="space-y-1.5">
                      <label className="font-label font-semibold text-on-surface">Paper Source</label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-surface border border-outline-variant/60 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setSourceType('local')}
                          className={`py-1.5 rounded-lg font-label font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            sourceType === 'local'
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">upload_file</span>
                          <span>Local Drag &amp; Drop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSourceType('drive')}
                          className={`py-1.5 rounded-lg font-label font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            sourceType === 'drive'
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">add_to_drive</span>
                          <span>Google Drive Link</span>
                        </button>
                      </div>
                    </div>

                    {/* Local Drag & Drop Area */}
                    {sourceType === 'local' && (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handleFileSelect(f);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-2 ${
                          isDragging
                            ? 'border-primary bg-primary/10'
                            : uploadedFile
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : 'border-outline-variant hover:border-primary/60 bg-surface'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileSelect(f);
                          }}
                          className="hidden"
                        />

                        {uploadedFile ? (
                          <div className="space-y-1">
                            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[26px]">
                              check_circle
                            </span>
                            <p className="font-bold text-xs text-on-surface">{uploadedFile.name}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to Upload
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="material-symbols-outlined text-primary text-[28px]">
                              cloud_upload
                            </span>
                            <p className="font-bold text-xs text-on-surface">
                              Drag &amp; drop PDF or question paper photos
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              Supports PDF, PNG, JPG (up to 30MB)
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Drive Link Input */}
                    {sourceType === 'drive' && (
                      <div className="space-y-1">
                        <label className="font-label font-semibold text-on-surface">
                          Google Drive Shared Link
                        </label>
                        <input
                          type="url"
                          value={driveUrl}
                          onChange={(e) => setDriveUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/.../view"
                          className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    {/* Paper Set Code */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-label font-semibold text-on-surface">Paper Set / Code</label>
                        <input
                          type="text"
                          value={paperSet}
                          onChange={(e) => setPaperSet(e.target.value)}
                          placeholder="Set A / Code 02"
                          className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-label font-semibold text-on-surface">
                          Answer Key Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={rubricUrl}
                          onChange={(e) => setRubricUrl(e.target.value)}
                          placeholder="https://drive.google.com/..."
                          className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Student Notes */}
                    <div className="space-y-1">
                      <label className="font-label font-semibold text-on-surface">
                        Notes about this paper (Optional)
                      </label>
                      <input
                        type="text"
                        value={studentNotes}
                        onChange={(e) => setStudentNotes(e.target.value)}
                        placeholder="e.g. Annual exam 2017 paper scanned from government school archive"
                        className="w-full bg-surface border border-outline-variant/80 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Submit Contribution Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-label font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Paper for Admin Review...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">verified</span>
                          <span>Submit Paper &amp; Claim 150 Coins Bounty</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
