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
 * Resolves the backend base URL for API requests (e.g. /api/leakcheck, /api/virustotal)
 */
export const getBackendBaseUrl = (): string => {
  // Check explicit environment variable override first
  const envBackendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_VERCEL_URL;
  if (envBackendUrl && typeof envBackendUrl === 'string' && envBackendUrl.trim() !== '') {
    const trimmed = envBackendUrl.trim();
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  // If running inside native Android Capacitor app:
  // Relative paths like '/api/leakcheck' resolve to http://localhost/ on mobile which fails.
  // Must use the deployed Vercel production server.
  if (isNativeAndroid()) {
    return DEFAULT_PRODUCTION_BACKEND_URL;
  }

  // If running in a web browser on Vercel or custom domain:
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
