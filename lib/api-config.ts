/**
 * StatXam Remote API Configuration
 * 
 * CRITICAL NATIVE CONSTRAINT:
 * Inside the Capacitor native shell, the webview runs at `capacitor://localhost` (or `http://localhost`).
 * Relative `/api/...` fetches will fail. Every network call MUST use an absolute URL
 * pointing to the remote Vercel production deployment: https://statxamp.vercel.app
 */

export const REMOTE_BASE_URL = 'https://statxamp.vercel.app';

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${REMOTE_BASE_URL}${cleanEndpoint}`;
}

export async function fetchRemoteApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const fullUrl = apiUrl(endpoint);
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { data: null, error: `Remote API error (${res.status}): ${errorText}` };
    }

    const json = (await res.json()) as T;
    return { data: json, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network transport failure' };
  }
}
