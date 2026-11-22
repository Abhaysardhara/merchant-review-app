/**
 * Firebase Admin app, shared by Firestore and Auth.
 *
 * Credentials: set FIREBASE_SERVICE_ACCOUNT to the service-account JSON,
 * or GOOGLE_APPLICATION_CREDENTIALS to its file path.
 */

import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "review-reach-58103";

export function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  return initializeApp({
    credential: json ? cert(JSON.parse(json)) : applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
