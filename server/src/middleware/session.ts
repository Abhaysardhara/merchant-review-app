/**
 * Short-lived signed session tokens for the customer review page.
 *
 * The page asks for a token once (POST /api/v1/session) for one branch.
 * Every other customer-facing call must carry it, so the API can only be
 * used for real branches and each event is counted once per session.
 */

import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { SESSION_SECRET, SESSION_TTL_MS } from "../config";

export interface SessionPayload {
  sid: string; // session id
  uid: string; // merchant Firebase uid
  pid: string; // Google place id (branch id)
  bn: string; // business name
  exp: number; // expiry, unix ms
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export function createSessionToken(uid: string, pid: string, businessName: string): {
  token: string;
  payload: SessionPayload;
} {
  const payload: SessionPayload = {
    sid: crypto.randomUUID(),
    uid,
    pid,
    bn: businessName.slice(0, 100),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${body}.${sign(body)}`, payload };
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== "string" || token.length > 1024) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Requires a valid session token in the `X-Session-Token` header. */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const session = verifySessionToken(req.get("x-session-token"));
  if (!session) {
    res.status(401).json({ success: false, error: "Session expired. Please reload the page." });
    return;
  }
  res.locals.session = session;
  next();
}

/** Rejects requests whose :uid / :placeId don't belong to the session. */
export function requireSessionBranch(req: Request, res: Response, next: NextFunction): void {
  const session = res.locals.session as SessionPayload | undefined;
  const { uid, placeId } = req.params;
  if (!session || (uid && uid !== session.uid) || (placeId && placeId !== session.pid)) {
    res.status(403).json({ success: false, error: "Not allowed for this branch" });
    return;
  }
  next();
}

// ── Count each analytics event once per session ──────────────────────

const seenEvents = new Map<string, { exp: number; events: Set<string> }>();

/** Returns true the first time an event is seen for this session. */
export function markEventOnce(session: SessionPayload, event: string): boolean {
  let entry = seenEvents.get(session.sid);
  if (!entry) {
    entry = { exp: session.exp, events: new Set() };
    seenEvents.set(session.sid, entry);
  }
  if (entry.events.has(event)) return false;
  entry.events.add(event);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [sid, entry] of seenEvents) {
    if (entry.exp < now) seenEvents.delete(sid);
  }
}, 10 * 60 * 1000).unref();
