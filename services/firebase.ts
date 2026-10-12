import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  documentId,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  where,
  limit,
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

export interface HourlyStat {
  hour: string;       // YYYY-MM-DDTHH  e.g. "2026-10-12T14"
  scans: number;
  linkVisits: number;
  copied: number;
}

/** Fetch hourly stats — server-side filtered to [fromHour, toHour] inclusive */
export async function fetchHourlyStats(
  placeId: string,
  fromHour: string, // YYYY-MM-DDTHH
  toHour: string,
): Promise<HourlyStat[]> {
  try {
    const q = query(
      collection(db, 'branches', placeId, 'hourly'),
      where(documentId(), '>=', fromHour),
      where(documentId(), '<=', toHour),
      orderBy(documentId(), 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      hour:       d.id,
      scans:      typeof d.data().scans      === 'number' ? d.data().scans      : 0,
      linkVisits: typeof d.data().linkVisits === 'number' ? d.data().linkVisits : 0,
      copied:     typeof d.data().copied     === 'number' ? d.data().copied     : 0,
    }));
  } catch {
    return [];
  }
}

/** Fetch daily stats — server-side filtered to [fromDate, toDate] inclusive */
export async function fetchDailyStats(
  placeId: string,
  fromDate: string, // YYYY-MM-DD
  toDate: string,
): Promise<DailyStat[]> {
  try {
    const q = query(
      collection(db, 'branches', placeId, 'daily'),
      where(documentId(), '>=', fromDate),
      where(documentId(), '<=', toDate),
      orderBy(documentId(), 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      date:       d.id,
      scans:      typeof d.data().scans      === 'number' ? d.data().scans      : 0,
      linkVisits: typeof d.data().linkVisits === 'number' ? d.data().linkVisits : 0,
      copied:     typeof d.data().copied     === 'number' ? d.data().copied     : 0,
    }));
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
