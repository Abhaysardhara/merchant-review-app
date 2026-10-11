/**
 * mapsResolver.ts
 *
 * Resolves Google Place IDs using the real Places API (Find Place from Text).
 * Falls back to a deterministic pseudo-ID when no API key is configured.
 *
 * API used: https://developers.google.com/maps/documentation/places/web-service/search-find-place
 */

import { GOOGLE_MAPS_API_KEY } from '../config';

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
//  Google Places API — Find Place from Text
//  https://developers.google.com/maps/documentation/places/web-service/search-find-place
// ─────────────────────────────────────────────

interface PlacesApiResult {
  candidates: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
  }>;
  status: string;
  error_message?: string;
}

async function fetchPlaceIdFromApi(
  placeName: string,
  timeoutMs = 6000,
): Promise<{ placeId: string; name: string } | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // ── Try Places API (New) first — uses places.googleapis.com ──────
    // Billed under "Text Search (New)" — compatible with new API keys
    const newApiUrl = 'https://places.googleapis.com/v1/places:searchText';
    const newRes = await fetch(newApiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        // Only request the 3 fields we need — minimises billing
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
      },
      body: JSON.stringify({ textQuery: placeName, maxResultCount: 1 }),
    });

    if (newRes.ok) {
      const newData = await newRes.json() as {
        places?: Array<{
          id: string;
          displayName?: { text: string };
          location?: { latitude: number; longitude: number };
        }>;
      };
      if (newData.places?.length) {
        clearTimeout(timer);
        return {
          placeId: newData.places[0].id,
          name: newData.places[0].displayName?.text ?? placeName,
        };
      }
    }

    // ── Fallback: legacy Places API ───────────────────────────────────
    const params = new URLSearchParams({
      input: placeName,
      inputtype: 'textquery',
      fields: 'place_id,name',
      key: GOOGLE_MAPS_API_KEY,
    });
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params.toString()}`;
    const legacyRes = await fetch(legacyUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!legacyRes.ok) return null;
    const data: PlacesApiResult = await legacyRes.json();
    if (data.status === 'OK' && data.candidates.length > 0) {
      return { placeId: data.candidates[0].place_id, name: data.candidates[0].name };
    }
    return null;
  } catch {
    clearTimeout(timer);
    return null;
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
