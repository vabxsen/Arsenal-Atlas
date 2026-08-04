import type { Equipment } from './schema.ts';
import type { EquipmentKind } from './taxonomy.ts';

/**
 * Two derivations that turn infobox prose into card metadata.
 *
 * Both run in the seed and their output is baked into `listing.json`, so the
 * cost is paid once at build time rather than on every render — and, more
 * importantly, the rules live in one place instead of being re-guessed by each
 * component that wants a short label.
 *
 * Both return `undefined` rather than a placeholder when the source will not
 * yield something clean. That is the contract the card is built on: a missing
 * field renders nothing at all, never an empty badge or a dash. Roughly a
 * quarter of the corpus has no usable headline figure, and a card that admits
 * this by staying quiet looks considered; one that prints "—" looks broken.
 *
 * Type-only imports from schema.ts, so zod never reaches the browser bundle.
 */

/**
 * The one figure worth putting on a card, by kind.
 *
 * Chosen from measured coverage against the real corpus rather than from what
 * sounds right — the first draft asked firearms for "Calibre", a key that
 * exists on zero entries, because the infoboxes call it "Cartridge".
 *
 * Coverage (of entries of that kind):
 *   firearm     Cartridge 151/160
 *   aircraft    Maximum Speed 45, Cruise Speed 25 -> ~50/62
 *   missile     Operational Range 54/56
 *   naval       Displacement 44/47
 *   vehicle     Weight 35/39
 *   ordnance    Weight 47, Cartridge 38 -> 49/56
 *   ammunition  Bullet Diameter 13/15
 *   gear        Weight 9/47
 *
 * `gear` is deliberately thin. Night-vision goggles and body armour have no
 * single comparable number, and inventing one ("Type: Helmet") would fill the
 * slot without informing anyone.
 */
const HEADLINE: Record<EquipmentKind, readonly string[]> = {
  firearm: ['Cartridge'],
  ordnance: ['Weight', 'Cartridge'],
  vehicle: ['Weight'],
  aircraft: ['Maximum Speed', 'Cruise Speed'],
  naval: ['Displacement'],
  missile: ['Operational Range'],
  ammunition: ['Bullet Diameter'],
  gear: ['Weight'],
};

/** Nationality prefixes. 182 subcategories open with one. */
const DEMONYM =
  /^(american|british|german|russian|soviet|french|italian|japanese|chinese|israeli|swedish|swiss|belgian|czech|czechoslovak|polish|austrian|spanish|dutch|norwegian|finnish|danish|indian|brazilian|turkish|south korean|north korean|ukrainian|canadian|australian|yugoslav|hungarian|romanian|iranian|pakistani|singaporean|croatian|serbian|slovak|slovenian|portuguese|greek|egyptian|argentine|mexican|taiwanese|bulgarian|estonian|nazi)\s+/i;

const MAX_ROLE = 34;

/**
 * A short role label, derived from `subcategory`.
 *
 * `subcategory` is not a role as it stands. It is a sentence — median 32
 * characters, longest 86 ("Prototype demonstrator aircraft for the US Air
 * Force Advanced Tactical Fighter program") — and it opens with the country on
 * 182 entries, which the card already prints one line below. Rendered verbatim
 * it wraps to three lines and repeats itself.
 *
 * Stripping the demonym and cutting at the first comma or parenthesis leaves
 * 345 of 480 usable at a median of 22 characters: "Bullpup assault rifle",
 * "155 mm self-propelled howitzer", "Third-generation main battle tank".
 * The rest are dropped rather than truncated with an ellipsis — a label cut
 * mid-phrase is worse than no label.
 */
export function roleLabel(subcategory: string | undefined): string | undefined {
  if (!subcategory) return undefined;

  const withoutOrigin = subcategory.replace(DEMONYM, '');
  const firstClause = withoutOrigin.split(/[,(]/)[0]?.trim() ?? '';
  if (firstClause.length < 3 || firstClause.length > MAX_ROLE) return undefined;

  // Sentence case only on the leading character: the rest carries meaningful
  // capitalisation ("WWII-era fighter aircraft", "NATO-standard").
  return firstClause.charAt(0).toUpperCase() + firstClause.slice(1);
}

/**
 * Trims an infobox value to the part that fits on a card.
 *
 * Raw values carry qualifiers and, worse, entire variant lists — one missile's
 * range reads "400 km 40N6E missile, 150 km 48N6(E) missile, 200 km
 * 48N6M(E2) missile, ...". Everything from the first comma or bracket goes.
 *
 * What survives must contain both a digit and something that is not a digit.
 * A bare number is ambiguous on a card with no column header: "12" is a
 * shotgun gauge, and "6" is a truncated displacement.
 */
function cleanValue(raw: string): string | undefined {
  const clipped = raw.split(/[,(;]/)[0]?.trim().replace(/\s+/g, ' ') ?? '';
  if (clipped.length < 3 || clipped.length > 22) return undefined;
  if (!/\d/.test(clipped)) return undefined;
  if (!/[^\d\s.,]/.test(clipped)) return undefined;
  return groupThousands(clipped);
}

/**
 * Groups the leading magnitude: "100020 LT" -> "100,020 LT".
 *
 * The sources do not group consistently — a carrier's displacement arrives as
 * "100020 LT" next to another's "48,110 LT" — and an ungrouped six-figure
 * number on a card reads as a database dump rather than a specification.
 *
 * Only the leading run of digits is touched, and only at four or more, so
 * calibres and designations are left alone: "7.92x57mm Mauser" and ".50 BMG"
 * must not acquire commas, and a four-digit year would be wrong to group too —
 * but no headline key in the table is a year.
 */
function groupThousands(value: string): string {
  return value.replace(/^(\d{4,})(?=\D|$)/, (digits) =>
    digits.replace(/\B(?=(\d{3})+$)/g, ',')
  );
}

/** Finds a spec item by label across the grouped specifications. */
function findSpecItem(entry: Equipment, label: string) {
  for (const group of entry.specifications) {
    for (const item of group.items) {
      if (item.label === label) return item;
    }
  }
  return undefined;
}

export interface HeadlineSpec {
  label: string;
  value: string;
}

/**
 * One kind-appropriate figure for the card, or nothing.
 *
 * Numeric-first: where the seed parsed a magnitude and unit, those format
 * cleanly and by construction carry none of the parenthetical baggage. Only
 * 2,931 of 8,933 spec items have a parsed `numeric`, so the raw string is the
 * common path and `cleanValue` is what makes it safe.
 */
export function headlineSpec(entry: Equipment, role?: string): HeadlineSpec | undefined {
  for (const label of HEADLINE[entry.kind]) {
    const item = findSpecItem(entry, label);
    const value =
      item?.numeric !== undefined && item.unit
        ? groupThousands(`${item.numeric} ${item.unit}`)
        : cleanValue(String(entry.specIndex[label] ?? ''));

    if (!value) continue;

    /*
     * Skip a figure the role line already carries.
     *
     * The AK-47's role reads "7.62x39mm assault rifle" and its headline spec
     * is the cartridge — so the card printed the calibre twice, on adjacent
     * lines, which reads as a rendering bug rather than as detail. Only four
     * entries do this, but they include the single most recognisable object in
     * the corpus.
     */
    if (role && role.toLowerCase().includes(value.toLowerCase())) continue;

    return { label, value };
  }
  return undefined;
}

/** Legal-form suffixes, stripped repeatedly ("... Corp. Ltd"). */
const BOILERPLATE =
  /\s+(company|corporation|corp\.?|incorporated|inc\.?|limited|ltd\.?|gmbh|a\.?g\.?|s\.?a\.?|plc|llc|co\.?)$/i;

/** A truncation must not end on a conjunction or article. */
const DANGLING = /\s+(and|of|for|the|de|&)$/i;

const MAX_MAKER = 34;

/**
 * The maker, for the card's metadata line.
 *
 * Naval entries need the fallback: only 13 of 47 ships carry `manufacturers`,
 * because the seed's naval spec map routes the infobox `builder` field to a
 * spec labelled "Builder" instead. Without it, the class of entry most likely
 * to be *named* after its yard loses the yard.
 *
 * Shortening rather than rejecting is the point. A flat length limit dropped
 * 28 entries whose only fault was a formal corporate name — "Colt's Patent
 * Firearms Manufacturing Company", "Newport News Shipbuilding and Drydock
 * Company" — where the recognisable part fits easily. Strip the infobox's own
 * label prefixes ("Original:", "Factory:"), take the first of a list, drop the
 * legal form, and only then truncate on a word boundary. 327 -> 354 of 482,
 * with one genuine reject: a bare "Manufactured by:" with nothing after it.
 */
export function manufacturerLabel(entry: Equipment): string | undefined {
  const raw = entry.manufacturers[0]?.name ?? entry.specIndex['Builder'];
  if (raw === undefined) return undefined;

  let name =
    String(raw)
      // Unparsed wikitext. Five entries arrive as "[[Krauss-Maffei Wegmann"
      // or "[[SIG Sauer#SIG Sauer" — a link the infobox parser opened and
      // never closed, plus the anchor fragment behind a piped section link.
      .replace(/\[\[|\]\]|'{2,}/g, '')
      .split('#')[0]!
      .replace(/^[A-Za-z][\w ]{0,14}:\s*/, '')
      .split(/[,;/&|]/)[0]
      ?.trim() ?? '';

  let previous: string;
  do {
    previous = name;
    name = name.replace(BOILERPLATE, '').trim();
  } while (name !== previous);

  if (name.length > MAX_MAKER) {
    const cut = name.slice(0, MAX_MAKER);
    const boundary = cut.lastIndexOf(' ');
    // Only break on a word if enough of the name survives to identify it.
    if (boundary >= 12) name = cut.slice(0, boundary);
  }
  name = name.replace(DANGLING, '').trim();

  return name.length >= 2 && name.length <= MAX_MAKER ? name : undefined;
}
