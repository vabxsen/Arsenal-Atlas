/**
 * A focused MediaWiki wikitext parser.
 *
 * Only handles what the seed pipeline actually needs: pulling an infobox out
 * of an article and reducing its parameter values to clean display strings.
 * It is deliberately not a general wikitext implementation — it is a
 * pragmatic extractor tuned to the `Infobox weapon` family of templates.
 */

/**
 * Extract the body of the first template whose name matches `namePattern`.
 * Brace-matched rather than regex-based, because infobox parameters routinely
 * contain nested templates ({{convert}}, {{ubl}}, {{plainlist}}).
 */
export function extractTemplate(wikitext: string, namePattern: RegExp): string | null {
  return extractAllTemplates(wikitext, namePattern)[0] ?? null;
}

/**
 * Extract the bodies of *every* template matching `namePattern`.
 *
 * Necessary because only small-arms articles use a single `Infobox weapon`.
 * Ships split across `Infobox ship begin` / `ship career` /
 * `ship characteristics`, and aircraft across `Infobox aircraft begin` /
 * `aircraft type` / `Aircraft specs` — reading just the first template
 * returns almost no data for those.
 */
export function extractAllTemplates(wikitext: string, namePattern: RegExp): string[] {
  const bodies: string[] = [];
  const opener = /\{\{\s*([^|}\n]+)/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(wikitext)) !== null) {
    const name = (match[1] ?? '').trim();
    if (!namePattern.test(name)) continue;

    let depth = 0;
    for (let i = match.index; i < wikitext.length - 1; i++) {
      if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
        depth++;
        i++;
      } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
        depth--;
        i++;
        if (depth === 0) {
          bodies.push(wikitext.slice(match.index + 2, i - 1));
          // Resume scanning *inside* this template rather than past it.
          // Ship articles nest the real data — `Infobox ship/career` and
          // `/characteristics` are passed as section1/2/3 parameters of an
          // outer `Infobox ship` wrapper, so skipping the block loses
          // everything. Duplicates are harmless: the merge keeps first-wins.
          opener.lastIndex = match.index + 2;
          break;
        }
      }
    }
  }
  return bodies;
}

/** Templates that carry specification data, across every equipment kind. */
export const SPEC_TEMPLATE_PATTERN =
  /^(infobox|aircraft specs?|ship (career|characteristics|begin)|specifications)/i;

/**
 * Merge the parameters of every spec-bearing template in an article.
 * Earlier templates win, so the lead infobox's `name`/`origin` are not
 * overwritten by a later characteristics block.
 */
export function collectInfoboxParams(wikitext: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const body of extractAllTemplates(wikitext, SPEC_TEMPLATE_PATTERN)) {
    for (const [key, value] of Object.entries(parseTemplateParams(body))) {
      // `sectionN` on the ship wrapper holds nested templates, not values —
      // those get picked up on their own pass.
      if (/^section\d+$/.test(key)) continue;
      if (!(key in merged) && value.trim()) merged[key] = value;
    }
  }
  return merged;
}

/**
 * Split a template body into `name -> raw value` pairs.
 * Splits only on pipes at nesting depth zero so nested templates and
 * `[[link|label]]` constructs stay intact.
 */
export function parseTemplateParams(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts: string[] = [];

  let depth = 0;
  let bracket = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const ch = body[i] as string;
    const next = body[i + 1];

    if (ch === '{' && next === '{') {
      depth++;
      current += '{{';
      i++;
      continue;
    }
    if (ch === '}' && next === '}') {
      depth--;
      current += '}}';
      i++;
      continue;
    }
    if (ch === '[' && next === '[') {
      bracket++;
      current += '[[';
      i++;
      continue;
    }
    if (ch === ']' && next === ']') {
      bracket--;
      current += ']]';
      i++;
      continue;
    }
    if (ch === '|' && depth === 0 && bracket === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);

  // parts[0] is the template name itself.
  for (const part of parts.slice(1)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key) params[key] = value;
  }
  return params;
}

/** `{{convert|3.47|kg|lb}}` -> `3.47 kg`. Keeps the source unit, drops targets. */
function resolveConvert(inner: string): string {
  const args = inner
    .split('|')
    .slice(1)
    .map((a) => a.trim())
    .filter((a) => !a.includes('='));

  const value = args[0] ?? '';
  const unit = args[1] ?? '';

  // Range form: {{convert|100|-|200|m}}
  if (args[1] === '-' || args[1] === 'to' || args[1] === '–') {
    return `${value}–${args[2] ?? ''} ${args[3] ?? ''}`.trim();
  }
  return `${value} ${unit}`.trim();
}

/** List templates render as comma-separated values. */
function resolveList(inner: string): string {
  return inner
    .split('|')
    .slice(1)
    .map((a) => a.trim())
    .filter((a) => a && !a.includes('='))
    .join(', ');
}

/**
 * Reduce a raw wikitext value to clean display text.
 * Runs innermost-first so nested templates resolve correctly.
 *
 * With `preserveBreaks`, `<br>` and list markers become newlines instead of
 * commas. Infobox values are frequently multi-line records
 * ("Without magazine: 3.47 kg<br>Magazine, empty: 0.43 kg") and flattening
 * them to one string destroys data that splits cleanly into separate specs.
 */
export function cleanWikitext(input: string, options: { preserveBreaks?: boolean } = {}): string {
  const { preserveBreaks = false } = options;
  let text = input;

  // Drop references, comments, and citation templates outright.
  text = text.replace(/<ref[^>]*\/>/gi, '');
  text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Resolve templates from the inside out.
  for (let pass = 0; pass < 8; pass++) {
    const before = text;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_full, inner: string) => {
      const name = (inner.split('|')[0] ?? '').trim().toLowerCase();

      if (name === 'convert' || name === 'cvt') return resolveConvert(inner);
      if (['ubl', 'unbulleted list', 'plainlist', 'flatlist', 'hlist'].includes(name)) {
        return resolveList(inner);
      }
      if (name === 'nowrap' || name === 'nobold' || name === 'noitalic') {
        return (inner.split('|')[1] ?? '').trim();
      }
      if (name.startsWith('cite ') || name === 'citation' || name === 'sfn') return '';
      if (name === 'circa' || name === 'c.') return `c. ${(inner.split('|')[1] ?? '').trim()}`;
      if (name === 'sclass' || name === 'ship class') {
        const args = inner.split('|');
        return `${(args[1] ?? '').trim()}-class ${(args[2] ?? '').trim()}`.trim();
      }
      // Unknown template: keep the first positional argument if it looks like
      // content, otherwise drop the whole thing.
      const args = inner
        .split('|')
        .slice(1)
        .filter((a) => !a.includes('='));
      return (args[0] ?? '').trim();
    });
    if (text === before) break;
  }

  // Wiki links: [[target|label]] -> label, [[target]] -> target
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // External links: [url label] -> label
  text = text.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1');
  text = text.replace(/\[https?:\/\/\S+\]/g, '');

  // Line breaks and list markers become separators.
  const sep = preserveBreaks ? '\n' : ', ';
  text = text.replace(/<br\s*\/?>/gi, sep);
  text = text.replace(/^[*#:;]+\s*/gm, '');
  text = preserveBreaks ? text.replace(/\n{2,}/g, '\n') : text.replace(/\n+/g, ', ');

  // Remaining HTML.
  text = text.replace(/<[^>]+>/g, '');

  // Emphasis markup.
  text = text.replace(/'''''/g, '').replace(/'''/g, '').replace(/''/g, '');

  // Entities and whitespace.
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  text = text
    .replace(/[ \t]*,[ \t]*,+/g, ', ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^[\s,;]+|[\s,;]+$/g, '')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim();

  return text;
}

/**
 * Units we accept as evidence that a string is genuinely a measurement.
 * Without this whitelist the extractor happily reads "AGT1500" as 1500 and
 * "M1A1" as 1, poisoning Compare with values that are not quantities.
 */
const KNOWN_UNITS = new Set([
  // length
  'mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi',
  // mass
  'g', 'kg', 't', 'lb', 'lbs', 'oz', 'tonnes', 'tons', 'ton',
  // speed
  'm/s', 'ft/s', 'km/h', 'mph', 'kn', 'kt', 'knots', 'mach',
  // rate
  'rpm', 'rounds/min', 'rounds/minute', 'shots/min',
  // power / energy
  'hp', 'shp', 'bhp', 'kw', 'mw', 'j', 'kj', 'nm',
  // volume / misc
  'l', 'gal', 'mpa', 'psi', 'bar', 'km²', 'm²', '°',
]);

/**
 * Parse a numeric magnitude and unit out of a cleaned spec string.
 *
 * Deliberately strict: the number must appear at the start of the string (or
 * after a short `Label:` prefix) and must be followed by a recognised unit.
 * Anything else returns undefined, so Compare and sorting only ever see real
 * quantities. Display always falls back to the original string.
 */
export function parseMeasurement(value: string): { numeric: number; unit: string } | undefined {
  // Allow one leading "Label:" qualifier, e.g. "Cyclic rate: 600 rounds/min".
  const body = value.replace(/^[^:\n]{0,40}:\s*/, '').trim();

  const match = /^(-?\d[\d,]*(?:\.\d+)?)\s*([a-zA-Z°²/]+(?:\/[a-zA-Z]+)?)/.exec(body);
  if (!match) return undefined;

  const numeric = Number.parseFloat((match[1] ?? '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return undefined;

  const unit = (match[2] ?? '').trim();
  if (!KNOWN_UNITS.has(unit.toLowerCase())) return undefined;

  return { numeric, unit };
}

/**
 * Infoboxes often defer to a section instead of holding data
 * ("See Users below", "See Variants"). Those are navigation, not values.
 */
export function isCrossReference(value: string): boolean {
  return /^see\s+[\w\s]{0,40}$/i.test(value.trim());
}

/**
 * Split a `preserveBreaks` value into individual spec items.
 * A line shaped `Label: value` becomes a labelled item; anything else is
 * returned unlabelled for the caller to name.
 */
export function splitValueLines(value: string): { label?: string; value: string }[] {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isCrossReference(line));

  const items: { label?: string; value: string }[] = [];
  // A line that is only a label ("Without magazine:") qualifies the lines
  // that follow it, until the next such label.
  let pendingLabel: string | undefined;

  for (const line of lines) {
    if (/^[^:]{2,40}:$/.test(line)) {
      pendingLabel = line.slice(0, -1).trim();
      continue;
    }

    const inline = /^([^:]{2,40}):\s*(.+)$/.exec(line);
    if (inline?.[2]) {
      items.push({ label: inline[1]?.trim(), value: inline[2].trim() });
      continue;
    }

    items.push(pendingLabel ? { label: pendingLabel, value: line } : { value: line });
  }

  return items.filter((item) => item.value.length > 0);
}

/**
 * Split a plaintext article extract into its `== Section ==` blocks.
 * Keyed by lowercased heading.
 */
export function splitSections(extract: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = extract.split('\n');

  let heading = 'summary';
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (body) sections.set(heading, body);
    buffer = [];
  };

  for (const line of lines) {
    const match = /^(={2,6})\s*(.+?)\s*\1$/.exec(line.trim());
    if (match) {
      flush();
      heading = (match[2] ?? '').toLowerCase().trim();
      continue;
    }
    buffer.push(line);
  }
  flush();

  return sections;
}

/**
 * Heading keywords, most-specific first.
 *
 * Broad on purpose: only small-arms articles use a plain "History" heading.
 * Armour leads with "Previous developments", ships with "Construction",
 * aircraft with "Lightweight Fighter program" — so we match on substrings
 * across a wide vocabulary and take the first hit.
 */
export const HISTORY_KEYS = [
  'history',
  'background',
  'origin',
  'service history',
  'operational history',
  'combat',
  'career',
  'service',
  'deployment',
] as const;

export const DEVELOPMENT_KEYS = [
  'development',
  'design',
  'production',
  'construction',
  'concept',
  'prototype',
  'program',
  'programme',
  'procurement',
] as const;

/** First matching section body, searched by keyword against headings. */
export function findSection(
  sections: Map<string, string>,
  keywords: readonly string[]
): string | undefined {
  for (const keyword of keywords) {
    for (const [heading, body] of sections) {
      if (heading.includes(keyword)) return body;
    }
  }
  return undefined;
}
