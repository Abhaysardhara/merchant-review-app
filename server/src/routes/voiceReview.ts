import { Router, type Request, type Response } from "express";
import multer from "multer";
import { transcribeAudio } from "../services/deepgram";
import { generateReview } from "../services/gemini";
import { getMerchantBranch } from "../services/firestore";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

export const voiceReviewRouter = Router();

/**
 * POST /api/v1/merchants/:merchantId/voice-review
 *
 * Accepts multipart FormData with an `audio` file.
 * 1. Transcribes speech via Deepgram nova-3
 * 2. Generates a polished 5-star Google review via Gemini
 * 3. Returns the review text, detected language, and Google review URL
 */
voiceReviewRouter.post(
  "/:merchantId/voice-review",
  upload.single("audio"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const merchantId = String(req.params.merchantId);

      // --- Validate audio file ---
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "Missing required `audio` file in form data",
        });
        return;
      }

      // --- Optional: branchId from query/body to look up merchant keywords ---
      const branchId = String(
        req.query.branchId || req.body?.branchId || ""
      );

      // --- Fetch merchant branch data for keywords & context ---
      let merchantKeywords = "";
      let merchantTone = "";
      let businessName = "";
      let googlePlaceId = "";

      if (branchId) {
        const branch = await getMerchantBranch(merchantId, branchId);
        if (branch) {
          merchantKeywords = branch.keywords || "";
          merchantTone = branch.tone || "";
          businessName = branch.businessName || branch.name || "";
          googlePlaceId = branch.placeId || "";
        }
      }

      // --- Step 1: Deepgram STT ---
      const { transcript, detectedLanguage } = await transcribeAudio(
        req.file.buffer,
        req.file.mimetype
      );

      if (!transcript || transcript.trim().length === 0) {
        res.status(422).json({
          success: false,
          error: "Could not transcribe audio — no speech detected",
        });
        return;
      }

      // --- Step 2: Gemini review generation ---
      const reviewText = await generateReview({
        transcript,
        detectedLanguage,
        merchantKeywords,
        merchantTone,
        businessName,
      });

      // --- Step 3: Build Google review URL ---
      const googleReviewUrl = googlePlaceId
        ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
        : "";

      res.status(200).json({
        success: true,
        data: {
          reviewText,
          detectedLanguage,
          googleReviewUrl,
        },
      });
    } catch (error: any) {
      console.error("[voice-review] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  }
);
