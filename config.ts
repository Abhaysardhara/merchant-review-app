/**
 * config.ts
 */
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

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
