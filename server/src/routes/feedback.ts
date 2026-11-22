import { Router, type Request, type Response } from "express";
import { requireSessionBranch, type SessionPayload } from "../middleware/session";
import { addPrivateFeedback, type PrivateFeedbackInput } from "../services/firestore";

export const feedbackRouter = Router();

/**
 * POST /api/v1/merchants/:uid/branches/:placeId/feedback
 * Requires a session token for this branch.
 *
 * Body: { rating: 0-5, comment: string, phone?: string, email?: string, buttonIds?: string[] }
 */
feedbackRouter.post(
  "/:uid/branches/:placeId/feedback",
  requireSessionBranch,
  async (req: Request, res: Response): Promise<void> => {
    const session = res.locals.session as SessionPayload;
    const { rating, comment, phone, email, buttonIds } = req.body || {};

    if (typeof comment !== "string" || !comment.trim() || comment.length > 2000) {
      res.status(400).json({ success: false, error: "Comment is required (max 2,000 characters)" });
      return;
    }
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      res.status(400).json({ success: false, error: "Rating must be 0-5" });
      return;
    }

    const input: PrivateFeedbackInput = { rating, comment: comment.trim() };
    if (typeof phone === "string" && phone.trim()) input.phone = phone.trim().slice(0, 20);
    if (typeof email === "string" && email.trim()) input.email = email.trim().slice(0, 254);
    if (Array.isArray(buttonIds)) {
      input.buttonIds = buttonIds
        .filter((id: unknown): id is string => typeof id === "string" && /^[a-f0-9]{6}$/.test(id))
        .slice(0, 20);
    }

    try {
      await addPrivateFeedback(session.uid, session.pid, input);
      res.json({ success: true });
    } catch (error) {
      console.error("[feedback] Firestore error:", error);
      res.status(502).json({ success: false, error: "Could not send feedback. Please try again." });
    }
  }
);
