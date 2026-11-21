/**
 * Resolves the absolute backend API endpoint URL.
 * When running inside a native Capacitor Android APK, the origin is http://localhost or capacitor://localhost,
 * so API calls must route to the live production server (https://statxam.vercel.app).
 * In regular web and local dev, relative URLs (/api/...) are preserved.
 */
export function getApiUrl(path: string): string {
  const isCapacitorDevice =
    typeof window !== 'undefined' &&
    (window.location.origin === 'http://localhost' ||
      window.location.origin === 'capacitor://localhost' ||
      window.location.protocol === 'capacitor:' ||
      Boolean((window as any)?.Capacitor?.isNativePlatform?.()));

  const backendUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (isCapacitorDevice ? 'https://statxam.vercel.app' : '');

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendUrl}${cleanPath}`;
}

export const apiUrl = getApiUrl;
