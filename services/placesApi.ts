/**
 * placesApi.ts
 *
 * Shop search through the ReviewReach backend (POST /api/v1/places/search).
 * The signed-in merchant's Firebase ID token authorises the call, so the
 * Places API key never ships inside the app.
 */

import { API_BASE_URL } from '../config';
import { auth } from './firebase';

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number } | null;
}

export async function searchPlacesViaBackend(
  query: string,
  options: { maxResults?: number; languageCode?: string; signal?: AbortSignal } = {},
): Promise<PlaceSearchResult[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE_URL}/api/v1/places/search`, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      query,
      maxResults: options.maxResults ?? 6,
      languageCode: options.languageCode ?? 'en',
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { places?: PlaceSearchResult[] };
    error?: string;
  };

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data?.places ?? [];
}
