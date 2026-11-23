'use client';

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ChatMessage, Conversation, PilotProfile } from './types';
import { getApiUrl } from './api-config';
import {
  getCachedConversations,
  setCachedConversations,
  getCachedMessages,
  setCachedMessages,
  appendCachedMessage,
} from './chatCache';

/**
 * Resilient fetch wrapper with exponential backoff retry.
 * Handles transient network resets and QUIC protocol packet timeouts.
 */
async function fetchWithRetry(url: string, options?: RequestInit, retries = 1, delayMs = 400): Promise<Response> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

/**
 * Subscribes to new incoming messages for a specific conversation using Supabase Realtime postgres_changes.
 * Automatically cleans up channel on unmount.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  onNewMessage: (message: ChatMessage) => void
): () => void {
  const channelName = `conversation:${conversationId}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          const msg = payload.new as ChatMessage;
          appendCachedMessage(conversationId, msg);
          onNewMessage(msg);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Realtime Presence & Broadcast channel for typing indicators and online peer awareness.
 */
export function createChatPresenceChannel(
  conversationId: string,
  userId: string,
  userName: string,
  onTyping: (data: { userId: string; isTyping: boolean }) => void,
  onPresenceSync?: (activeUsers: string[]) => void
): {
  sendTyping: (isTyping: boolean) => void;
  unsubscribe: () => void;
} {
  const channelName = `presence:${conversationId}`;

  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: userId,
      },
      broadcast: {
        self: false,
      },
    },
  });

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      if (payload.payload) {
        onTyping(payload.payload as { userId: string; isTyping: boolean });
      }
    })
    .on('presence', { event: 'sync' }, () => {
      if (onPresenceSync) {
        const state = channel.presenceState();
        const activeIds = Object.keys(state);
        onPresenceSync(activeIds);
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          online_at: new Date().toISOString(),
          user_id: userId,
          user_name: userName,
        });
      }
    });

  const sendTyping = (isTyping: boolean) => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    });
  };

  const unsubscribe = () => {
    channel.untrack();
    supabase.removeChannel(channel);
  };

  return { sendTyping, unsubscribe };
}

/**
 * Fetches all conversations for the current user with stale-while-revalidate caching.
 */
export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const res = await fetchWithRetry(getApiUrl(`/api/chat/conversations?userId=${encodeURIComponent(userId)}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.conversations)) {
        setCachedConversations(userId, json.conversations);
        return json.conversations;
      }
    }
  } catch (err) {
    console.warn('[ChatRealtime] API fetch failed, querying direct Supabase...', err);
  }

  // Direct Supabase fallback (minimal columns, no mobile/email)
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, last_message_preview, created_at')
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      const convs = data as Conversation[];
      setCachedConversations(userId, convs);
      return convs;
    }
  } catch {
    // offline
  }

  return getCachedConversations(userId) || [];
}

/**
 * Fetches messages for a given conversation with stale-while-revalidate caching.
 */
export async function fetchConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  // Check memory/session cache
  const cached = getCachedMessages(conversationId);

  try {
    const res = await fetchWithRetry(getApiUrl(`/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.messages)) {
        setCachedMessages(conversationId, json.messages);
        return json.messages;
      }
    }
  } catch (err) {
    console.warn('[ChatRealtime] API messages fetch failed, fallback to Supabase:', err);
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, recipient_id, content, message_type, read_at, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(60);

    if (!error && data) {
      const msgs = data as ChatMessage[];
      setCachedMessages(conversationId, msgs);
      return msgs;
    }
  } catch {
    // offline
  }

  return cached || [];
}

/**
 * Sends a message within a conversation.
 * Synchronously writes to local cache for instant UI feedback.
 */
export async function sendChatMessage(params: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  messageType?: 'text' | 'image' | 'call_invitation';
}): Promise<{ success: boolean; message?: ChatMessage; error?: string }> {
  const { conversationId, senderId, recipientId, content, messageType = 'text' } = params;

  try {
    const res = await fetchWithRetry(getApiUrl('/api/chat/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        senderId,
        recipientId,
        content: content.trim(),
        messageType,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.message) {
        appendCachedMessage(conversationId, json.message);
        return { success: true, message: json.message };
      }
      return { success: false, error: json.error || 'Failed to send message' };
    }
  } catch (err: any) {
    console.warn('[ChatRealtime] API send failed, trying direct Supabase:', err);
  }

  // Direct Supabase fallback
  try {
    const newMessage = {
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_id: recipientId,
      content: content.trim(),
      message_type: messageType,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage)
      .select('id, conversation_id, sender_id, recipient_id, content, message_type, read_at, created_at')
      .single();

    if (!error && data) {
      const msg = data as ChatMessage;
      appendCachedMessage(conversationId, msg);

      // Fire-and-forget update conversation last_message
      Promise.resolve(
        supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.trim().substring(0, 100),
          })
          .eq('id', conversationId)
      ).catch(() => {});

      return { success: true, message: msg };
    }
    return { success: false, error: error?.message || 'Direct Supabase insert failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error sending message' };
  }
}

/**
 * Starts or retrieves an existing 1-on-1 conversation between two scholars.
 */
export async function getOrCreateConversation(
  userId: string,
  targetUserId: string
): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
  try {
    const res = await fetchWithRetry(getApiUrl('/api/chat/conversations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetUserId }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.conversation) {
        return { success: true, conversation: json.conversation };
      }
      return { success: false, error: json.error || 'Could not open conversation' };
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson?.error) {
        return { success: false, error: errJson.error };
      }
    }
  } catch (err) {
    console.warn('[ChatRealtime] API conversation lookup failed, trying direct Supabase:', err);
  }

  // Direct Supabase lookup (minimal columns)
  try {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, last_message_preview, created_at')
      .or(`and(participant_a.eq.${userId},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${userId})`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: true, conversation: existing as Conversation };
    }

    // Create fresh
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        participant_a: userId,
        participant_b: targetUserId,
        last_message_preview: 'Conversation started',
      })
      .select('id, participant_a, participant_b, last_message_at, last_message_preview, created_at')
      .single();

    if (!error && created) {
      return { success: true, conversation: created as Conversation };
    }
    return { success: false, error: error?.message || 'Failed to start conversation' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error opening conversation' };
  }
}

/**
 * Blocks another user (Safety & App Store UGC Requirement).
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithRetry(getApiUrl('/api/chat/block'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockerId, blockedId, action: 'block' }),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: json.success, error: json.error };
    }
  } catch {
    // direct fallback
  }

  try {
    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });
    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Submits a UGC report against a user or message (App Store UGC Requirement).
 */
export async function reportUserOrMessage(params: {
  reporterId: string;
  reportedUserId: string;
  messageId?: string | null;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithRetry(getApiUrl('/api/chat/report'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: json.success, error: json.error };
    }
  } catch {
    // direct fallback
  }

  try {
    const { error } = await supabase.from('user_reports').insert({
      reporter_id: params.reporterId,
      reported_user_id: params.reportedUserId,
      message_id: params.messageId || null,
      reason: params.reason,
    });
    return { success: !error, error: error?.message };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
