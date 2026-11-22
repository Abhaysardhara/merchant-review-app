/**
 * Server configuration read from environment variables.
 */

import crypto from "node:crypto";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Browser origins allowed to call the API (comma-separated). */
export const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "https://abhaysardhara.github.io"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Secret used to sign customer session tokens. Must be set in production. */
export const SESSION_SECRET = (() => {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (IS_PRODUCTION) {
    throw new Error("SESSION_SECRET must be set (at least 32 characters)");
  }
  console.warn("[config] SESSION_SECRET not set — using a random dev secret");
  return crypto.randomBytes(32).toString("hex");
})();

export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Daily per-branch limits on paid AI calls. */
export const DAILY_AI_BUDGET_PER_BRANCH = Number(
  process.env.DAILY_AI_BUDGET_PER_BRANCH || 300
);
export const DAILY_VOICE_BUDGET_PER_BRANCH = Number(
  process.env.DAILY_VOICE_BUDGET_PER_BRANCH || 100
);

/** Longest voice recording we stream to Deepgram. */
export const MAX_VOICE_SECONDS = 120;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (!IS_PRODUCTION) {
    // Local development: localhost on any port, or a page opened from file://
    return /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === "null";
  }
  return false;
}
