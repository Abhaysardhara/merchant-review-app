/**
 * Abuse limits: per-IP rate limits and per-branch daily budgets for paid APIs.
 *
 * IP limits are generous because many customers share one IP
 * (shop Wi-Fi, mobile carrier NAT). Branch budgets cap the real cost.
 * Budgets are in memory and reset when the server restarts.
 */

import { rateLimit } from "express-rate-limit";
import { DAILY_AI_BUDGET_PER_BRANCH, DAILY_VOICE_BUDGET_PER_BRANCH } from "../config";

const tooMany = { success: false, error: "Too many requests. Please wait a minute and try again." };

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: tooMany,
  });
}

/** Every API request. */
export const generalLimiter = limiter(60 * 1000, 120);
/** Creating customer sessions. */
export const sessionLimiter = limiter(10 * 60 * 1000, 60);
/** AI review drafts. */
export const aiLimiter = limiter(60 * 1000, 20);
/** Google Places lookups. */
export const placesLimiter = limiter(60 * 1000, 30);
/** Review-page funnel events (batched). */
export const eventsLimiter = limiter(60 * 1000, 60);

/** Merchant shop search, per signed-in merchant (run after requireMerchant). */
export const merchantSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany,
  keyGenerator: (_req, res) => String(res.locals.merchantUid),
});
export const merchantSearchDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany,
  keyGenerator: (_req, res) => String(res.locals.merchantUid),
});

// ── Daily budgets per branch ─────────────────────────────────────────

type BudgetKind = "ai" | "voice";

const LIMITS: Record<BudgetKind, number> = {
  ai: DAILY_AI_BUDGET_PER_BRANCH,
  voice: DAILY_VOICE_BUDGET_PER_BRANCH,
};

const usage = new Map<string, number>();
let usageDay = today();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Uses one unit of a branch's daily budget. Returns false when it is used up. */
export function consumeBudget(kind: BudgetKind, placeId: string): boolean {
  const day = today();
  if (day !== usageDay) {
    usage.clear();
    usageDay = day;
  }
  const key = `${kind}:${placeId}`;
  const used = usage.get(key) || 0;
  if (used >= LIMITS[kind]) return false;
  usage.set(key, used + 1);
  return true;
}

export const budgetExceeded = {
  success: false,
  error: "This shop has reached today's limit. Please write your review yourself.",
};
