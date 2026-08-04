/**
 * The shape of one row in `listing.json`.
 *
 * Declared here, in shared/, because it has exactly two consumers that must
 * agree byte for byte: the seed that writes the file
 * (`scripts/seed/index.ts`) and the client that reads it
 * (`src/lib/data.ts`, which re-exports this as `ListingEntry`). Declaring it
 * twice would mean a field could be added to the projection and never surface
 * in the UI — or, worse, be read by a component and be absent from every row.
 *
 * This is the *light* projection: no prose beyond a truncated description, no
 * gallery, no specifications. Full documents are fetched per slug when a
 * detail page opens. Everything added here is paid for by every visitor on
 * first load, so the bar for a new field is that a grid or rail actually
 * renders it.
 */
export interface ListingEntry {
  id: string;
  slug: string;
  name: string;
  category: string;
  kind: string;
  description: string;
  /*
   * `?: T | undefined` throughout rather than bare `?:`.
   *
   * Under exactOptionalPropertyTypes those are different types, and both sides
   * need the looser one: the seed builds these straight off optional Equipment
   * fields (`entry.images.hero?.url`), so it assigns undefined, while the
   * client reads parsed JSON where JSON.stringify has already dropped the key.
   * Bare `?:` would model the client correctly and reject the seed.
   */
  thumb?: string | undefined;
  hero?: string | undefined;
  heroWidth?: number | undefined;
  heroHeight?: number | undefined;
  countries: { name: string; iso3?: string | undefined }[];
  countryCodes: string[];
  serviceStart?: number | undefined;
  popularity: number;
  featured: boolean;
  galleryCount: number;

  /**
   * First manufacturer, or the naval "Builder" fallback. ~355/482.
   * @see manufacturerLabel in shared/headline.ts
   */
  manufacturer?: string;

  /**
   * Normalised `subcategory`, used as the card's role line. ~345/482.
   * @see roleLabel in shared/headline.ts
   */
  role?: string;

  /**
   * One kind-appropriate headline figure. ~330/482.
   *
   * The label is carried alongside the value because the value alone is
   * ambiguous — "64 t" needs "Weight" to mean anything, and the card exposes
   * the label to assistive tech even where it does not print it.
   * @see headlineSpec in shared/headline.ts
   */
  spec?: { label: string; value: string };
}
