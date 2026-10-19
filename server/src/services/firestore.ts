/**
 * Firestore REST client for reading merchant branch data.
 * Uses the Firestore REST API to avoid pulling in the full Firebase SDK.
 */

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "review-reach-58103";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export interface MerchantBranch {
  name: string;
  businessName: string;
  placeId: string;
  keywords: string;
  tone: string;
}

/**
 * Reads a single branch document from users/{merchantId}/branches/{branchId}.
 * Returns null if the document doesn't exist.
 */
export async function getMerchantBranch(
  merchantId: string,
  branchId: string
): Promise<MerchantBranch | null> {
  const url = `${FIRESTORE_BASE}/users/${merchantId}/branches/${branchId}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    const errBody = await response.text().catch(() => "");
    console.error(
      `[firestore] Failed to fetch branch (HTTP ${response.status}):`,
      errBody
    );
    return null;
  }

  const doc = await response.json();
  const fields = doc.fields || {};

  return {
    name: fields.name?.stringValue || "",
    businessName: fields.businessName?.stringValue || "",
    placeId: fields.placeId?.stringValue || "",
    keywords: fields.keywords?.stringValue || "",
    tone: fields.tone?.stringValue || "",
  };
}
