/**
 * analytics.ts
 *
 * Lightweight analytics logger backed by AsyncStorage.
 * Tracks per-branch scan counts, 5-star redirects, and private feedbacks.
 * In production this would POST to your own analytics endpoint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Branch, BranchAnalytics } from '../types';
import {
  incrementTotalScans,
  incrementReviewsCopied,
  savePrivateFeedback,
} from './firebase';

const BRANCHES_KEY = '@reviewreach:branches';
const PASSCODE_KEY = '@reviewreach:passcode';
const DEFAULT_PASSCODE = '1234';

// ─────────────────────────────────────────────
//  Branch persistence
// ─────────────────────────────────────────────

export async function loadBranches(): Promise<Branch[]> {
  try {
    const raw = await AsyncStorage.getItem(BRANCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Branch[];
  } catch {
    return [];
  }
}

export async function saveBranches(branches: Branch[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BRANCHES_KEY, JSON.stringify(branches));
  } catch {
    // Storage errors are non-fatal; in production you would log to crash reporter
  }
}

// ─────────────────────────────────────────────
//  Analytics mutation helpers
// ─────────────────────────────────────────────

async function mutateBranchAnalytics(
  branchId: string,
  mutate: (a: BranchAnalytics) => BranchAnalytics,
): Promise<void> {
  const branches = await loadBranches();
  const updated = branches.map((b) => {
    if (b.id !== branchId) return b;
    return { ...b, analytics: mutate(b.analytics) };
  });
  await saveBranches(updated);
}

/** Log a QR scan to Firestore. Call this from the in-app customer scanner. */
export async function logScan(uid: string, placeId: string): Promise<void> {
  await incrementTotalScans(uid, placeId);
}

/** Log a 5-star review copy to Firestore. Call this from ReviewEditorScreen. */
export async function logFiveStarRedirect(uid: string, placeId: string): Promise<void> {
  await incrementReviewsCopied(uid, placeId);
}

/** Save private (1-3 star) feedback to Firestore. Call this from PrivateFeedbackScreen. */
export async function logPrivateFeedback(
  uid: string,
  placeId: string,
  data: { rating: number; comment: string; phone?: string; email?: string },
): Promise<void> {
  await savePrivateFeedback(uid, placeId, data);
}

// ─────────────────────────────────────────────
//  Passcode helpers
// ─────────────────────────────────────────────

export async function loadPasscode(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(PASSCODE_KEY);
    return stored ?? DEFAULT_PASSCODE;
  } catch {
    return DEFAULT_PASSCODE;
  }
}

export async function savePasscode(passcode: string): Promise<void> {
  await AsyncStorage.setItem(PASSCODE_KEY, passcode);
}

export async function verifyPasscode(input: string): Promise<boolean> {
  const stored = await loadPasscode();
  return input === stored;
}

// ─────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([BRANCHES_KEY, PASSCODE_KEY]);
}

export function emptyAnalytics(): BranchAnalytics {
  return {
    totalScans: 0,
    linkVisits: 0,
    reviewsCopied: 0,
  };
}

export function conversionRate(analytics: BranchAnalytics): string {
  const total = analytics.totalScans + analytics.linkVisits;
  if (total === 0) return '—';
  const rate = (analytics.reviewsCopied / total) * 100;
  return `${rate.toFixed(1)}%`;
}

export function formatLastScan(isoDate?: string): string {
  if (!isoDate) return 'Never';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
