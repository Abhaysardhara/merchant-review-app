import { Router, type Request, type Response } from "express";
import { verifySessionToken } from "../middleware/session";
import { addDailyCounts } from "../services/firestore";

export const eventsRouter = Router();

/** Event names the review page may send (counted per branch per day). */
const ALLOWED = new Set([
  "scan_landed_qr", "scan_landed_link", "scan_landed_direct", "in_app_browser",
  "lang_en", "lang_hi", "lang_switched",
  "star_tapped_1", "star_tapped_2", "star_tapped_3", "star_tapped_4", "star_tapped_5",
  "star_changed", "stay_tapped", "details_opened",
  "voice_started", "voice_completed", "voice_failed",
  "clipboard_ok", "clipboard_fail",
  "google_tap", "google_not_opened",
  "webview_escape_shown", "webview_escape_tapped",
  "returned_lt30s", "returned_lt2m", "returned_gt2m", "copy_again_tapped",
  "private_feedback_opened", "private_feedback_submitted",
]);

/** "btn_<id>": a button the customer picked in a copied review (merchant's liked/unhappy counts). */
const BUTTON_EVENT = /^btn_[a-f0-9]{6}$/;

const MAX_EVENTS_PER_REQUEST = 30;
const MAX_EVENTS_PER_SESSION = 200;
const sessionCounts = new Map<string, { exp: number; n: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [sid, v] of sessionCounts) if (v.exp < now) sessionCounts.delete(sid);
}, 10 * 60 * 1000).unref();

/**
 * POST /api/v1/events
 * Sent with navigator.sendBeacon, so the body is text: {"t": token, "e": ["event", ...]}.
 * The session token is in the body because sendBeacon can't set headers.
 */
eventsRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  let body: { t?: unknown; e?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    res.status(400).json({ success: false, error: "Invalid body" });
    return;
  }

  const session = verifySessionToken(typeof body.t === "string" ? body.t : null);
  if (!session) {
    res.status(401).json({ success: false, error: "Session expired" });
    return;
  }
  if (!Array.isArray(body.e)) {
    res.status(400).json({ success: false, error: "e must be an array" });
    return;
  }

  const used = sessionCounts.get(session.sid) || { exp: session.exp, n: 0 };
  const room = Math.max(0, MAX_EVENTS_PER_SESSION - used.n);
  const events = body.e
    .slice(0, Math.min(MAX_EVENTS_PER_REQUEST, room))
    .filter((e): e is string => typeof e === "string" && (ALLOWED.has(e) || BUTTON_EVENT.test(e)));
  used.n += events.length;
  sessionCounts.set(session.sid, used);

  if (events.length) {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e] = (counts[e] || 0) + 1;
    try {
      await addDailyCounts(session.uid, session.pid, counts);
    } catch (error) {
      console.error("[events] Firestore error:", error);
    }
  }
  // Always 204 — analytics are best-effort
  res.status(204).end();
});
