/**
 * gbp.ts — Google Business Profile API service
 *
 * Handles OAuth token storage, account/location discovery,
 * review fetching, and reply posting.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GBP_TOKENS_KEY  = '@reviewreach:gbp_tokens';
const GBP_CACHE_KEY   = '@reviewreach:gbp_cache';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface GBPTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

export interface GBPAccount {
  name: string;       // "accounts/123456"
  accountName: string; // display name
  type: string;
}

export interface GBPLocation {
  name: string;       // "accounts/123/locations/456"
  title: string;      // business name
  placeId: string;
}

export interface GBPReview {
  name: string;          // "accounts/.../locations/.../reviews/abc"
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;   // ISO
  updateTime: string;   // ISO
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export interface GBPCache {
  accountName: string;                       // "accounts/123"
  locationMap: Record<string, string>;       // placeId → locationName
}

// ─────────────────────────────────────────────
//  Token management
// ─────────────────────────────────────────────

export async function saveGBPTokens(tokens: GBPTokens): Promise<void> {
  await AsyncStorage.setItem(GBP_TOKENS_KEY, JSON.stringify(tokens));
}

export async function loadGBPTokens(): Promise<GBPTokens | null> {
  try {
    const raw = await AsyncStorage.getItem(GBP_TOKENS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearGBPTokens(): Promise<void> {
  await AsyncStorage.multiRemove([GBP_TOKENS_KEY, GBP_CACHE_KEY]);
}

/** Refresh the access token using the stored refresh token */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
): Promise<GBPTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: [
      'grant_type=refresh_token',
      `refresh_token=${encodeURIComponent(refreshToken)}`,
      `client_id=${encodeURIComponent(clientId)}`,
    ].join('&'),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const data = await res.json();
  const tokens: GBPTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await saveGBPTokens(tokens);
  return tokens;
}

/** Get a valid access token — refreshes if expired */
export async function getValidToken(clientId: string): Promise<string | null> {
  const tokens = await loadGBPTokens();
  if (!tokens) return null;

  // If token expires in less than 5 minutes, refresh
  if (Date.now() > tokens.expiresAt - 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokens.refreshToken, clientId);
      return refreshed.accessToken;
    } catch {
      await clearGBPTokens();
      return null;
    }
  }
  return tokens.accessToken;
}

// ─────────────────────────────────────────────
//  Cache (account + location mapping)
// ─────────────────────────────────────────────

export async function saveGBPCache(cache: GBPCache): Promise<void> {
  await AsyncStorage.setItem(GBP_CACHE_KEY, JSON.stringify(cache));
}

export async function loadGBPCache(): Promise<GBPCache | null> {
  try {
    const raw = await AsyncStorage.getItem(GBP_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────
//  GBP API helpers
// ─────────────────────────────────────────────

async function gbpFetch(url: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GBP API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
//  Accounts & Locations
// ─────────────────────────────────────────────

export async function listAccounts(accessToken: string): Promise<GBPAccount[]> {
  const data = await gbpFetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    accessToken,
  );
  return (data.accounts ?? []).map((a: any) => ({
    name: a.name,
    accountName: a.accountName ?? '',
    type: a.type ?? '',
  }));
}

export async function listLocations(
  accessToken: string,
  accountName: string,
): Promise<GBPLocation[]> {
  const data = await gbpFetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,metadata`,
    accessToken,
  );
  return (data.locations ?? []).map((l: any) => ({
    name: l.name,
    title: l.title ?? '',
    placeId: l.metadata?.placeId ?? '',
  }));
}

/** Discover the merchant's GBP account and build a placeId→locationName map */
export async function discoverLocations(accessToken: string): Promise<GBPCache> {
  const accounts = await listAccounts(accessToken);
  if (!accounts.length) throw new Error('No Google Business Profile accounts found.');

  const locationMap: Record<string, string> = {};

  // Check all accounts (usually just 1)
  for (const account of accounts) {
    const locations = await listLocations(accessToken, account.name);
    for (const loc of locations) {
      if (loc.placeId) {
        locationMap[loc.placeId] = loc.name;
      }
    }
  }

  const cache: GBPCache = {
    accountName: accounts[0].name,
    locationMap,
  };
  await saveGBPCache(cache);
  return cache;
}

// ─────────────────────────────────────────────
//  Reviews
// ─────────────────────────────────────────────

function parseStarRating(rating: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };
  return map[rating] ?? 0;
}

export { parseStarRating };

export async function listReviews(
  accessToken: string,
  locationName: string,
  pageSize = 50,
  pageToken?: string,
): Promise<{ reviews: GBPReview[]; nextPageToken?: string; totalReviewCount?: number }> {
  let url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=${pageSize}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

  const data = await gbpFetch(url, accessToken);
  return {
    reviews: data.reviews ?? [],
    nextPageToken: data.nextPageToken,
    totalReviewCount: data.totalReviewCount,
  };
}

export async function replyToReview(
  accessToken: string,
  reviewName: string,
  comment: string,
): Promise<void> {
  await gbpFetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ comment }),
    },
  );
}

export async function deleteReply(
  accessToken: string,
  reviewName: string,
): Promise<void> {
  await gbpFetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    accessToken,
    { method: 'DELETE' },
  );
}
