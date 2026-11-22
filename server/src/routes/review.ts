import { Router, type Request, type Response } from "express";
import type { SessionPayload } from "../middleware/session";
import { budgetExceeded, consumeBudget } from "../middleware/limits";
import { cleanVoiceTranscript, generateStarDraft, generateStarDraftSet } from "../services/gemini";

export const reviewRouter = Router();

const MAX_TRANSCRIPT_CHARS = 1000;

// ── Star-draft sets, cached per branch + language ───────────────────
// A few variants are kept so customers don't all copy the same sentence;
// most page loads are served from cache at no AI cost.
const DRAFT_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_VARIANTS = 4;
const draftCache = new Map<string, { at: number; drafts: string[] }[]>();

function cachedSets(key: string) {
  const now = Date.now();
  const sets = (draftCache.get(key) || []).filter((s) => now - s.at < DRAFT_TTL_MS);
  draftCache.set(key, sets);
  return sets;
}

/**
 * GET /api/v1/review/drafts?lang=hi
 * Requires a session token. Returns one short draft per star rating:
 * { drafts: [1★, 2★, 3★, 4★, 5★] }
 */
reviewRouter.get("/drafts", async (req: Request, res: Response): Promise<void> => {
  const session = res.locals.session as SessionPayload;
  const lang = req.query.lang;
  if (!isLang(lang)) {
    res.status(400).json({ success: false, error: "Invalid lang" });
    return;
  }

  const key = `${session.pid}:${lang}`;
  const sets = cachedSets(key);
  const wantNew = sets.length < MAX_VARIANTS && (sets.length === 0 || Math.random() < 0.35);

  if (wantNew && consumeBudget("ai", session.pid)) {
    try {
      const drafts = await generateStarDraftSet({ lang, businessName: session.bn });
      sets.push({ at: Date.now(), drafts });
      res.json({ success: true, data: { drafts } });
      return;
    } catch (error) {
      console.error("[review] Draft set error:", error);
    }
  }

  if (sets.length) {
    const pick = sets[Math.floor(Math.random() * sets.length)];
    res.json({ success: true, data: { drafts: pick.drafts } });
    return;
  }
  res.status(503).json({ success: false, error: "Drafts unavailable. You can write your own review." });
});

function isLang(lang: unknown): lang is string {
  return typeof lang === "string" && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang);
}

function isStars(stars: unknown): stars is number {
  return Number.isInteger(stars) && (stars as number) >= 1 && (stars as number) <= 5;
}

/**
 * POST /api/v1/review/generate
 * Requires a session token. The server builds every prompt.
 *
 * Body (star draft):  { mode: "draft", stars: 1-5, lang }
 * Body (voice):       { mode: "voice", transcript, lang, stars?: 1-5 }
 */
reviewRouter.post(
  "/generate",
  async (req: Request, res: Response): Promise<void> => {
    const session = res.locals.session as SessionPayload;
    const { mode, stars, transcript, lang } = req.body || {};

    if (!isLang(lang)) {
      res.status(400).json({ success: false, error: "Invalid lang" });
      return;
    }

    if (mode === "draft") {
      if (!isStars(stars)) {
        res.status(400).json({ success: false, error: "stars must be 1-5" });
        return;
      }
    } else if (mode === "voice") {
      if (typeof transcript !== "string" || !transcript.trim()) {
        res.status(400).json({ success: false, error: "Missing transcript" });
        return;
      }
      if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        res.status(400).json({ success: false, error: "Transcript too long" });
        return;
      }
      if (stars !== undefined && stars !== null && !isStars(stars)) {
        res.status(400).json({ success: false, error: "stars must be 1-5" });
        return;
      }
    } else {
      res.status(400).json({ success: false, error: 'mode must be "draft" or "voice"' });
      return;
    }

    if (!consumeBudget("ai", session.pid)) {
      res.status(429).json(budgetExceeded);
      return;
    }

    try {
      const text =
        mode === "draft"
          ? await generateStarDraft({ stars, lang, businessName: session.bn })
          : await cleanVoiceTranscript({
              transcript: transcript.trim(),
              lang,
              businessName: session.bn,
              stars: isStars(stars) ? stars : undefined,
            });
      res.json({ success: true, data: { text } });
    } catch (error) {
      console.error("[review] Gemini error:", error);
      res.status(502).json({ success: false, error: "Could not create a draft. Please try again." });
    }
  }
);
