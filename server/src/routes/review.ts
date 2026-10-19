import { Router, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

export const reviewRouter = Router();

/**
 * POST /api/v1/review/generate
 * Generates an AI review via Gemini. Keeps GEMINI_API_KEY server-side.
 *
 * Body: { systemInstruction: string, prompt: string }
 */
reviewRouter.post(
  "/generate",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { systemInstruction, prompt } = req.body;

      if (!prompt || typeof prompt !== "string") {
        res.status(400).json({ success: false, error: "Missing prompt" });
        return;
      }

      if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key") {
        res.status(503).json({ success: false, error: "Gemini API not configured" });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction:
            typeof systemInstruction === "string"
              ? systemInstruction
              : undefined,
          temperature: 1.1,
          maxOutputTokens: 320,
          topP: 0.95,
        },
      });

      const text = response.text;
      if (!text) {
        res.status(422).json({
          success: false,
          error: "Gemini returned an empty response",
        });
        return;
      }

      res.json({ success: true, data: { text: text.trim() } });
    } catch (error: any) {
      console.error("[review] Gemini error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Review generation failed",
      });
    }
  }
);
