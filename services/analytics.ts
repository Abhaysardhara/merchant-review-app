/**
 * analytics.ts
 *
 * Analytics display helpers and local app storage.
 * Customer events (scans, link visits, copies, private feedback) are
 * written by the server only — see server/src/routes/analytics.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BranchAnalytics } from '../types';

const BRANCHES_KEY = '@reviewreach:branches';
const PASSCODE_KEY = '@reviewreach:passcode';
const DEFAULT_PASSCODE = '1234';

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
