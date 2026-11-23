'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversation } from '@/lib/chatRealtime';
import { PilotProfile, Conversation } from '@/lib/types';
import { triggerHaptic } from '@/lib/native-permissions';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onConversationCreated: (conversation: Conversation) => void;
}

export function NewChatModal({
  isOpen,
  onClose,
  currentUserId,
  onConversationCreated,
}: NewChatModalProps) {
  const [search, setSearch] = useState('');
  const [scholars, setScholars] = useState<PilotProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadScholars() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, mobile, language, target_exam, target_institution, estimated_rank, accuracy, streak_days')
          .neq('id', currentUserId)
          .limit(30);

        if (data) {
          const mapped: PilotProfile[] = data.map((p) => ({
            id: p.id,
            fullName: p.full_name || 'Scholar',
            mobile: p.mobile || '',
            language: p.language || 'english',
            targetExam: p.target_exam || 'Board Exam',
            targetInstitution: p.target_institution || 'State Merit Rank',
            estimatedRank: p.estimated_rank || 150,
            accuracy: Number(p.accuracy) || 85,
            streakDays: p.streak_days || 1,
            questionsSolved: 0,
            telegramLinked: false,
          }));
          setScholars(mapped);
        }
      } catch (err) {
        console.warn('[NewChatModal] Failed loading scholars:', err);
      } finally {
        setLoading(false);
      }
    }

    loadScholars();
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const filtered = scholars.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.targetExam.toLowerCase().includes(q) ||
      (s.language && s.language.toLowerCase().includes(q))
    );
  });

  const handleSelectScholar = async (targetUser: PilotProfile) => {
    triggerHaptic('medium');
    setStarting(targetUser.id);

    const res = await getOrCreateConversation(currentUserId, targetUser.id);
    setStarting(null);

    if (res.success && res.conversation) {
      triggerHaptic('success');
      onConversationCreated({
        ...res.conversation,
        otherUser: targetUser,
      });
      onClose();
    } else {
      triggerHaptic('error');
      alert(res.error || 'Could not open discussion with this scholar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2118]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#ffffff] rounded-3xl border border-[#e8dccb] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-[#e8dccb]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#c2652a]/10 text-[#c2652a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2b2118]">Start Study Discussion</h3>
              <p className="text-[11px] text-[#6e5a49]">Connect with peer scholars across boards</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#faf5ee] text-[#6e5a49]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[#6e5a49]/60 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scholar name or board exam..."
            className="w-full bg-[#faf5ee] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2b2118] border border-[#e8dccb] focus:outline-none focus:border-[#c2652a]"
          />
        </div>

        {/* Scholar List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#6e5a49]">
              <div className="w-6 h-6 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Scanning academic directory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6e5a49]">
              No scholars found matching &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((scholar) => (
              <div
                key={scholar.id}
                onClick={() => handleSelectScholar(scholar)}
                className="flex items-center justify-between p-3 rounded-2xl border border-[#e8dccb] bg-[#faf5ee] hover:bg-[#ffffff] hover:border-[#c2652a] cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center font-bold text-sm shrink-0 border border-[#c2652a]/20">
                    {scholar.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2b2118] truncate">{scholar.fullName}</p>
                    <p className="text-[11px] text-[#6e5a49] truncate font-medium">
                      {scholar.targetExam} • {scholar.accuracy}% acc
                    </p>
                  </div>
                </div>

                <button
                  disabled={starting === scholar.id}
                  className="px-3 py-1.5 rounded-xl bg-[#c2652a] text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 shadow-xs"
                >
                  {starting === scholar.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Message</span>
                      <span className="material-symbols-outlined text-[14px]">send</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
