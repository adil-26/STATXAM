'use client';

import React, { useState } from 'react';
import { reportUserOrMessage } from '@/lib/chatRealtime';
import { triggerHaptic } from '@/lib/native-permissions';

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  messageId?: string | null;
  onReportSuccess?: () => void;
}

const REPORT_REASONS = [
  'Harassment, bullying, or abusive language',
  'Inappropriate or sexually explicit content',
  'Spam, advertising, or unsolicited promotion',
  'Cheating, impersonation, or exam leaks',
  'Sharing personal private data (doxxing)',
  'Other violation of academic community safety',
];

export function ReportUserModal({
  isOpen,
  onClose,
  reporterId,
  reportedUserId,
  reportedUserName,
  messageId,
  onReportSuccess,
}: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSubmitting(true);

    const fullReason = details.trim()
      ? `${selectedReason} — Notes: ${details.trim()}`
      : selectedReason;

    const res = await reportUserOrMessage({
      reporterId,
      reportedUserId,
      messageId: messageId || null,
      reason: fullReason,
    });

    setIsSubmitting(false);

    if (res.success) {
      triggerHaptic('success');
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        onClose();
        if (onReportSuccess) onReportSuccess();
      }, 1500);
    } else {
      triggerHaptic('error');
      alert(res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2118]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#ffffff] rounded-3xl border border-[#e8dccb] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[#e8dccb]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">flag</span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2b2118]">Report User or Content</h3>
              <p className="text-[11px] text-[#6e5a49]">Reporting @{reportedUserName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#faf5ee] text-[#6e5a49]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
            <p className="font-semibold text-sm text-[#2b2118]">Report Submitted</p>
            <p className="text-xs text-[#6e5a49]">
              Thank you. Our safety moderation team reviews all flagged student interactions to keep StatXam secure.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <p className="text-[#3d3024] leading-relaxed">
              Please specify why you are reporting this scholar. Reports are confidential and reviewed under our User-Generated Content (UGC) safety rules.
            </p>

            <div className="space-y-2">
              <label className="font-semibold text-[#2b2118] uppercase tracking-wider text-[10px]">
                Reason for Report
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-[#faf5ee] border-[#c2652a] text-[#2b2118] font-medium'
                        : 'border-[#e8dccb] hover:bg-[#faf5ee]/50 text-[#6e5a49]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mt-0.5 accent-[#c2652a]"
                    />
                    <span className="text-xs leading-tight">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[#2b2118] uppercase tracking-wider text-[10px]">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what occurred or paste excerpts..."
                className="w-full bg-[#faf5ee] rounded-xl p-3 border border-[#e8dccb] text-xs text-[#2b2118] focus:outline-none focus:border-[#c2652a] resize-none h-20"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#faf5ee] text-[#2b2118] hover:bg-[#e8dccb]/40 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
