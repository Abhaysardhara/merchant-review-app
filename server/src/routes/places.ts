import { Router, type Request, type Response } from "express";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const PLACE_FIELDS = [
  "displayName",
  "primaryType",
  "primaryTypeDisplayName",
  "types",
  "businessStatus",
  "formattedAddress",
  "shortFormattedAddress",
  "priceLevel",
  "priceRange",
  "rating",
  "userRatingCount",
  "editorialSummary",
  "generativeSummary",
  "reviewSummary",
  "reviews",
  "delivery",
  "dineIn",
  "takeout",
  "curbsidePickup",
  "reservable",
  "outdoorSeating",
  "liveMusic",
  "goodForWatchingSports",
  "servesBeer",
  "servesWine",
  "servesCocktails",
  "servesCoffee",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
  "servesDessert",
  "servesVegetarianFood",
  "allowsDogs",
  "menuForChildren",
  "goodForChildren",
  "goodForGroups",
  "restroom",
  "parkingOptions",
  "paymentOptions",
  "accessibilityOptions",
].join(",");

export const placesRouter = Router();

/**
 * GET /api/v1/places/:placeId
 * Proxies Google Places API (New) — keeps MAPS_API_KEY server-side.
 */
placesRouter.get(
  "/:placeId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const placeId = String(req.params.placeId);

      if (!placeId || !/^[a-zA-Z0-9_\-:]{10,200}$/.test(placeId)) {
        res.status(400).json({ success: false, error: "Invalid place ID" });
        return;
      }

      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "your_google_maps_api_key") {
        res.status(503).json({ success: false, error: "Places API not configured" });
        return;
      }

      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${PLACE_FIELDS}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        res.status(response.status).json({
          success: false,
          error: `Places API error (HTTP ${response.status})`,
        });
        return;
      }

      const data = await response.json();
      if (data.error) {
        res.status(400).json({ success: false, error: data.error.message });
        return;
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("[places] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);
