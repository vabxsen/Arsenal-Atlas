/**
 * Smoke test for the wikitext parser against live articles.
 * Run: npx tsx scripts/lib/wikitext.test.ts
 */
import { fetchJson } from './http.ts';
import {
  cleanWikitext,
  collectInfoboxParams,
  extractAllTemplates,
  findSection,
  isCrossReference,
  parseMeasurement,
  splitSections,
  splitValueLines,
  SPEC_TEMPLATE_PATTERN,
  HISTORY_KEYS,
  DEVELOPMENT_KEYS,
} from './wikitext.ts';

interface ParseResponse {
  parse?: { wikitext?: string; title?: string };
}
interface ExtractResponse {
  query?: { pages?: { title: string; extract?: string }[] };
}

const TITLES = ['AK-47', 'M1 Abrams', 'F-16 Fighting Falcon', 'USS Nimitz (CVN-68)'];

for (const title of TITLES) {
  // redirects=1 is essential: most well-known names ("F-16 Fighting Falcon")
  // are redirects to the canonical title, and without it the API returns nothing.
  const wikiUrl =
    `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}` +
    `&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const extractUrl =
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1` +
    `&titles=${encodeURIComponent(title)}&format=json&formatversion=2&redirects=1`;

  const parsed = await fetchJson<ParseResponse>(wikiUrl);
  const wikitext = parsed.parse?.wikitext ?? '';

  const params = collectInfoboxParams(wikitext);
  const templateCount = extractAllTemplates(wikitext, SPEC_TEMPLATE_PATTERN).length;

  const extractRes = await fetchJson<ExtractResponse>(extractUrl);
  const extract = extractRes.query?.pages?.[0]?.extract ?? '';
  const sections = splitSections(extract);

  console.log(`\n${'='.repeat(64)}\n${title}\n${'='.repeat(64)}`);
  console.log(`templates     : ${templateCount}  ->  ${Object.keys(params).length} merged params`);
  console.log(`sections      : ${[...sections.keys()].slice(0, 8).join(' | ')}`);

  const history = findSection(sections, HISTORY_KEYS);
  const development = findSection(sections, DEVELOPMENT_KEYS);
  console.log(`history       : ${history ? `${history.slice(0, 70)}...` : 'none'}`);
  console.log(`development   : ${development ? `${development.slice(0, 70)}...` : 'none'}`);

  const interesting = [
    'cartridge',
    'caliber',
    'weight',
    'length',
    'part_length',
    'action',
    'rate',
    'velocity',
    'range',
    'feed',
    'designer',
    'manufacturer',
    'origin',
    'used_by',
    'wars',
    'variants',
    'engine',
    'speed',
    'crew',
    'armament',
    'displacement',
    'propulsion',
  ];

  console.log('--- parsed specs ---');
  for (const key of interesting) {
    const raw = params[key];
    if (!raw) continue;
    const clean = cleanWikitext(raw, { preserveBreaks: true });
    if (!clean) continue;
    if (isCrossReference(clean)) {
      console.log(`  ${key.padEnd(14)}: (cross-reference, dropped)`);
      continue;
    }
    const lines = splitValueLines(clean);
    for (const line of lines.slice(0, 4)) {
      const measure = parseMeasurement(line.value);
      const suffix = measure ? `   [${measure.numeric} ${measure.unit}]` : '';
      const label = line.label ? `${key} / ${line.label}` : key;
      console.log(`  ${label.slice(0, 30).padEnd(30)}: ${line.value.slice(0, 60)}${suffix}`);
    }
  }
}
