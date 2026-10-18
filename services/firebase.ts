import { initializeApp, getApps } from 'firebase/app';
import {
  // @ts-ignore — getReactNativePersistence is in the RN bundle; TSC sees browser types
  initializeAuth, getReactNativePersistence, getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  deleteUser,
  type User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Branch, BranchAnalytics } from '../types';

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

// initializeAuth with RN persistence — throws on hot-reload if called twice
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}
export { auth };

export const db = getFirestore(app);

// ─────────────────────────────────────────────
//  Auth helpers
// ─────────────────────────────────────────────

/** Sign in with an ID token obtained from expo-auth-session Google flow */
export async function signInWithGoogleCredential(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export async function signInAnonymously(): Promise<User> {
  const result = await firebaseSignInAnonymously(auth);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

/** Wipe all Firestore data (branches + feedback subcollections), then delete the
 *  Firebase Auth account.  Data is deleted first because Firestore security rules
 *  require an authenticated user — deleting auth first would block the writes. */
export async function deleteUserAccount(uid: string): Promise<void> {
  // 1. Delete all feedback docs under each branch, then the branch doc itself
  const branchSnap = await getDocs(collection(db, 'users', uid, 'branches'));
  for (const branchDoc of branchSnap.docs) {
    const feedbackSnap = await getDocs(
      collection(db, 'users', uid, 'branches', branchDoc.id, 'feedback'),
    );
    await Promise.all(feedbackSnap.docs.map((f) => deleteDoc(f.ref)));
    await deleteDoc(branchDoc.ref);
  }

  // 2. Delete the auth account last
  if (auth.currentUser) {
    await deleteUser(auth.currentUser);
  }
}

export type { User };

// ─────────────────────────────────────────────
//  User-scoped branch storage  users/{uid}/branches/{branchId}
// ─────────────────────────────────────────────

type BranchData = Omit<Branch, 'analytics'>;

/** Write (or overwrite) a branch doc under the user's collection.
 *  - Clears soft-delete flag so re-adding a branch restores its analytics.
 *  - Does NOT overwrite createdAt if the doc already has one (preserves original date). */
export async function saveUserBranch(uid: string, branch: BranchData): Promise<void> {
  // Strip id, createdAt (handled separately) and analytics
  // (Omit<Branch,'analytics'> is compile-time only — runtime still carries the field)
  const { id, createdAt, analytics: _drop, ...rest } = branch as Branch;
  const ref = doc(db, 'users', uid, 'branches', id);

  // Check if doc already exists to preserve its createdAt
  const existing = await getDoc(ref);
  const payload: Record<string, unknown> = {
    ...rest,
    deleted: false,
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists() || !existing.data().createdAt) {
    payload.createdAt = createdAt;
  }

  await setDoc(ref, payload, { merge: true });
}

/** Soft-delete a branch — marks deleted:true so analytics survive.
 *  loadUserBranches filters these out; re-adding the same placeId restores them. */
export async function deleteUserBranch(uid: string, branchId: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'branches', branchId),
    { deleted: true, deletedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Check if a branch doc exists and return its status: 'active' | 'inactive' | null */
export async function getBranchStatus(
  uid: string,
  placeId: string,
): Promise<{ status: 'active' | 'inactive'; data: Record<string, unknown> } | null> {
  const ref = doc(db, 'users', uid, 'branches', placeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return { status: data.deleted ? 'inactive' : 'active', data };
}

/** Load all branch docs for a user — config + analytics in one read.
 *  Soft-deleted docs (deleted: true) are excluded. */
export async function loadUserBranches(uid: string): Promise<Branch[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'branches'));
    return snap.docs
      .filter((d) => !d.data().deleted)
      .map((d) => {
        const data = d.data();
        const analytics: BranchAnalytics = {
          totalScans:    typeof data.totalScans    === 'number' ? data.totalScans    : 0,
          linkVisits:    typeof data.linkVisits    === 'number' ? data.linkVisits    : 0,
          reviewsCopied: typeof data.reviewsCopied === 'number' ? data.reviewsCopied : 0,
          lastScanAt:    data.lastScanAt?.toDate?.()?.toISOString?.() ?? undefined,
        };
        return {
          id:           d.id,
          name:         data.name         ?? '',
          businessName: data.businessName ?? '',
          address:      data.address      ?? '',
          placeId:      data.placeId      ?? '',
          googleMapsUrl:data.googleMapsUrl?? '',
          keywords:     data.keywords     ?? '',
          tone:         data.tone         ?? 'Friendly',
          createdAt:    data.createdAt    ?? new Date().toISOString(),
          analytics,
        };
      });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
//  Analytics
// ─────────────────────────────────────────────

export interface FirestoreAnalytics {
  totalScans: number;
  linkVisits: number;
  reviewsCopied: number;
  lastScanAt?: string;
}

// ─────────────────────────────────────────────
//  Mobile analytics — atomic increments via SDK
//  Used by the in-app customer flow (JSON QR path).
//  The web page flow uses Firestore REST transforms instead.
// ─────────────────────────────────────────────

/** Increment totalScans + set lastScanAt when a customer scans in the mobile app */
export async function incrementTotalScans(uid: string, placeId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid, 'branches', placeId),
      { totalScans: increment(1), lastScanAt: serverTimestamp() },
      { merge: true },
    );
  } catch { /* best-effort */ }
}

/** Increment reviewsCopied when a customer copies a review in the mobile app */
export async function incrementReviewsCopied(uid: string, placeId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid, 'branches', placeId),
      { reviewsCopied: increment(1) },
      { merge: true },
    );
  } catch { /* best-effort */ }
}

/** Save private (1-3 star) feedback under users/{uid}/branches/{placeId}/feedback/{id} */
export async function savePrivateFeedback(
  uid: string,
  placeId: string,
  data: { rating: number; comment: string; phone?: string; email?: string },
): Promise<void> {
  await addDoc(
    collection(db, 'users', uid, 'branches', placeId, 'feedback'),
    { ...data, createdAt: serverTimestamp() },
  );
}

// ─────────────────────────────────────────────
//  Private feedback — read
// ─────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  rating: number;
  comment: string;
  phone?: string;
  email?: string;
  createdAt: string; // ISO date string
}

/** Load all private feedback for a branch, newest first. */
export async function loadBranchFeedback(uid: string, placeId: string): Promise<FeedbackItem[]> {
  try {
    const q = query(
      collection(db, 'users', uid, 'branches', placeId, 'feedback'),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id:        d.id,
        rating:    typeof data.rating === 'number' ? data.rating : 0,
        comment:   data.comment ?? '',
        phone:     data.phone   ?? undefined,
        email:     data.email   ?? undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export async function fetchBranchAnalytics(uid: string, placeId: string): Promise<FirestoreAnalytics> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'branches', placeId));
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
