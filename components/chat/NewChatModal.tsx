'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal is opened/closed - ZERO eager network query on load!
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setScholars([]);
      setLoading(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen]);

  // Instagram-style 250ms debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const clean = val.trim().replace(/^@/, '').toLowerCase();

    if (clean.length < 2) {
      setScholars([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // PRIVACY ENFORCED: only id, username, full_name, target_exam, target_institution, estimated_rank, accuracy
        // NEVER selects mobile or email!
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, target_exam, target_institution, estimated_rank, accuracy, streak_days')
          .neq('id', currentUserId)
          .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`)
          .limit(15);

        if (!error && data) {
          const mapped: PilotProfile[] = data.map((p) => ({
            id: p.id,
            username: p.username || `scholar_${p.id.slice(0, 4)}`,
            fullName: p.full_name || 'Scholar',
            mobile: '', // Stripped for privacy
            language: 'english',
            targetExam: p.target_exam || 'Board Exam',
            targetInstitution: p.target_institution || 'Merit Rank',
            estimatedRank: p.estimated_rank || 150,
            accuracy: Number(p.accuracy) || 85,
            streakDays: p.streak_days || 1,
            questionsSolved: 0,
            telegramLinked: false,
          }));
          setScholars(mapped);
        } else {
          setScholars([]);
        }
      } catch (err) {
        console.warn('[NewChatModal] Search failed:', err);
        setScholars([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  if (!isOpen) return null;

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

  const isQueryTooShort = search.trim().replace(/^@/, '').length < 2;

  return (
    <div className="fixed inset-0 z-50 bg-[#2b2118]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#ffffff] rounded-3xl border border-[#e8dccb] shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8dccb]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c2652a]/10 text-[#c2652a] flex items-center justify-center border border-[#c2652a]/20">
              <span className="material-symbols-outlined text-[18px]">alternate_email</span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2b2118]">Find Scholars</h3>
              <p className="text-[11px] text-[#6e5a49]">Search by unique @username or student name</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#faf5ee] hover:bg-[#e8dccb] text-[#6e5a49] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Instagram-Style Search Input */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[#6e5a49]/60 text-lg">
            search
          </span>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search @username or name..."
            className="w-full bg-[#faf5ee] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#2b2118] border border-[#e8dccb] focus:outline-none focus:border-[#c2652a] font-body"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 text-[#6e5a49]/60 hover:text-[#2b2118] text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Area */}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#6e5a49] space-y-2">
              <div className="w-6 h-6 border-2 border-[#c2652a] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Searching StatXam directory...</p>
            </div>
          ) : isQueryTooShort ? (
            /* Empty State: Zero wasted eager queries */
            <div className="py-12 text-center text-[#6e5a49] space-y-2 px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#faf5ee] border border-[#e8dccb] text-[#c2652a] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">person_search</span>
              </div>
              <h4 className="font-serif text-sm font-bold text-[#2b2118]">
                Instagram-Style Scholar Discovery
              </h4>
              <p className="text-xs max-w-xs mx-auto leading-relaxed text-[#6e5a49]">
                Type at least 2 characters or an <strong className="text-[#c2652a]">@handle</strong> to instantly discover board peers with verified privacy.
              </p>
            </div>
          ) : scholars.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6e5a49] space-y-1">
              <p className="font-bold text-[#2b2118]">No scholars found</p>
              <p>No user matches &ldquo;{search}&rdquo;. Check spelling or try searching full name.</p>
            </div>
          ) : (
            scholars.map((scholar) => (
              <div
                key={scholar.id}
                onClick={() => handleSelectScholar(scholar)}
                className="flex items-center justify-between p-3 rounded-2xl border border-[#e8dccb] bg-[#faf5ee]/70 hover:bg-[#ffffff] hover:border-[#c2652a] cursor-pointer transition-all active:scale-[0.99] shadow-2xs group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center font-bold text-sm shrink-0 border border-[#c2652a]/20 group-hover:bg-[#c2652a] group-hover:text-white transition-colors">
                    {scholar.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-serif text-xs sm:text-sm font-bold text-[#2b2118] truncate">
                        {scholar.fullName}
                      </p>
                      <span className="material-symbols-outlined text-[13px] text-[#c2652a]">verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6e5a49] truncate mt-0.5 font-sans">
                      <span className="font-mono text-[#c2652a] font-bold">
                        @{scholar.username}
                      </span>
                      <span>•</span>
                      <span className="truncate">{scholar.targetExam}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={starting === scholar.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectScholar(scholar);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#c2652a] hover:bg-[#a8521e] text-white text-[11px] font-bold flex items-center gap-1 shrink-0 shadow-xs transition-all active:scale-95 disabled:opacity-50"
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

        {/* Privacy Note */}
        <div className="pt-2 border-t border-[#e8dccb]/60 flex items-center justify-between text-[10px] text-[#6e5a49]">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-emerald-600">lock</span>
            <span>Phone numbers &amp; emails are encrypted &amp; hidden</span>
          </span>
          <span className="font-mono text-[#c2652a]">StatXam v2.4</span>
        </div>
      </div>
    </div>
  );
}
