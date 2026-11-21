'use client';

import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/native-permissions';

interface PdfViewerModalProps {
  title: string;
  driveUrl?: string;
  rubricUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onSolveCbt?: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  title,
  driveUrl,
  rubricUrl,
  isOpen,
  onClose,
  onSolveCbt,
}) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'rubric'>('paper');

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

  const currentUrl = activeTab === 'paper' ? driveUrl : rubricUrl;

  return (
    <div className="fixed inset-0 z-[100] bg-[#3a302a]/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in text-on-surface">
      <div className="w-full max-w-5xl h-[92vh] bg-surface-container-lowest rounded-2xl sm:rounded-3xl border border-outline-variant/80 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-outline-variant/60 bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface truncate">{title}</h3>
              <p className="text-[11px] text-on-surface-variant font-label">20-Year Archive Vault • Verified Facsimile</p>
            </div>
          </div>

          {/* Mode Switcher & Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            {rubricUrl && (
              <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant/50">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('paper');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-label font-bold transition-all ${
                    activeTab === 'paper'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Question Paper
                </button>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveTab('rubric');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-label font-bold transition-all ${
                    activeTab === 'rubric'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Marking Scheme
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Embedded PDF Drive Viewer Body */}
        <div className="flex-1 bg-surface-container-lowest p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {currentUrl ? (
            <iframe
              src={currentUrl}
              className="w-full h-full rounded-xl border border-outline-variant/60 shadow-inner bg-surface"
              title={title}
              allow="autoplay"
            />
          ) : (
            <div className="flex flex-col items-center text-center p-6 space-y-3 max-w-md">
              <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary border border-outline-variant/40">
                <span className="material-symbols-outlined text-[28px]">drive_file_move</span>
              </div>
              <h4 className="font-headline text-lg font-bold text-on-surface">Digital Paper Facsimile</h4>
              <p className="text-xs text-on-surface-variant font-body leading-relaxed">
                This archived paper has been OCR ingested and parsed into the interactive CBT engine with all mathematical derivations.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-outline-variant/60 bg-surface-container-low shrink-0 gap-3">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-label">
            <span className="material-symbols-outlined text-primary text-[16px]">verified</span>
            <span>Official PSEB &amp; CBSE Pattern</span>
          </div>

          <div className="flex items-center gap-2">
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label text-xs font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant/50"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open in Drive</span>
              </a>
            )}

            {onSolveCbt && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onSolveCbt();
                }}
                className="py-2 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">terminal</span>
                <span>Solve in Timed CBT</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
