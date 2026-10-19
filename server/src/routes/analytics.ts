import { Router, type Request, type Response } from "express";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "review-reach-58103";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export const analyticsRouter = Router();

type AnalyticsEvent = "qr_scan" | "link_visit" | "review_copied";

const EVENT_TRANSFORMS: Record<AnalyticsEvent, object[]> = {
  qr_scan: [
    { fieldPath: "totalScans", increment: { integerValue: "1" } },
    { fieldPath: "lastScanAt", setToServerValue: "REQUEST_TIME" },
  ],
  link_visit: [
    { fieldPath: "linkVisits", increment: { integerValue: "1" } },
  ],
  review_copied: [
    { fieldPath: "reviewsCopied", increment: { integerValue: "1" } },
  ],
};

/**
 * POST /api/v1/merchants/:uid/branches/:placeId/analytics
 * Writes atomic Firestore analytics increments. Keeps Firestore writes server-side.
 *
 * Body: { event: "qr_scan" | "link_visit" | "review_copied" }
 */
analyticsRouter.post(
  "/:uid/branches/:placeId/analytics",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const uid = String(req.params.uid);
      const placeId = String(req.params.placeId);
      const event = req.body?.event as AnalyticsEvent;

      if (!uid || !placeId) {
        res.status(400).json({ success: false, error: "Missing uid or placeId" });
        return;
      }

      const transforms = EVENT_TRANSFORMS[event];
      if (!transforms) {
        res.status(400).json({
          success: false,
          error: `Invalid event. Must be one of: ${Object.keys(EVENT_TRANSFORMS).join(", ")}`,
        });
        return;
      }

      const docPath = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/branches/${encodeURIComponent(placeId)}`;

      const response = await fetch(`${FIRESTORE_BASE}:commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [
            {
              transform: {
                document: docPath,
                fieldTransforms: transforms,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("[analytics] Firestore error:", response.status, errBody);
      }

      // Always return 200 — analytics are best-effort
      res.json({ success: true });
    } catch (error: any) {
      console.error("[analytics] Error:", error);
      // Best-effort — don't fail the user experience
      res.json({ success: true });
    }
  }
);
