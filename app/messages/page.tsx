'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Conversation } from '@/lib/types';
import { fetchUserConversations } from '@/lib/chatRealtime';
import { getCachedConversations } from '@/lib/chatCache';
import { initPushNotifications } from '@/lib/notifications';
import { ChatInbox } from '@/components/chat/ChatInbox';
import { ChatThread } from '@/components/chat/ChatThread';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get('c');

  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      return getCachedConversations(user.id) || [];
    }
    return [];
  });
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const cached = getCachedConversations(user.id);
      return !cached || cached.length === 0;
    }
    return true;
  });

  // 1. Guard Authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  // 2. Broadcast Chat Active state so AppShell and BottomNav hide when a mobile thread is open
  useEffect(() => {
    const active = Boolean(activeConversation);
    window.dispatchEvent(new CustomEvent('statxam_chat_active', { detail: { active } }));
    return () => {
      window.dispatchEvent(new CustomEvent('statxam_chat_active', { detail: { active: false } }));
    };
  }, [activeConversation]);

  // 3. Initialize Push Notifications (FCM / Capacitor)
  useEffect(() => {
    if (user?.id) {
      initPushNotifications(user.id, (path) => {
        router.push(path);
      });
    }
  }, [user?.id, router]);

  // 4. Stale-While-Revalidate Load Conversations (<100ms)
  const loadConversations = async () => {
    if (!user?.id) return;
    
    // Check instant cache first
    const cached = getCachedConversations(user.id);
    if (cached && cached.length > 0 && conversations.length === 0) {
      setConversations(cached);
      setLoading(false);
      if (conversationParam) {
        const match = cached.find((c) => c.id === conversationParam);
        if (match) setActiveConversation(match);
      }
    }

    const convs = await fetchUserConversations(user.id);
    setConversations(convs);
    setLoading(false);

    // If query param ?c= exists, select that conversation
    if (conversationParam) {
      const match = convs.find((c) => c.id === conversationParam);
      if (match) {
        setActiveConversation(match);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id, conversationParam]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-[#c2652a] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c2652a]">
          Loading Discussions...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full md:min-h-[calc(100vh-4rem)] bg-[#faf5ee]">
      {/* Responsive Layout: Split on desktop, full-screen single-view on mobile */}
      <div className="max-w-6xl mx-auto h-[100dvh] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row md:border-x md:border-[#e8dccb] md:shadow-xs bg-[#ffffff]">
        {/* Left Column: Inbox */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-[#e8dccb] flex-shrink-0 h-full ${
            activeConversation ? 'hidden md:flex flex-col' : 'flex flex-col'
          }`}
        >
          <ChatInbox
            conversations={conversations}
            currentUser={user}
            selectedConversationId={activeConversation?.id}
            onSelectConversation={(conv) => {
              setActiveConversation(conv);
              router.replace(`/messages?c=${conv.id}`, { scroll: false });
            }}
            onRefresh={loadConversations}
          />
        </div>

        {/* Right Column: Active Thread */}
        <div
          className={`flex-1 h-full flex flex-col ${
            !activeConversation
              ? 'hidden md:flex flex-col items-center justify-center text-center p-8 bg-[#faf5ee]'
              : 'flex flex-col h-full'
          }`}
        >
          {activeConversation ? (
            <ChatThread
              conversation={activeConversation}
              currentUser={user}
              onBack={() => {
                setActiveConversation(null);
                router.replace('/messages', { scroll: false });
              }}
              onUserBlocked={() => {
                setActiveConversation(null);
                loadConversations();
              }}
            />
          ) : (
            <div className="space-y-3 max-w-sm text-[#6e5a49]">
              <div className="w-16 h-16 rounded-3xl bg-[#c2652a]/10 text-[#c2652a] flex items-center justify-center mx-auto border border-[#c2652a]/20 shadow-xs">
                <span className="material-symbols-outlined text-3xl">chat_bubble</span>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#2b2118]">Select a Study Discussion</h2>
              <p className="text-xs leading-relaxed">
                Exchange board solutions, exam tips, and problem-solving strategies with peer scholars in real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#c2652a] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
