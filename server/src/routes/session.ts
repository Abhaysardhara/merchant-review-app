import { Router, type Request, type Response } from "express";
import { createSessionToken } from "../middleware/session";
import { getMerchantBranch, isValidDocId } from "../services/firestore";

export const sessionRouter = Router();

/**
 * POST /api/v1/session
 * Starts a customer session for one real branch.
 *
 * Body: { uid: string, placeId: string }
 * Returns: { token, expiresAt, businessName, buttons }
 */
sessionRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, placeId } = req.body || {};
    if (!isValidDocId(uid) || !isValidDocId(placeId)) {
      res.status(400).json({ success: false, error: "Invalid uid or placeId" });
      return;
    }

    const branch = await getMerchantBranch(uid, placeId);
    if (!branch) {
      res.status(404).json({ success: false, error: "Branch not found" });
      return;
    }

    const businessName = branch.businessName || branch.name;
    const { token, payload } = createSessionToken(uid, placeId, businessName);
    const buttons = branch.buttons
      .filter((b) => b.enabled)
      .sort((a, b) => a.order - b.order)
      .map(({ id, kind, emoji, labels }) => ({ id, kind, emoji, labels }));
    res.json({
      success: true,
      data: { token, expiresAt: payload.exp, businessName, buttons },
    });
  } catch (error) {
    console.error("[session] Error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
