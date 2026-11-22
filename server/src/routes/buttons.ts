import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { budgetExceeded, consumeBudget } from "../middleware/limits";
import {
  getMerchantBranch,
  saveBranchButtons,
  type ReviewButton,
} from "../services/firestore";
import { buttonsFromSpokenServices, generateShopButtons, type GeneratedButton } from "../services/gemini";
import { getPlaceSummary } from "../services/places";

/** Mounted at /api/v1/merchants/:uid/branches/:placeId/buttons (signed-in merchant only). */
export const buttonsRouter = Router({ mergeParams: true });

const KIND_ORDER = { bought: 0, good: 1, improve: 2 } as const;

function toReviewButtons(list: GeneratedButton[], source: ReviewButton["source"], startOrder: number): ReviewButton[] {
  return list.map((b, i) => ({
    id: crypto.randomBytes(3).toString("hex"),
    kind: b.kind,
    emoji: b.emoji,
    labels: { en: b.en, hi: b.hi, gu: b.gu },
    enabled: true,
    order: startOrder + i,
    source,
  }));
}

function sortButtons(buttons: ReviewButton[]): ReviewButton[] {
  return [...buttons]
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.order - b.order)
    .map((b, i) => ({ ...b, order: i }));
}

/** Loads the branch and checks the signed-in merchant owns it. */
async function ownedBranch(req: Request, res: Response) {
  const uid = String(req.params.uid);
  const placeId = String(req.params.placeId);
  if (res.locals.merchantUid !== uid) {
    res.status(403).json({ success: false, error: "Not your shop" });
    return null;
  }
  const branch = await getMerchantBranch(uid, placeId);
  if (!branch) {
    res.status(404).json({ success: false, error: "Shop not found" });
    return null;
  }
  return { uid, placeId, branch };
}

/**
 * POST .../buttons/generate
 * Creates the shop's buttons from its Google listing (+ what the merchant
 * said they sell). Replaces earlier AI buttons; keeps buttons the merchant added.
 * Body: { servicesSpoken?: string }
 */
buttonsRouter.post("/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const owned = await ownedBranch(req, res);
    if (!owned) return;
    const spoken = typeof req.body?.servicesSpoken === "string" ? req.body.servicesSpoken.trim().slice(0, 500) : "";

    if (!consumeBudget("ai", owned.placeId)) {
      res.status(429).json(budgetExceeded);
      return;
    }

    const place = await getPlaceSummary(owned.placeId);
    const generated = await generateShopButtons({
      name: place?.name || owned.branch.businessName || owned.branch.name,
      type: place?.type ?? "",
      summary: place?.summary ?? "",
      attributes: place?.attributes ?? [],
      reviewSnippets: place?.reviewSnippets ?? [],
      servicesSpoken: spoken || undefined,
    });

    const kept = owned.branch.buttons.filter((b) => b.source === "merchant");
    const buttons = sortButtons([...kept, ...toReviewButtons(generated, "ai", kept.length)]);
    await saveBranchButtons(owned.uid, owned.placeId, buttons, spoken || undefined);
    res.json({ success: true, data: { buttons } });
  } catch (error) {
    console.error("[buttons] generate error:", error);
    res.status(502).json({ success: false, error: "Could not create buttons. Please try again." });
  }
});

/**
 * POST .../buttons/add
 * Turns what the merchant said ("we make biryani and thali") into new
 * "what customers had" buttons and adds them.
 * Body: { spoken: string }
 */
buttonsRouter.post("/add", async (req: Request, res: Response): Promise<void> => {
  try {
    const owned = await ownedBranch(req, res);
    if (!owned) return;
    const spoken = typeof req.body?.spoken === "string" ? req.body.spoken.trim() : "";
    if (!spoken || spoken.length > 500) {
      res.status(400).json({ success: false, error: "Please say what you sell (max 500 characters)." });
      return;
    }

    if (!consumeBudget("ai", owned.placeId)) {
      res.status(429).json(budgetExceeded);
      return;
    }

    const place = await getPlaceSummary(owned.placeId);
    const generated = await buttonsFromSpokenServices({ spoken, shopType: place?.type ?? "" });

    const existing = new Set(owned.branch.buttons.map((b) => b.labels.en.toLowerCase()));
    const fresh = generated.filter((b) => !existing.has(b.en.toLowerCase()));
    const added = toReviewButtons(fresh, "merchant", owned.branch.buttons.length);
    const buttons = sortButtons([...owned.branch.buttons, ...added]);
    await saveBranchButtons(owned.uid, owned.placeId, buttons);
    res.json({ success: true, data: { buttons, addedIds: added.map((b) => b.id) } });
  } catch (error) {
    console.error("[buttons] add error:", error);
    res.status(502).json({ success: false, error: "Could not add buttons. Please try again." });
  }
});
