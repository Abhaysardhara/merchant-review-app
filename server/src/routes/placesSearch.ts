import { Router, type Request, type Response } from "express";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export const placesSearchRouter = Router();

/**
 * POST /api/v1/places/search
 * Shop search for the merchant app (Places API New, Text Search).
 * Requires a signed-in merchant; keeps the Places key on the server.
 *
 * Body: { query: string, maxResults?: 1-6, languageCode?: string }
 * Returns: { places: [{ placeId, name, address, location }] }
 */
placesSearchRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const { query, maxResults, languageCode } = req.body || {};

  if (typeof query !== "string" || !query.trim() || query.length > 200) {
    res.status(400).json({ success: false, error: "query is required (max 200 characters)" });
    return;
  }
  const count = Number.isInteger(maxResults) ? Math.min(Math.max(maxResults, 1), 6) : 6;
  const lang =
    typeof languageCode === "string" && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(languageCode)
      ? languageCode
      : "en";

  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "your_google_maps_api_key") {
    res.status(503).json({ success: false, error: "Places API not configured" });
    return;
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: query.trim(), maxResultCount: count, languageCode: lang }),
    });

    const data = (await response.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("[places-search] Google error:", response.status, data.error?.message);
      res.status(502).json({ success: false, error: "Search failed. Please try again." });
      return;
    }

    const places = (data.places ?? []).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      location: p.location ?? null,
    }));
    res.json({ success: true, data: { places } });
  } catch (error) {
    console.error("[places-search] Error:", error);
    res.status(502).json({ success: false, error: "Search failed. Please try again." });
  }
});
