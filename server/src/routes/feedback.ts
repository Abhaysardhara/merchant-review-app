import { Router, type Request, type Response } from "express";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "review-reach-58103";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export const feedbackRouter = Router();

/**
 * POST /api/v1/merchants/:uid/branches/:placeId/feedback
 * Submits private customer feedback to Firestore.
 *
 * Body: { rating: number, comment: string, phone?: string, email?: string }
 */
feedbackRouter.post(
  "/:uid/branches/:placeId/feedback",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const uid = String(req.params.uid);
      const placeId = String(req.params.placeId);
      const { rating, comment, phone, email } = req.body;

      if (!uid || !placeId) {
        res.status(400).json({ success: false, error: "Missing uid or placeId" });
        return;
      }

      if (!comment || typeof comment !== "string" || !comment.trim()) {
        res.status(400).json({ success: false, error: "Comment is required" });
        return;
      }

      if (typeof rating !== "number" || rating < 0 || rating > 5) {
        res.status(400).json({ success: false, error: "Rating must be 0-5" });
        return;
      }

      const docFields: Record<string, object> = {
        rating: { integerValue: rating },
        comment: { stringValue: comment.trim() },
        createdAt: { timestampValue: new Date().toISOString() },
      };
      if (phone && typeof phone === "string") {
        docFields.phone = { stringValue: phone.trim() };
      }
      if (email && typeof email === "string") {
        docFields.email = { stringValue: email.trim() };
      }

      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid)}/branches/${encodeURIComponent(placeId)}/feedback`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: docFields }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("[feedback] Firestore error:", response.status, errBody);
      }

      // Always show success — feedback is best-effort
      res.json({ success: true });
    } catch (error: any) {
      console.error("[feedback] Error:", error);
      res.json({ success: true });
    }
  }
);
