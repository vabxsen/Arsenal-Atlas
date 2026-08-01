import { z } from 'zod';
import { CATEGORY_SLUGS, EQUIPMENT_KINDS } from './taxonomy.ts';

/**
 * The canonical Equipment schema.
 *
 * This is the contract between the ETL pipeline (which validates against it
 * before any Firestore write) and the app (which consumes the inferred types).
 * A malformed entry is rejected at seed time rather than crashing a page.
 */

// ── Attribution ───────────────────────────────────────────────

/**
 * Wikipedia prose is CC BY-SA 4.0 and Commons media carries per-file terms,
 * so licence + a pinned revision travel with every piece of imported content.
 * `revisionId` is what makes the attribution verifiable rather than decorative.
 */
export const sourceRefSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  license: z.string().min(1),
  licenseUrl: z.url().optional(),
  revisionId: z.number().int().positive().optional(),
  retrievedAt: z.string(),
});

export const imageRefSchema = z.object({
  url: z.url(),
  /** Commons file page — the attribution target, not the bits. */
  descriptionUrl: z.url().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().optional(),
  license: z.string().min(1),
  licenseUrl: z.url().optional(),
  /** Rendered verbatim next to the image; already plain text. */
  attribution: z.string().optional(),
});

// ── Specifications ────────────────────────────────────────────

/**
 * `value` is the display string ("7.62x39mm", "3.47 kg"); `numeric` is the
 * parsed magnitude in `unit`, present only when a comparison makes sense.
 * Compare and sorting read `numeric`; the spec table renders `value`.
 */
export const specItemSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  numeric: z.number().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});

export const specGroupSchema = z.object({
  group: z.string().min(1),
  items: z.array(specItemSchema).min(1),
});

// ── Relations ─────────────────────────────────────────────────

export const timelineEventSchema = z.object({
  year: z.number().int(),
  /** Optional finer date when the source provides one. */
  date: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
});

export const variantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  year: z.number().int().optional(),
  description: z.string().optional(),
});

/** A named reference that may or may not resolve to an entry we hold. */
export const entityRefSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
});

export const countryRefSchema = z.object({
  name: z.string().min(1),
  /** ISO 3166-1 alpha-3. Joins entries to the country explorer + map. */
  iso3: z.string().length(3).optional(),
});

// ── Entry ─────────────────────────────────────────────────────

export const equipmentSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
  name: z.string().min(1),
  /** Alternate designations and nicknames. Heavily weighted in search. */
  aliases: z.array(z.string()).default([]),

  kind: z.enum(EQUIPMENT_KINDS),
  category: z.enum(CATEGORY_SLUGS as [string, ...string[]]),
  subcategory: z.string().optional(),

  description: z.string().min(1),
  history: z.string().optional(),
  development: z.string().optional(),
  facts: z.array(z.string()).default([]),

  specifications: z.array(specGroupSchema).default([]),
  /**
   * Flattened `label -> numeric|value` projection of `specifications`.
   * Exists so Compare can diff four entries without walking nested groups.
   * Derived in normalize.ts — never authored by hand.
   */
  specIndex: z.record(z.string(), z.union([z.number(), z.string()])).default({}),

  images: z.object({ hero: imageRefSchema.optional(), thumb: z.url().optional() }),
  gallery: z.array(imageRefSchema).default([]),

  countries: z.array(countryRefSchema).default([]),
  /**
   * Flat ISO3 list spanning origin countries *and* operators. Denormalised
   * purely so the country explorer can use one `array-contains` query
   * instead of reading the corpus and filtering client-side.
   * Derived in normalize.ts.
   */
  countryCodes: z.array(z.string().length(3)).default([]),
  manufacturers: z.array(entityRefSchema).default([]),
  designers: z.array(entityRefSchema).default([]),
  operators: z.array(countryRefSchema).default([]),
  conflicts: z.array(entityRefSchema).default([]),

  variants: z.array(variantSchema).default([]),
  relatedEquipment: z.array(entityRefSchema).default([]),
  compatibleAmmunition: z.array(entityRefSchema).default([]),

  /** Links this entry into a `families/{slug}` evolution tree. */
  familyId: z.string().optional(),
  timeline: z.array(timelineEventSchema).default([]),

  serviceStart: z.number().int().optional(),
  serviceEnd: z.number().int().optional(),

  sources: z.array(sourceRefSchema).min(1, 'every entry must carry attribution'),

  /** Drives ranking and the "Popular" rails. */
  popularity: z.number().int().nonnegative().default(0),
  featured: z.boolean().default(false),

  publishedAt: z.string(),
  updatedAt: z.string(),
});

// ── Family trees ──────────────────────────────────────────────

export const familyNodeSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  year: z.number().int().optional(),
  /** Slug of the parent node; null marks the root of the family. */
  parent: z.string().nullable(),
});

export const familySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(familyNodeSchema).min(1),
});

// ── Search index ──────────────────────────────────────────────

/**
 * The payload Fuse.js searches. Deliberately tiny — the whole corpus ships
 * as one document so search costs zero Firestore reads per keystroke.
 */
export const searchEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  category: z.string(),
  kind: z.string(),
  country: z.string().optional(),
  thumb: z.string().optional(),
  year: z.number().int().optional(),
  popularity: z.number().int(),
});

export const searchIndexSchema = z.object({
  version: z.number().int(),
  builtAt: z.string(),
  entries: z.array(searchEntrySchema),
});

// ── Inferred types ────────────────────────────────────────────

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type ImageRef = z.infer<typeof imageRefSchema>;
export type SpecItem = z.infer<typeof specItemSchema>;
export type SpecGroup = z.infer<typeof specGroupSchema>;
export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type Variant = z.infer<typeof variantSchema>;
export type EntityRef = z.infer<typeof entityRefSchema>;
export type CountryRef = z.infer<typeof countryRefSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type FamilyNode = z.infer<typeof familyNodeSchema>;
export type Family = z.infer<typeof familySchema>;
export type SearchEntry = z.infer<typeof searchEntrySchema>;
export type SearchIndex = z.infer<typeof searchIndexSchema>;
