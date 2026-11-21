import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'wdrkjctckwvgezaqqzpp';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const PLACEHOLDER_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder_statxam_key';

export function getActiveSupabaseUrl(): string {
  if (typeof window !== 'undefined') {
    const adminUrl = localStorage.getItem('statxam_admin_supabase_url');
    if (adminUrl && adminUrl.trim().length > 0) return adminUrl.trim();
  }
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );
}

export function getActiveSupabaseAnonKey(): string {
  if (typeof window !== 'undefined') {
    const adminKey = localStorage.getItem('statxam_admin_supabase_key');
    if (adminKey && adminKey.trim().length > 10) return adminKey.trim();
  }
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    PLACEHOLDER_ANON_KEY
  );
}

export function setActiveSupabaseAnonKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('statxam_admin_supabase_key', key.trim());
    _cachedClient = null;
  }
}

export function setActiveSupabaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('statxam_admin_supabase_url', url.trim());
    _cachedClient = null;
  }
}

export const SUPABASE_URL = getActiveSupabaseUrl();
export const SUPABASE_ANON_KEY = getActiveSupabaseAnonKey();

let _cachedClient: SupabaseClient | null = null;
let _cachedKey = '';
let _cachedUrl = '';

export function getSupabaseClient(): SupabaseClient {
  const url = getActiveSupabaseUrl();
  const key = getActiveSupabaseAnonKey();
  if (!_cachedClient || _cachedKey !== key || _cachedUrl !== url) {
    _cachedKey = key;
    _cachedUrl = url;
    _cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _cachedClient;
}

// Proxied singleton for backward-compatible `supabase.from(...)` calls
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient() as any;
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Live test of a Supabase REST endpoint & API Key with latency measurement
 */
export async function testSupabaseConnection(url?: string, key?: string): Promise<{
  success: boolean;
  latencyMs: number;
  statusCode: number;
  error?: string;
}> {
  const targetUrl = (url || getActiveSupabaseUrl()).replace(/\/+$/, '');
  const targetKey = key || getActiveSupabaseAnonKey();
  const startTime = Date.now();

  try {
    // 1. Primary test against Supabase Auth Settings (canonical endpoint for anon key verification)
    const res = await fetch(`${targetUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: targetKey,
      },
    });
    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return { success: true, latencyMs, statusCode: res.status };
    }

    const errText = await res.text();
    if (errText.includes('service_role')) {
      return { success: true, latencyMs, statusCode: res.status };
    }

    return {
      success: false,
      latencyMs,
      statusCode: res.status,
      error: `Supabase HTTP ${res.status}: ${errText}`,
    };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      statusCode: 0,
      error: err?.message || 'Network error connecting to Supabase endpoint',
    };
  }
}
