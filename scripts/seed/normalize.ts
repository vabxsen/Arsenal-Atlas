import {
  cleanWikitext,
  findSection,
  isCrossReference,
  parseMeasurement,
  splitValueLines,
  DEVELOPMENT_KEYS,
  HISTORY_KEYS,
} from '../lib/wikitext.ts';
import { resolveCountry, resolveCountryList } from '../../shared/countries.ts';
import { getCategory } from '../../shared/taxonomy.ts';
import type { Equipment, ImageRef, SpecGroup, SpecItem, TimelineEvent } from '../../shared/schema.ts';
import type { CatalogEntry } from './catalog.ts';
import { RELATION_KEYS, SPEC_MAP, unitFromKey } from './specMap.ts';
import type { ArticleSummary, GalleryImage } from './sources.ts';

/** Lowercase kebab-case, diacritics folded, dashes normalised. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[×–—]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Trim prose to whole sentences under `maxChars`. */
function trimProse(text: string, maxChars: number): string {
  const collapsed = text.replace(/\s*\n\s*/g, '\n').trim();
  if (collapsed.length <= maxChars) return collapsed;

  const cut = collapsed.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : cut).trim();
}

/** Pull four-digit years, filtered to a plausible range for military hardware. */
function extractYears(value: string): number[] {
  const years = [...value.matchAll(/\b(1[2-9]\d{2}|20[0-4]\d)\b/g)]
    .map((m) => Number.parseInt(m[1] ?? '', 10))
    .filter((y) => Number.isFinite(y));
  return [...new Set(years)].sort((a, b) => a - b);
}

/** Build grouped specifications from infobox params per the kind's field map. */
function buildSpecifications(
  params: Record<string, string>,
  kind: Equipment['kind']
): { specifications: SpecGroup[]; specIndex: Record<string, number | string> } {
  const specifications: SpecGroup[] = [];
  const specIndex: Record<string, number | string> = {};

  for (const groupDef of SPEC_MAP[kind]) {
    const items: SpecItem[] = [];

    for (const field of groupDef.fields) {
      const key = field.keys.find((k) => params[k]?.trim());
      if (!key) continue;

      const cleaned = cleanWikitext(params[key] as string, { preserveBreaks: true });
      if (!cleaned || isCrossReference(cleaned)) continue;

      const unit = field.unitFromKey ? unitFromKey(key) : field.unit;

      for (const line of splitValueLines(cleaned).slice(0, 4)) {
        // Aircraft specs store bare numbers with the unit in the key name.
        const value = unit && /^[\d.,]+$/.test(line.value) ? `${line.value} ${unit}` : line.value;
        if (value.length > 300) continue;

        const label = line.label ? `${field.label} (${line.label})` : field.label;
        const measure = parseMeasurement(value);

        const item: SpecItem = { label, value };
        if (measure) {
          item.numeric = measure.numeric;
          item.unit = measure.unit;
        }
        items.push(item);

        // First value for a field wins the flat index — Compare needs one
        // scalar per label, not a list.
        //
        // Stores the *display* string, never the bare numeric. Wikipedia
        // records the same field in different unit systems per article
        // (AK-47 muzzle velocity in m/s, M16 in ft/s), so surfacing "715"
        // beside "3150" would imply a 4x difference that does not exist.
        // Keeping the unit makes the comparison honest.
        if (!(field.label in specIndex)) {
          specIndex[field.label] = value;
        }
      }
    }

    if (items.length) specifications.push({ group: groupDef.group, items });
  }

  return { specifications, specIndex };
}

/** Read a relation key group into a de-duplicated list of names. */
function readRelation(params: Record<string, string>, keys: readonly string[], max = 24): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const key of keys) {
    const raw = params[key];
    if (!raw) continue;
    const cleaned = cleanWikitext(raw, { preserveBreaks: true });
    if (!cleaned || isCrossReference(cleaned)) continue;

    for (const line of cleaned.split(/\n|,(?![^(]*\))/)) {
      const name = line.replace(/\([^)]*\)/g, '').trim();
      if (name.length < 2 || name.length > 80) continue;
      if (/^see\b/i.test(name)) continue;
      const dedupe = name.toLowerCase();
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(name);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Chronology assembled from the date-bearing infobox fields. */
function buildTimeline(params: Record<string, string>): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seen = new Set<number>();

  const push = (year: number, title: string, detail?: string) => {
    if (!Number.isFinite(year) || seen.has(year)) return;
    seen.add(year);
    events.push(detail ? { year, title, detail } : { year, title });
  };

  const fields: [string[], string][] = [
    [['design_date', 'designdate'], 'Design begins'],
    [['production_date', 'produced', 'production'], 'Production begins'],
    [['service', 'in_service', 'introduction', 'introduced'], 'Enters service'],
    [['first_flight'], 'First flight'],
    [['laid_down'], 'Laid down'],
    [['launched'], 'Launched'],
    [['commissioned'], 'Commissioned'],
    [['decommissioned'], 'Decommissioned'],
    [['retired'], 'Retired from service'],
  ];

  for (const [keys, title] of fields) {
    const key = keys.find((k) => params[k]?.trim());
    if (!key) continue;
    const cleaned = cleanWikitext(params[key] as string);
    const years = extractYears(cleaned);
    if (years[0] !== undefined) push(years[0], title, cleaned.slice(0, 160) || undefined);
  }

  return events.sort((a, b) => a.year - b.year);
}

export interface NormalizeInput {
  entry: CatalogEntry;
  summary: ArticleSummary;
  params: Record<string, string>;
  sections: Map<string, string>;
  gallery: GalleryImage[];
  /** Alternate names, sourced from the article's incoming redirects. */
  redirects: string[];
}

/**
 * Assemble a validated-shape Equipment document.
 * Returns null when the article yields too little to justify a page.
 */
export function normalize(input: NormalizeInput): Equipment | null {
  const { entry, summary, params, sections, gallery, redirects } = input;

  const category = getCategory(entry.category);
  if (!category) throw new Error(`Unknown category "${entry.category}" for ${entry.title}`);

  const name = cleanWikitext(params.name ?? '') || summary.title;
  const slug = slugify(entry.title);
  if (!slug) return null;

  // The REST extract is usually the lead paragraph, but for some articles it
  // is a single terse sentence. Fall back to the full lead section before
  // giving up on the entry.
  const leadSection = sections.get('summary') ?? '';
  const descriptionSource =
    summary.extract.length >= 160 || leadSection.length <= summary.extract.length
      ? summary.extract
      : leadSection;

  const description = trimProse(descriptionSource, 900);
  if (description.length < 60) return null;

  const { specifications, specIndex } = buildSpecifications(params, category.kind);

  // ── Prose ──────────────────────────────────────────────────
  const historyRaw = findSection(sections, HISTORY_KEYS);
  const developmentRaw = findSection(sections, DEVELOPMENT_KEYS);

  // ── Geography ──────────────────────────────────────────────
  const originRaw = cleanWikitext(
    params.origin ?? params.national_origin ?? params.place_of_origin ?? params.country ?? ''
  );
  const countries = resolveCountryList(originRaw).map((c) =>
    c.historical ? { name: c.historical, iso3: c.iso3 } : { name: c.name, iso3: c.iso3 }
  );

  const operatorNames = readRelation(params, RELATION_KEYS.operators);
  const operators = operatorNames.map((operatorName) => {
    const resolved = resolveCountry(operatorName);
    return resolved ? { name: operatorName, iso3: resolved.iso3 } : { name: operatorName };
  });

  const countryCodes = [
    ...new Set([
      ...countries.map((c) => c.iso3).filter((c): c is string => Boolean(c)),
      ...operators.map((o) => o.iso3).filter((o): o is string => Boolean(o)),
    ]),
  ];

  // ── Imagery ────────────────────────────────────────────────
  const heroFromGallery = gallery[0];
  let hero: ImageRef | undefined;
  if (summary.hero) {
    // The REST lead image has no licence metadata of its own; reuse the
    // gallery record when the same file appears there.
    const match = gallery.find((g) => g.url === summary.hero?.url);
    hero = {
      url: summary.hero.url,
      width: summary.hero.width,
      height: summary.hero.height,
      license: match?.license ?? 'See Wikimedia Commons',
      ...(match?.descriptionUrl ? { descriptionUrl: match.descriptionUrl } : {}),
      ...(match?.licenseUrl ? { licenseUrl: match.licenseUrl } : {}),
      ...(match?.attribution ? { attribution: match.attribution } : {}),
    };
  } else if (heroFromGallery) {
    hero = { ...heroFromGallery };
  }

  const galleryRefs: ImageRef[] = gallery.map((g) => ({
    url: g.url,
    descriptionUrl: g.descriptionUrl,
    width: g.width,
    height: g.height,
    license: g.license,
    ...(g.licenseUrl ? { licenseUrl: g.licenseUrl } : {}),
    ...(g.attribution ? { attribution: g.attribution } : {}),
    ...(g.caption ? { caption: g.caption } : {}),
  }));

  // ── Aliases ────────────────────────────────────────────────
  // Redirects carry most of the weight here: the catalogue title and infobox
  // name are usually identical, so without them almost every entry would
  // have an empty alias list and search would only match exact designations.
  const aliases = [
    ...new Set(
      [...redirects, entry.title, summary.title, cleanWikitext(params.other_name ?? '')]
        .flatMap((a) => a.split(/,|\n/))
        .map((a) => a.trim())
        .filter((a) => a.length > 1 && a.length < 60 && a.toLowerCase() !== name.toLowerCase())
    ),
  ].slice(0, 30);

  // ── Chronology ─────────────────────────────────────────────
  const timeline = buildTimeline(params);
  const serviceYears = extractYears(
    cleanWikitext(params.service ?? params.introduction ?? params.commissioned ?? '')
  );

  const now = new Date().toISOString();

  const equipment: Equipment = {
    id: slug,
    slug,
    name,
    aliases,
    kind: category.kind,
    category: category.slug,
    description,
    facts: [],
    specifications,
    specIndex,
    images: {
      ...(hero ? { hero } : {}),
      ...(summary.thumb ? { thumb: summary.thumb } : {}),
    },
    gallery: galleryRefs,
    countries,
    countryCodes,
    manufacturers: readRelation(params, ['manufacturer', 'builder'], 8).map((n) => ({ name: n })),
    designers: readRelation(params, ['designer'], 6).map((n) => ({ name: n })),
    operators,
    conflicts: readRelation(params, RELATION_KEYS.conflicts, 16).map((n) => ({ name: n })),
    variants: readRelation(params, RELATION_KEYS.variants, 16).map((n) => ({
      name: n,
      slug: slugify(n),
    })),
    relatedEquipment: [
      ...readRelation(params, RELATION_KEYS.developedFrom, 4),
      ...readRelation(params, RELATION_KEYS.developedInto, 6),
    ].map((n) => ({ name: n, slug: slugify(n) })),
    compatibleAmmunition: readRelation(params, ['cartridge', 'caliber'], 4).map((n) => ({
      name: n,
      slug: slugify(n),
    })),
    timeline,
    // Attribution is mandatory — CC BY-SA requires it, and the pinned
    // revision is what makes the claim verifiable later.
    sources: [
      {
        title: `${summary.title} — Wikipedia`,
        url: summary.canonicalUrl,
        license: 'CC BY-SA 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        ...(summary.revisionId ? { revisionId: summary.revisionId } : {}),
        retrievedAt: now,
      },
    ],
    // Proxy for prominence: article depth and imagery, biased by curation.
    popularity:
      (entry.featured ? 500 : 0) +
      Math.min(300, Math.round(summary.extract.length / 4)) +
      galleryRefs.length * 10 +
      specifications.length * 15,
    featured: entry.featured ?? false,
    publishedAt: now,
    updatedAt: now,
  };

  if (entry.family) equipment.familyId = entry.family;
  if (summary.description) equipment.subcategory = summary.description.slice(0, 120);
  if (historyRaw) equipment.history = trimProse(historyRaw, 6000);
  if (developmentRaw) equipment.development = trimProse(developmentRaw, 6000);
  if (serviceYears[0] !== undefined) equipment.serviceStart = serviceYears[0];

  return equipment;
}
