'use client';

import React, { useState } from 'react';
import { Conversation, PilotProfile } from '@/lib/types';
import { triggerHaptic } from '@/lib/native-permissions';
import { NewChatModal } from './NewChatModal';

interface ChatInboxProps {
  conversations: Conversation[];
  currentUser: PilotProfile;
  selectedConversationId?: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onRefresh: () => void;
}

export function ChatInbox({
  conversations,
  currentUser,
  selectedConversationId,
  onSelectConversation,
  onRefresh,
}: ChatInboxProps) {
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().replace(/^@/, '');
    const uname = c.otherUser?.username?.toLowerCase() || '';
    const name = c.otherUser?.fullName?.toLowerCase() || '';
    const exam = c.otherUser?.targetExam?.toLowerCase() || '';
    const preview = c.last_message_preview?.toLowerCase() || '';
    return uname.includes(q) || name.includes(q) || exam.includes(q) || preview.includes(q);
  });

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#faf5ee]">
      {/* Top Header */}
      <div className="p-4 bg-white/90 backdrop-blur-md border-b border-[#e8dccb] flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#2b2118]">Peer Study Discussions</h1>
          <p className="text-xs text-[#6e5a49]">Real-time board exam collaboration</p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setShowNewModal(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-[#c2652a] hover:bg-[#a8521e] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Find Scholar</span>
        </button>
      </div>

      {/* Instagram-Style Quick Search Bar */}
      <div className="p-3 border-b border-[#e8dccb] bg-[#faf5ee]">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-[#6e5a49]/60 text-lg">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter discussions by @username or name..."
            className="w-full bg-white rounded-xl pl-10 pr-4 py-2 text-xs text-[#2b2118] border border-[#e8dccb] focus:outline-none focus:border-[#c2652a] shadow-xs"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e8dccb]/50">
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#c2652a]/10 text-[#c2652a] flex items-center justify-center mx-auto border border-[#c2652a]/20">
              <span className="material-symbols-outlined text-3xl">forum</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-base font-bold text-[#2b2118]">No Active Discussions</h3>
              <p className="text-xs text-[#6e5a49] max-w-xs mx-auto leading-relaxed">
                Connect with peer scholars preparing for your board exam using unique <strong className="text-[#c2652a]">@handles</strong>.
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowNewModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#c2652a] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs hover:bg-[#a8521e] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              <span>Search Scholars by @Handle</span>
            </button>
          </div>
        ) : (
          filtered.map((conv) => {
            const other = conv.otherUser || {
              id: conv.participant_a === currentUser.id ? conv.participant_b : conv.participant_a,
              username: `scholar_${(conv.participant_a === currentUser.id ? conv.participant_b : conv.participant_a).slice(0, 4)}`,
              fullName: 'Scholar',
              targetExam: 'Board Exam',
            };
            const isSelected = selectedConversationId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  triggerHaptic('light');
                  onSelectConversation(conv);
                }}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${isSelected
                    ? 'bg-[#ffffff] border-l-4 border-l-[#c2652a]'
                    : 'hover:bg-[#ffffff]/80 bg-[#faf5ee]'
                  }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center font-bold text-base shrink-0 border border-[#c2652a]/20">
                  {other.fullName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-serif text-sm font-bold text-[#2b2118] truncate">
                        {other.fullName}
                      </h4>
                      <span className="text-[11px] font-mono text-[#c2652a] font-semibold truncate">
                        @{other.username || 'scholar'}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6e5a49] shrink-0 font-medium">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[#6e5a49] truncate font-body">
                      {conv.last_message_preview || 'Tap to view discussion'}
                    </p>

                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span className="w-5 h-5 rounded-full bg-[#c2652a] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Discussion Modal */}
      <NewChatModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        currentUserId={currentUser.id}
        onConversationCreated={(newConv) => {
          onRefresh();
          onSelectConversation(newConv);
        }}
      />
    </div>
  );
}
