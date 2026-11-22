import { Router, type Request, type Response } from "express";
import { markEventOnce, requireSessionBranch, type SessionPayload } from "../middleware/session";
import { isAnalyticsEvent, recordAnalyticsEvent } from "../services/firestore";

export const analyticsRouter = Router();

/**
 * POST /api/v1/merchants/:uid/branches/:placeId/analytics
 * Requires a session token for this branch. Each event counts once per session.
 *
 * Body: { event: "qr_scan" | "link_visit" | "review_copied" }
 */
analyticsRouter.post(
  "/:uid/branches/:placeId/analytics",
  requireSessionBranch,
  async (req: Request, res: Response): Promise<void> => {
    const session = res.locals.session as SessionPayload;
    const event = req.body?.event;

    if (!isAnalyticsEvent(event)) {
      res.status(400).json({
        success: false,
        error: "Invalid event. Must be one of: qr_scan, link_visit, review_copied",
      });
      return;
    }

    // Repeats within the same session are accepted but not counted.
    if (!markEventOnce(session, event)) {
      res.json({ success: true });
      return;
    }

    try {
      await recordAnalyticsEvent(session.uid, session.pid, event);
    } catch (error) {
      console.error("[analytics] Firestore error:", error);
    }
    // Always 200 — analytics are best-effort
    res.json({ success: true });
  }
);
