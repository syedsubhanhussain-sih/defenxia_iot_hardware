import { Capacitor } from '@capacitor/core';

/**
 * Defenxia Centralized Backend & API Environment Configuration
 * 
 * Provides clean separation between Development and Production:
 * - Prevents Android mobile app from attempting to connect to localhost:3000
 * - Resolves production Vercel serverless functions when running inside native Android WebView
 * - Configures correct Google OAuth redirect URIs and deep links
 */

// Fallback production Vercel deployment URL
export const DEFAULT_PRODUCTION_BACKEND_URL = 'https://defenxia-iot-hardware.vercel.app';

export const isNativeAndroid = (): boolean => {
  return typeof window !== 'undefined' && 
         Capacitor.isNativePlatform() && 
         Capacitor.getPlatform() === 'android';
};

/**
 * Resolves the backend base URL for API requests (e.g. /lookup, /api/virustotal-scan)
 */
export const getBackendBaseUrl = (): string => {
  // Native Android app: the WebView has no useful origin, so point at the
  // deployed production backend. An explicit VITE_BACKEND_URL override wins
  // if set. NOTE: VITE_VERCEL_URL is deliberately NOT used — Vercel bakes the
  // deployment URL in at build time and it goes stale when old deployments
  // are pruned, silently redirecting API calls to a dead URL (this broke the
  // Data Breach + Website Scanner modules in production).
  if (isNativeAndroid()) {
    const envBackendUrl = import.meta.env.VITE_BACKEND_URL;
    if (envBackendUrl && typeof envBackendUrl === 'string' && envBackendUrl.trim() !== '') {
      const trimmed = envBackendUrl.trim();
      return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    }
    return DEFAULT_PRODUCTION_BACKEND_URL;
  }

  // Web browser: the backend is ALWAYS the same origin serving this page.
  // Never trust a build-time env var here for the same staleness reason.
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
      return window.location.origin;
    }
  }

  // Local development fallback (routes through Vite dev proxy)
  return '';
};

/**
 * Resolves the OAuth Redirect URL for Google Sign-In
 * Never points to localhost:3000 in mobile production.
 */
export const getOAuthRedirectUrl = (): string => {
  const customRedirect = import.meta.env.VITE_AUTH_REDIRECT_URL;
  if (customRedirect && typeof customRedirect === 'string' && customRedirect.trim() !== '') {
    return customRedirect.trim();
  }

  // In Native Android mobile app:
  if (isNativeAndroid()) {
    // Registered Android custom scheme in AndroidManifest.xml
    return 'defenxia://auth/callback';
  }

  // In Web browser (Vercel deployment):
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
  }

  // Local dev web fallback:
  return typeof window !== 'undefined' ? window.location.origin : '';
};

/**
 * Builds an absolute API endpoint URL that works reliably across both Web and Android
 */
export const buildApiUrl = (endpointPath: string): string => {
  const base = getBackendBaseUrl();
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};
