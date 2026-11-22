/**
 * config.ts
 *
 * The Google Maps key is only used for the native map (injected by
 * app.config.js). Places search goes through our backend.
 */

/** ReviewReach backend (keeps the Places key server-side). */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://merchant-review-app.onrender.com';

// ── Google OAuth — get from Google Cloud Console → APIs & Services → Credentials
// Android: OAuth 2.0 Client ID (type: Android)
// iOS:     OAuth 2.0 Client ID (type: iOS)
// Web:     OAuth 2.0 Client ID (type: Web application) — also used as Firebase Web client ID
export const GOOGLE_WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? '';
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
export const GOOGLE_IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? '';

/**
 * URL where the customer-facing review web page is hosted.
 */
export const REVIEW_WEB_URL = 'https://abhaysardhara.github.io/merchant-review-app';
