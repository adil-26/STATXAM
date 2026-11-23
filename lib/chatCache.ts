'use client';

import { Conversation, ChatMessage } from './types';

const INBOX_CACHE_KEY = 'statxam_chat_inbox_';
const THREAD_CACHE_KEY = 'statxam_chat_thread_';

// High-speed in-memory cache for instant (<50ms) view switching
const memoryInboxCache = new Map<string, Conversation[]>();
const memoryThreadCache = new Map<string, ChatMessage[]>();

/**
 * Retrieves cached conversation list for a user.
 * Checks memory first, then sessionStorage.
 */
export function getCachedConversations(userId: string): Conversation[] | null {
  if (memoryInboxCache.has(userId)) {
    return memoryInboxCache.get(userId)!;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${INBOX_CACHE_KEY}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryInboxCache.set(userId, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Stores conversation list in memory and sessionStorage.
 */
export function setCachedConversations(userId: string, conversations: Conversation[]): void {
  memoryInboxCache.set(userId, conversations);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${INBOX_CACHE_KEY}${userId}`, JSON.stringify(conversations));
  } catch {}
}

/**
 * Retrieves cached messages for a conversation.
 */
export function getCachedMessages(conversationId: string): ChatMessage[] | null {
  if (memoryThreadCache.has(conversationId)) {
    return memoryThreadCache.get(conversationId)!;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${THREAD_CACHE_KEY}${conversationId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryThreadCache.set(conversationId, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Stores messages in memory and sessionStorage (keeps latest 60 messages for optimal memory footprint).
 */
export function setCachedMessages(conversationId: string, messages: ChatMessage[]): void {
  const bounded = messages.slice(-60);
  memoryThreadCache.set(conversationId, bounded);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${THREAD_CACHE_KEY}${conversationId}`, JSON.stringify(bounded));
  } catch {}
}

/**
 * Optimistically appends a single message to the cache.
 */
export function appendCachedMessage(conversationId: string, message: ChatMessage): void {
  const current = getCachedMessages(conversationId) || [];
  const exists = current.some((m) => m.id === message.id);
  if (!exists) {
    const updated = [...current, message];
    setCachedMessages(conversationId, updated);
  }
}

/**
 * Returns timestamp of the latest cached message.
 */
export function getLastCachedMessageTimestamp(conversationId: string): string | null {
  const msgs = getCachedMessages(conversationId);
  if (!msgs || msgs.length === 0) return null;
  return msgs[msgs.length - 1].created_at || null;
}
