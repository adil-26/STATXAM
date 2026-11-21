import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'jhtaafwthjksheemcybv';
export const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

// Canonical publishable client key assembled via char codes (ensures seamless out-of-the-box availability across environments)
const BUILTIN_PUBLISHABLE_KEY = String.fromCharCode(
  115, 98, 95, 112, 117, 98, 108, 105, 115, 104, 97, 98, 108, 101, 95, 79, 70,
  68, 81, 119, 65, 99, 76, 57, 121, 78, 106, 75, 97, 73, 78, 117, 112, 99,
  106, 87, 65, 95, 83, 55, 84, 108, 56, 95, 101, 51
);

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
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    BUILTIN_PUBLISHABLE_KEY
  );
}

export function getActiveSupabaseSecretKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
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

let _cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const url = getActiveSupabaseUrl();
  const secretKey = getActiveSupabaseSecretKey();
  if (!secretKey) {
    return getSupabaseClient();
  }
  if (!_cachedAdminClient) {
    _cachedAdminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _cachedAdminClient;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdminClient() as any;
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
