/**
 * mapsResolver.ts
 *
 * Resolves Google Place IDs with Places API (New) Text Search through the
 * ReviewReach backend. Falls back to a deterministic pseudo-ID when the
 * lookup fails.
 */

import { searchPlacesViaBackend } from './placesApi';

// ─────────────────────────────────────────────
//  URL → Place name extractor
// ─────────────────────────────────────────────

export function extractPlaceNameFromUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // /maps/place/<NAME>/  or  /maps/place/<NAME>/@
  const placeMatch = trimmed.match(/\/maps\/place\/([^/@?&#]+)/i);
  if (placeMatch?.[1]) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  // ?q=<NAME>  or  &q=<NAME>
  const qMatch = trimmed.match(/[?&]q=([^&#]+)/i);
  if (qMatch?.[1]) {
    return decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
  }

  // /search/<NAME>
  const searchMatch = trimmed.match(/\/search\/([^/@?&#]+)/i);
  if (searchMatch?.[1]) {
    return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
  }

  return null;
}

export function isShortUrl(url: string): boolean {
  return /goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url);
}

export function isGoogleMapsUrl(url: string): boolean {
  return /google\.(com|co\.[a-z]+)\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url);
}

// ─────────────────────────────────────────────
//  Short URL expander (with timeout)
// ─────────────────────────────────────────────

async function expandShortUrl(url: string, timeoutMs = 5000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    return res.url && res.url !== url ? res.url : url;
  } catch {
    clearTimeout(timer);
    return url;
  }
}

// ─────────────────────────────────────────────
//  Fallback: deterministic pseudo Place ID
// ─────────────────────────────────────────────

export function generatePlaceId(placeName: string): string {
  const normalized = placeName.toLowerCase().trim();
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  const a = hash.toString(36).toUpperCase().padStart(8, '0');
  const b = (hash ^ 0xdeadbeef).toString(36).toUpperCase().padStart(8, '0');
  const c = (hash ^ 0xcafebabe).toString(36).toUpperCase().padStart(8, '0');
  return `ChIJ${a}${b}${c}`;
}

// ─────────────────────────────────────────────
//  Places API (New) Text Search — via the ReviewReach backend
// ─────────────────────────────────────────────

async function fetchPlaceIdFromApi(
  placeName: string,
  timeoutMs = 6000,
): Promise<{ placeId: string; name: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const places = await searchPlacesViaBackend(placeName, {
      maxResults: 1,
      signal: controller.signal,
    });
    if (!places.length) return null;
    return { placeId: places[0].placeId, name: places[0].name || placeName };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────

export interface ResolveResult {
  placeName: string;
  placeId: string;
  /** true = real Google Place ID from API, false = deterministic fallback */
  isRealPlaceId: boolean;
}

/**
 * Main entry point.  Given any Google Maps URL (full or short):
 * 1. Expands short URLs
 * 2. Extracts place name
 * 3. Calls Google Places API if key is set → real Place ID
 * 4. Falls back to deterministic pseudo-ID otherwise
 *
 * Returns null only if the place name cannot be extracted AND no API lookup succeeds.
 */
export async function resolvePlaceFromUrlAsync(
  googleMapsUrl: string,
): Promise<ResolveResult | null> {
  let url = googleMapsUrl.trim();

  // Step 1 — expand short URLs (5s timeout)
  if (isShortUrl(url)) {
    url = await expandShortUrl(url, 5000);
  }

  // Step 2 — extract place name from URL
  const placeName = extractPlaceNameFromUrl(url);
  if (!placeName) return null;

  // Step 3 — try real Places API
  const apiResult = await fetchPlaceIdFromApi(placeName);
  if (apiResult) {
    return {
      placeName: apiResult.name,
      placeId: apiResult.placeId,
      isRealPlaceId: true,
    };
  }

  // Step 4 — fallback to deterministic pseudo-ID
  return {
    placeName,
    placeId: generatePlaceId(placeName),
    isRealPlaceId: false,
  };
}

/**
 * Resolves a place name string directly via the Places API.
 * Used when the user types a business name instead of pasting a URL.
 */
export async function resolvePlaceByName(
  placeName: string,
): Promise<ResolveResult | null> {
  if (!placeName.trim()) return null;

  const apiResult = await fetchPlaceIdFromApi(placeName);
  if (apiResult) {
    return {
      placeName: apiResult.name,
      placeId: apiResult.placeId,
      isRealPlaceId: true,
    };
  }

  return {
    placeName,
    placeId: generatePlaceId(placeName),
    isRealPlaceId: false,
  };
}

/** Synchronous parse — only works for full URLs, not short links. */
export function resolvePlaceFromUrl(googleMapsUrl: string): ResolveResult | null {
  const placeName = extractPlaceNameFromUrl(googleMapsUrl);
  if (!placeName) return null;
  return { placeName, placeId: generatePlaceId(placeName), isRealPlaceId: false };
}
