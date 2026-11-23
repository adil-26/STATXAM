'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Conversation, ChatMessage, PilotProfile } from '@/lib/types';
import {
  fetchConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  createChatPresenceChannel,
} from '@/lib/chatRealtime';
import { getCachedMessages, setCachedMessages, appendCachedMessage } from '@/lib/chatCache';
import { triggerHaptic } from '@/lib/native-permissions';
import { ReportUserModal } from './ReportUserModal';
import { BlockUserModal } from './BlockUserModal';
import { PeerProfileModal } from './PeerProfileModal';

interface ChatThreadProps {
  conversation: Conversation;
  currentUser: PilotProfile;
  onBack: () => void;
  onUserBlocked?: () => void;
}

export function ChatThread({
  conversation,
  currentUser,
  onBack,
  onUserBlocked,
}: ChatThreadProps) {
  // 1. Instant Cache Pre-Hydration: Renders chat history immediately (<50ms) with zero spinner
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return getCachedMessages(conversation.id) || [];
  });
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);

  // Safety & Profile Modals
  const [showPeerProfile, setShowPeerProfile] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceRef = useRef<{ sendTyping: (isTyping: boolean) => void; unsubscribe: () => void } | null>(null);

  const otherUser = conversation.otherUser || {
    id: conversation.participant_a === currentUser.id ? conversation.participant_b : conversation.participant_a,
    username: `scholar_${(conversation.participant_a === currentUser.id ? conversation.participant_b : conversation.participant_a).slice(0, 4)}`,
    fullName: 'Scholar',
    targetExam: 'Board Exam',
    targetInstitution: 'Merit Scholar Vault',
    estimatedRank: 118,
    accuracy: 91.2,
    streakDays: 7,
    questionsSolved: 420,
    mobile: '',
    telegramLinked: true,
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Initial Load of Messages
  useEffect(() => {
    let mounted = true;
    async function load() {
      const msgs = await fetchConversationMessages(conversation.id);
      if (mounted) {
        setMessages(msgs);
        setTimeout(() => scrollToBottom(false), 80);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [conversation.id]);

  // 2. Real-time Message Subscription (Supabase Realtime postgres_changes)
  useEffect(() => {
    const unsubscribeMessages = subscribeToConversationMessages(conversation.id, (newMsg) => {
      setMessages((prev) => {
        // De-duplicate if already optimistically added
        const exists = prev.some(
          (m) =>
            m.id === newMsg.id ||
            (m.status === 'sending' && m.content === newMsg.content && m.sender_id === newMsg.sender_id)
        );
        if (exists) {
          return prev.map((m) =>
            m.content === newMsg.content && m.sender_id === newMsg.sender_id
              ? { ...newMsg, status: 'sent' }
              : m
          );
        }
        return [...prev, { ...newMsg, status: 'sent' }];
      });
      triggerHaptic('light');
      setTimeout(() => scrollToBottom(true), 50);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [conversation.id]);

  // 3. Realtime Presence & Typing Channel
  useEffect(() => {
    const presence = createChatPresenceChannel(
      conversation.id,
      currentUser.id,
      currentUser.fullName,
      (data) => {
        if (data.userId !== currentUser.id) {
          setIsPeerTyping(data.isTyping);
        }
      },
      (activeUserIds) => {
        setIsPeerOnline(activeUserIds.includes(otherUser.id));
      }
    );

    presenceRef.current = presence;

    return () => {
      presence.unsubscribe();
      presenceRef.current = null;
    };
  }, [conversation.id, currentUser.id, currentUser.fullName, otherUser.id]);

  // Handle Typing indicator broadcast
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (presenceRef.current) {
      presenceRef.current.sendTyping(true);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        presenceRef.current?.sendTyping(false);
      }, 2000);
    }
  };

  // Handle Send Message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSending) return;

    triggerHaptic('light');
    setInputText('');

    if (presenceRef.current) {
      presenceRef.current.sendTyping(false);
    }

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      recipient_id: otherUser.id,
      content: clean,
      message_type: 'text',
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom(true), 50);

    setIsSending(true);
    const res = await sendChatMessage({
      conversationId: conversation.id,
      senderId: currentUser.id,
      recipientId: otherUser.id,
      content: clean,
    });
    setIsSending(false);

    if (res.success && res.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...res.message!, status: 'sent' } : m))
      );
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
      alert(res.error || 'Failed to deliver message.');
    }
  };

  const handleCallClick = (type: 'voice' | 'video') => {
    triggerHaptic('medium');
    setCallNotice(
      `StatXam ${type === 'video' ? 'Video' : 'Voice'} Calling will unlock in our upcoming peer study update. Background WebRTC channels are being calibrated.`
    );
    setTimeout(() => setCallNotice(null), 4000);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[#faf5ee] relative">
      {/* Thread Top Bar (Safe from Top Notch / Status Bar on Mobile) */}
      <div className="bg-[#ffffff]/95 backdrop-blur-md border-b border-[#e8dccb] px-3.5 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-20 pt-[max(env(safe-area-inset-top,0px),10px)] shrink-0 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            className="p-1.5 -ml-1 rounded-full hover:bg-[#faf5ee] text-[#2b2118] transition-colors shrink-0"
            title="Back to Discussions"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>

          {/* Peer Avatar & Status (Tap to open full scholar profile & notes) */}
          <div
            onClick={() => {
              triggerHaptic('light');
              setShowPeerProfile(true);
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity min-w-0 select-none"
            title="View Scholar Profile & Revision Notes"
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center font-bold text-sm border border-[#c2652a]/20">
                {otherUser.fullName.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white ${isPeerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-serif text-sm sm:text-base font-bold text-[#2b2118] truncate leading-tight">
                  {otherUser.fullName}
                </h2>
                <span className="text-xs font-mono font-semibold text-[#c2652a] truncate">
                  @{otherUser.username || 'scholar'}
                </span>
                <span className="material-symbols-outlined text-[13px] text-[#c2652a]">verified</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6e5a49]">
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {otherUser.targetExam || 'Scholar'}
                </span>
                <span>•</span>
                <span
                  className={
                    isPeerOnline
                      ? 'text-emerald-700 font-bold flex items-center gap-1'
                      : 'text-[#6e5a49]'
                  }
                >
                  {isPeerOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                      <span>Active now</span>
                    </>
                  ) : (
                    'Last seen recently'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & UGC Safety Menu */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Peer Voice Call */}
          <button
            type="button"
            onClick={() => handleCallClick('voice')}
            title="Voice Call"
            className="p-2 rounded-xl text-[#6e5a49] hover:text-[#c2652a] hover:bg-[#faf5ee] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
          </button>

          {/* Peer Video Call */}
          <button
            type="button"
            onClick={() => handleCallClick('video')}
            title="Video Call"
            className="p-2 rounded-xl text-[#6e5a49] hover:text-[#c2652a] hover:bg-[#faf5ee] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">videocam</span>
          </button>

          {/* Safety Menu Toggle (•••) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionMenu(!showActionMenu)}
              className="p-2 rounded-xl text-[#6e5a49] hover:text-[#2b2118] hover:bg-[#faf5ee] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>

            {/* Mandatory UGC Action Menu */}
            {showActionMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-[#e8dccb] shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowPeerProfile(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-[#2b2118] hover:bg-[#faf5ee] flex items-center gap-2 font-medium"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#c2652a]">account_circle</span>
                  <span>View Scholar Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-[#e8dccb]/40"
                >
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  <span>Report User / Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowBlockModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-[#e8dccb]/40"
                >
                  <span className="material-symbols-outlined text-[16px]">block</span>
                  <span>Block User</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call Preview Notice */}
      {callNotice && (
        <div className="bg-[#c2652a]/10 border-b border-[#c2652a]/20 px-4 py-2 text-xs text-[#c2652a] flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span className="flex-1">{callNotice}</span>
          <button onClick={() => setCallNotice(null)} className="text-[14px]">✕</button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#6e5a49]">
            <div className="w-12 h-12 rounded-full bg-[#e8dccb]/40 flex items-center justify-center text-[#c2652a]">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <p className="font-serif text-base font-bold text-[#2b2118]">Safe Academic Discussion</p>
            <p className="text-xs max-w-xs leading-relaxed">
              Start discussing past year questions, exam strategies, or step marking formulas with {otherUser.fullName}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id;
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-md px-4 py-2.5 rounded-2xl shadow-xs text-xs leading-relaxed relative ${isMe
                      ? 'bg-[#c2652a] text-[#ffffff] rounded-br-xs'
                      : 'bg-[#ffffff] text-[#2b2118] border border-[#e8dccb] rounded-bl-xs'
                    }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-white/80' : 'text-[#6e5a49]'
                      }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      <span className="material-symbols-outlined text-[12px]">
                        {msg.status === 'sending'
                          ? 'schedule'
                          : msg.status === 'failed'
                            ? 'error'
                            : msg.read_at
                              ? 'done_all'
                              : 'done'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Peer Typing Indicator */}
        {isPeerTyping && (
          <div className="flex items-center gap-2 text-xs text-[#6e5a49] italic animate-in fade-in duration-200">
            <div className="flex gap-1 py-1 px-2.5 bg-white border border-[#e8dccb] rounded-full">
              <span className="w-1.5 h-1.5 bg-[#c2652a] rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-[#c2652a] rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-[#c2652a] rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px]">{otherUser.fullName} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer (Docked at Bottom with Safe Area Insets) */}
      <form
        onSubmit={handleSend}
        className="p-2.5 sm:p-3 bg-[#ffffff] border-t border-[#e8dccb] flex items-center gap-2 pb-[max(env(safe-area-inset-bottom,0px),12px)] shrink-0 z-10 shadow-xs"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message ${otherUser.fullName}...`}
          className="flex-1 bg-[#faf5ee] rounded-full px-4 py-2.5 text-xs text-[#2b2118] border border-[#e8dccb] focus:outline-none focus:border-[#c2652a] font-body"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-full bg-[#c2652a] text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-[#a8521e] disabled:opacity-40 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>

      {/* Peer Scholar Profile Modal */}
      <PeerProfileModal
        isOpen={showPeerProfile}
        onClose={() => setShowPeerProfile(false)}
        peerUser={otherUser}
        isOnline={isPeerOnline}
      />

      {/* UGC Report Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reporterId={currentUser.id}
        reportedUserId={otherUser.id}
        reportedUserName={otherUser.fullName}
      />

      {/* UGC Block Modal */}
      <BlockUserModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        blockerId={currentUser.id}
        blockedId={otherUser.id}
        blockedUserName={otherUser.fullName}
        onBlockSuccess={() => {
          if (onUserBlocked) onUserBlocked();
          onBack();
        }}
      />
    </div>
  );
}
