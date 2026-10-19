import { Router, type Request, type Response } from "express";
import { getMerchantBranch } from "../services/firestore";

export const branchesRouter = Router();

/**
 * GET /api/v1/merchants/:uid/branches/:placeId
 * Returns branch config (tone, keywords, businessName) for the given merchant.
 */
branchesRouter.get(
  "/:uid/branches/:placeId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const uid = String(req.params.uid);
      const placeId = String(req.params.placeId);

      if (!uid || !placeId) {
        res.status(400).json({ success: false, error: "Missing uid or placeId" });
        return;
      }

      const branch = await getMerchantBranch(uid, placeId);
      if (!branch) {
        res.status(404).json({ success: false, error: "Branch not found" });
        return;
      }

      res.json({
        success: true,
        data: {
          tone: branch.tone,
          keywords: branch.keywords,
          businessName: branch.businessName,
        },
      });
    } catch (error: any) {
      console.error("[branches] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
