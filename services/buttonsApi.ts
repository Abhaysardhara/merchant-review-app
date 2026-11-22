/**
 * buttonsApi.ts
 *
 * Review buttons through the ReviewReach backend: the server reads the
 * shop's Google listing, asks the AI, and saves the buttons. The signed-in
 * merchant's Firebase ID token authorises each call.
 */

import { API_BASE_URL } from '../config';
import type { ReviewButton } from '../types';
import { auth } from './firebase';

async function post<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const idToken = await user.getIdToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean; data?: T; error?: string };
  if (!res.ok || !json.success || !json.data) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data;
}

function buttonsPath(uid: string, placeId: string, action: 'generate' | 'add') {
  return `/api/v1/merchants/${encodeURIComponent(uid)}/branches/${encodeURIComponent(placeId)}/buttons/${action}`;
}

/** Makes (or remakes) the shop's buttons from its Google listing and what the merchant sells. */
export async function generateButtons(uid: string, placeId: string, servicesSpoken?: string): Promise<ReviewButton[]> {
  const data = await post<{ buttons: ReviewButton[] }>(buttonsPath(uid, placeId, 'generate'), {
    servicesSpoken: servicesSpoken?.trim() || undefined,
  });
  return data.buttons;
}

/** Adds "what customers had" buttons from what the merchant said they sell. */
export async function addButtonsFromSpeech(
  uid: string,
  placeId: string,
  spoken: string,
): Promise<{ buttons: ReviewButton[]; addedIds: string[] }> {
  return post(buttonsPath(uid, placeId, 'add'), { spoken: spoken.trim() });
}
