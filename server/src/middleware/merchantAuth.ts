/**
 * Merchant authentication: verifies the Firebase ID token the merchant app
 * sends as `Authorization: Bearer <token>`.
 */

import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { adminApp } from "../services/firebaseAdmin";

export async function requireMerchant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ success: false, error: "Please sign in again." });
    return;
  }

  try {
    const decoded = await getAuth(adminApp()).verifyIdToken(token);
    res.locals.merchantUid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Please sign in again." });
  }
}
