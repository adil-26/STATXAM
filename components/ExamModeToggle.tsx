'use client';

import React from 'react';
import { useExamMode } from './ExamModeContext';

export function ExamModeToggle() {
  const { mode, setMode } = useExamMode();

  return (
    <div
      role="group"
      aria-label="Select Examination Track"
      className="inline-flex items-center p-1 rounded-full bg-[#f3ebe0] border border-[#e8dccb] shadow-2xs select-none"
    >
      <button
        type="button"
        onClick={() => setMode('indian')}
        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-headline font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
          mode === 'indian'
            ? 'bg-[#c2652a] text-[#faf5ee] shadow-[0_2px_8px_rgba(194,101,42,0.35)]'
            : 'text-[#6e5a49] hover:text-[#2b2118]'
        }`}
        title="Switch to Indian Board & Competitive Exams (CBSE, PSEB, NEET, JEE)"
      >
        <span>🇮🇳</span>
        <span className="hidden xs:inline">Indian Exams</span>
        <span className="xs:hidden">Boards</span>
      </button>

      <button
        type="button"
        onClick={() => setMode('ielts')}
        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-headline font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 active:scale-95 ${
          mode === 'ielts'
            ? 'bg-[#c2652a] text-[#faf5ee] shadow-[0_2px_8px_rgba(194,101,42,0.35)]'
            : 'text-[#6e5a49] hover:text-[#2b2118]'
        }`}
        title="Switch to IELTS Global Preparation (Duolingo-style Winding Units)"
      >
        <span>🌍</span>
        <span>IELTS</span>
      </button>
    </div>
  );
}
