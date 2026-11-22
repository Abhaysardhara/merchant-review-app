/**
 * Small Google Places (New) lookup used to understand what a shop is
 * when generating its review buttons.
 */

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const SUMMARY_FIELDS = [
  "displayName",
  "primaryType",
  "primaryTypeDisplayName",
  "types",
  "editorialSummary",
  "reviews",
  "delivery",
  "dineIn",
  "takeout",
  "servesVegetarianFood",
].join(",");

export interface PlaceSummary {
  name: string;
  type: string;
  types: string[];
  summary: string;
  reviewSnippets: string[];
  attributes: string[];
}

export async function getPlaceSummary(placeId: string): Promise<PlaceSummary | null> {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "your_google_maps_api_key") return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=${SUMMARY_FIELDS}&key=${GOOGLE_MAPS_API_KEY}`
  );
  if (!res.ok) return null;
  const d: any = await res.json();

  const attributes: string[] = [];
  if (d.dineIn) attributes.push("dine-in");
  if (d.takeout) attributes.push("takeaway");
  if (d.delivery) attributes.push("delivery");
  if (d.servesVegetarianFood) attributes.push("vegetarian food");

  return {
    name: d.displayName?.text ?? "",
    type: d.primaryTypeDisplayName?.text ?? d.primaryType ?? "",
    types: Array.isArray(d.types) ? d.types.slice(0, 10) : [],
    summary: d.editorialSummary?.text ?? "",
    reviewSnippets: (Array.isArray(d.reviews) ? d.reviews : [])
      .map((r: any) => String(r.originalText?.text ?? r.text?.text ?? "").slice(0, 300))
      .filter(Boolean)
      .slice(0, 5),
    attributes,
  };
}
