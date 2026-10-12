import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyA_Lt5R04pq7VHqstCg8sNm2lpo-1dRmO8',
  authDomain:        'review-reach-58103.firebaseapp.com',
  projectId:         'review-reach-58103',
  storageBucket:     'review-reach-58103.firebasestorage.app',
  messagingSenderId: '533006527655',
  appId:             '1:533006527655:web:5e32d0e6eeab7bb53aff82',
};

// Prevent re-initialization during Expo hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

// ─────────────────────────────────────────────
//  Branch config stored per placeId
// ─────────────────────────────────────────────

export interface BranchConfig {
  tone:         string;
  keywords:     string;
  businessName: string;
}

/** Write (or overwrite) a branch config doc keyed by placeId */
export async function saveBranchConfig(
  placeId: string,
  config: BranchConfig,
): Promise<void> {
  await setDoc(
    doc(db, 'branches', placeId),
    { ...config, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Remove the branch config doc when merchant deletes a branch */
export async function deleteBranchConfig(placeId: string): Promise<void> {
  await deleteDoc(doc(db, 'branches', placeId));
}

// ─────────────────────────────────────────────
//  Branch analytics — read live counts from Firestore
// ─────────────────────────────────────────────

export interface FirestoreAnalytics {
  totalScans: number;
  linkVisits: number;
  reviewsCopied: number;
  lastScanAt?: string; // ISO string
}

// ─────────────────────────────────────────────
//  Daily timeseries — subcollection branches/{placeId}/daily/{YYYY-MM-DD}
// ─────────────────────────────────────────────

export interface DailyStat {
  date: string;       // YYYY-MM-DD
  scans: number;      // QR scans
  linkVisits: number; // Shared link visits
  copied: number;
}

/** Fetch daily stats for a branch (last `days` days, sorted ascending) */
export async function fetchDailyStats(placeId: string, days = 30): Promise<DailyStat[]> {
  try {
    const snap = await getDocs(collection(db, 'branches', placeId, 'daily'));
    const all: DailyStat[] = snap.docs.map((d) => ({
      date:       d.id,
      scans:      typeof d.data().scans      === 'number' ? d.data().scans      : 0,
      linkVisits: typeof d.data().linkVisits === 'number' ? d.data().linkVisits : 0,
      copied:     typeof d.data().copied     === 'number' ? d.data().copied     : 0,
    }));
    all.sort((a, b) => a.date.localeCompare(b.date));
    return all.slice(-days);
  } catch {
    return [];
  }
}

/** Fetch live analytics for a branch from Firestore */
export async function fetchBranchAnalytics(placeId: string): Promise<FirestoreAnalytics> {
  try {
    const snap = await getDoc(doc(db, 'branches', placeId));
    if (!snap.exists()) return { totalScans: 0, linkVisits: 0, reviewsCopied: 0 };
    const d = snap.data();
    return {
      totalScans:    typeof d.totalScans    === 'number' ? d.totalScans    : 0,
      linkVisits:    typeof d.linkVisits    === 'number' ? d.linkVisits    : 0,
      reviewsCopied: typeof d.reviewsCopied === 'number' ? d.reviewsCopied : 0,
      lastScanAt:    d.lastScanAt?.toDate?.()?.toISOString?.() ?? undefined,
    };
  } catch {
    return { totalScans: 0, linkVisits: 0, reviewsCopied: 0 };
  }
}
