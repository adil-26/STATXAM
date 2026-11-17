import React from 'react';
import { QuestionSource } from '@/lib/types';

interface SourceBadgeProps {
  source: QuestionSource;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, className = '' }) => {
  if (source === 'google_drive_pdf_extracted') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant border border-primary/20 font-label text-[11px] font-bold uppercase tracking-wider ${className}`}
      >
        <span
          className="material-symbols-outlined text-[13px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          verified
        </span>
        <span>Verified Board Paper</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container border border-outline-variant/60 font-label text-[11px] font-semibold tracking-wider ${className}`}
    >
      <span className="material-symbols-outlined text-[13px] text-tertiary">auto_awesome</span>
      <span>AI High-Yield Trend</span>
    </span>
  );
};