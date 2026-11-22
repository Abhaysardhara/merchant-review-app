/**
 * Firestore access through the Firebase Admin SDK.
 *
 * The server is the only writer of customer analytics and private feedback,
 * so Firestore security rules can deny those writes from browsers.
 *
 * Credentials: set FIREBASE_SERVICE_ACCOUNT to the service-account JSON,
 * or GOOGLE_APPLICATION_CREDENTIALS to its file path.
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "review-reach-58103";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (db) return db;
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp({
      credential: json ? cert(JSON.parse(json)) : applicationDefault(),
      projectId: FIREBASE_PROJECT_ID,
    });
  }
  db = getFirestore();
  return db;
}

/** Firestore document ids we accept from the outside (no slashes). */
export function isValidDocId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_\-:]{1,200}$/.test(id);
}

export interface MerchantBranch {
  name: string;
  businessName: string;
  placeId: string;
}

/** Reads users/{uid}/branches/{placeId}. Returns null if it doesn't exist. */
export async function getMerchantBranch(
  uid: string,
  placeId: string
): Promise<MerchantBranch | null> {
  if (!isValidDocId(uid) || !isValidDocId(placeId)) return null;
  const snap = await firestore().doc(`users/${uid}/branches/${placeId}`).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  return {
    name: typeof data.name === "string" ? data.name : "",
    businessName: typeof data.businessName === "string" ? data.businessName : "",
    placeId: typeof data.placeId === "string" ? data.placeId : placeId,
  };
}

export type AnalyticsEvent = "qr_scan" | "link_visit" | "review_copied";

const EVENT_UPDATES: Record<AnalyticsEvent, () => Record<string, unknown>> = {
  qr_scan: () => ({
    totalScans: FieldValue.increment(1),
    lastScanAt: FieldValue.serverTimestamp(),
  }),
  link_visit: () => ({ linkVisits: FieldValue.increment(1) }),
  review_copied: () => ({ reviewsCopied: FieldValue.increment(1) }),
};

export function isAnalyticsEvent(event: unknown): event is AnalyticsEvent {
  return typeof event === "string" && Object.hasOwn(EVENT_UPDATES, event);
}

export async function recordAnalyticsEvent(
  uid: string,
  placeId: string,
  event: AnalyticsEvent
): Promise<void> {
  await firestore()
    .doc(`users/${uid}/branches/${placeId}`)
    .update(EVENT_UPDATES[event]());
}

export interface PrivateFeedbackInput {
  rating: number;
  comment: string;
  phone?: string;
  email?: string;
}

export async function addPrivateFeedback(
  uid: string,
  placeId: string,
  input: PrivateFeedbackInput
): Promise<void> {
  const doc: Record<string, unknown> = {
    rating: input.rating,
    comment: input.comment,
    createdAt: new Date(),
  };
  if (input.phone) doc.phone = input.phone;
  if (input.email) doc.email = input.email;
  await firestore().collection(`users/${uid}/branches/${placeId}/feedback`).add(doc);
}
