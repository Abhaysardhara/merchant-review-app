/**
 * analytics.ts
 *
 * Lightweight analytics logger backed by AsyncStorage.
 * Tracks per-branch scan counts, 5-star redirects, and private feedbacks.
 * In production this would POST to your own analytics endpoint.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Branch, BranchAnalytics } from '../types';

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

/** Call this every time a customer scans a branch QR code. */
export async function logScan(branchId: string): Promise<void> {
  await mutateBranchAnalytics(branchId, (a) => ({
    ...a,
    totalScans: a.totalScans + 1,
    lastScanAt: new Date().toISOString(),
  }));
}

/** Call this when a customer reaches the Google Maps redirect step (4 or 5 stars). */
export async function logFiveStarRedirect(branchId: string): Promise<void> {
  await mutateBranchAnalytics(branchId, (a) => ({
    ...a,
    fiveStarRedirects: a.fiveStarRedirects + 1,
  }));
}

/** Call this when a customer submits private (1–3 star) feedback. */
export async function logPrivateFeedback(branchId: string): Promise<void> {
  await mutateBranchAnalytics(branchId, (a) => ({
    ...a,
    privateFeedbacks: a.privateFeedbacks + 1,
  }));
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
    fiveStarRedirects: 0,
    privateFeedbacks: 0,
  };
}

export function conversionRate(analytics: BranchAnalytics): string {
  if (analytics.totalScans === 0) return '0%';
  const rate = (analytics.fiveStarRedirects / analytics.totalScans) * 100;
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
