'use client';

import React, { useState } from 'react';
import { blockUser } from '@/lib/chatRealtime';
import { triggerHaptic } from '@/lib/native-permissions';

interface BlockUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockerId: string;
  blockedId: string;
  blockedUserName: string;
  onBlockSuccess?: () => void;
}

export function BlockUserModal({
  isOpen,
  onClose,
  blockerId,
  blockedId,
  blockedUserName,
  onBlockSuccess,
}: BlockUserModalProps) {
  const [isBlocking, setIsBlocking] = useState(false);

  if (!isOpen) return null;

  const handleBlock = async () => {
    triggerHaptic('medium');
    setIsBlocking(true);

    const res = await blockUser(blockerId, blockedId);
    setIsBlocking(false);

    if (res.success) {
      triggerHaptic('success');
      onClose();
      if (onBlockSuccess) onBlockSuccess();
    } else {
      triggerHaptic('error');
      alert(res.error || 'Failed to block user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2118]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#ffffff] rounded-3xl border border-[#e8dccb] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">block</span>
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#2b2118]">Block Scholar?</h3>
            <p className="text-xs text-[#6e5a49]">@{blockedUserName}</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#3d3024]">
          Once blocked, <strong>{blockedUserName}</strong> will no longer be able to send you peer chat messages, start study discussions, or place audio/video calls to your account. Your online presence will also be hidden from them.
        </p>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#faf5ee] text-[#2b2118] hover:bg-[#e8dccb]/40 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBlocking}
            onClick={handleBlock}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <span>{isBlocking ? 'Blocking...' : 'Block User'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
