/**
 * Firestore access through the Firebase Admin SDK.
 *
 * The server is the only writer of customer analytics and private feedback,
 * so Firestore security rules can deny those writes from browsers.
 */

import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { adminApp } from "./firebaseAdmin";

let db: Firestore | null = null;

function firestore(): Firestore {
  if (!db) db = getFirestore(adminApp());
  return db;
}

/** Firestore document ids we accept from the outside (no slashes). */
export function isValidDocId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_\-:]{1,200}$/.test(id);
}

/** Languages the review page shows buttons in. */
export const BUTTON_LANGS = ["en", "hi", "gu"] as const;
export type ButtonLang = (typeof BUTTON_LANGS)[number];

/** A tap-able button on the customer review page ("Biryani", "Long wait"). */
export interface ReviewButton {
  id: string;
  kind: "bought" | "good" | "improve";
  emoji: string;
  labels: Record<ButtonLang, string>;
  enabled: boolean;
  order: number;
  source: "ai" | "merchant";
}

export interface MerchantBranch {
  name: string;
  businessName: string;
  placeId: string;
  buttons: ReviewButton[];
}

function parseButtons(raw: unknown): ReviewButton[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is Record<string, any> => !!b && typeof b === "object")
    .filter((b) => typeof b.id === "string" && ["bought", "good", "improve"].includes(b.kind))
    .map((b) => ({
      id: b.id,
      kind: b.kind,
      emoji: typeof b.emoji === "string" ? b.emoji.slice(0, 8) : "",
      labels: {
        en: String(b.labels?.en ?? "").slice(0, 40),
        hi: String(b.labels?.hi ?? "").slice(0, 40),
        gu: String(b.labels?.gu ?? "").slice(0, 40),
      },
      enabled: b.enabled !== false,
      order: typeof b.order === "number" ? b.order : 0,
      source: b.source === "merchant" ? "merchant" : "ai",
    }));
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
  if (data.deleted === true) return null;
  return {
    name: typeof data.name === "string" ? data.name : "",
    businessName: typeof data.businessName === "string" ? data.businessName : "",
    placeId: typeof data.placeId === "string" ? data.placeId : placeId,
    buttons: parseButtons(data.buttons),
  };
}

/** Saves the branch's buttons (and, optionally, what the merchant said they sell). */
export async function saveBranchButtons(
  uid: string,
  placeId: string,
  buttons: ReviewButton[],
  servicesSpoken?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    buttons,
    buttonsGeneratedAt: FieldValue.serverTimestamp(),
  };
  if (servicesSpoken !== undefined) update.servicesSpoken = servicesSpoken;
  await firestore().doc(`users/${uid}/branches/${placeId}`).update(update);
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

/**
 * Adds event counts to users/{uid}/branches/{placeId}/stats/{YYYY-MM-DD}
 * (India date), e.g. { counts: { star_tapped_4: +1, clipboard_ok: +1 } }.
 */
export async function addDailyCounts(
  uid: string,
  placeId: string,
  counts: Record<string, number>
): Promise<void> {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const increments: Record<string, unknown> = {};
  for (const [key, n] of Object.entries(counts)) increments[key] = FieldValue.increment(n);
  await firestore()
    .doc(`users/${uid}/branches/${placeId}/stats/${day}`)
    .set({ day, counts: increments, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
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
