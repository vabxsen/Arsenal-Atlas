/**
 * Country name -> ISO 3166-1 alpha-3, covering the states that actually appear
 * in military equipment records.
 *
 * A lookup table rather than a Wikidata round-trip because the hard cases here
 * are historical: "Soviet Union", "West Germany", and "Nazi Germany" have no
 * current ISO code, but the country explorer still needs to place them on a
 * modern map. Successor states are mapped explicitly and flagged `historical`
 * so the UI can label them honestly.
 */

export interface CountryDef {
  readonly iso3: string;
  readonly name: string;
  /** Rendered instead of `name` when the source used a historical state. */
  readonly historical?: string;
}

const RAW: Record<string, CountryDef> = {};

function add(iso3: string, name: string, aliases: string[] = [], historical?: string): void {
  const def: CountryDef = historical ? { iso3, name, historical } : { iso3, name };
  RAW[name.toLowerCase()] = def;
  for (const alias of aliases) RAW[alias.toLowerCase()] = def;
}

// ── Current states ────────────────────────────────────────────
add('USA', 'United States', [
  'united states of america',
  'us',
  'u.s.',
  'usa',
  'america',
  'united states army',
]);
add('RUS', 'Russia', ['russian federation']);
add('CHN', 'China', ["people's republic of china", 'prc', 'chinese']);
add('GBR', 'United Kingdom', ['uk', 'britain', 'great britain', 'england', 'british']);
add('DEU', 'Germany', ['federal republic of germany']);
add('FRA', 'France', ['french republic']);
add('ITA', 'Italy');
add('ISR', 'Israel');
add('JPN', 'Japan');
add('KOR', 'South Korea', ['republic of korea', 'korea, south']);
add('PRK', 'North Korea', ["democratic people's republic of korea"]);
add('IND', 'India');
add('PAK', 'Pakistan');
add('IRN', 'Iran');
add('IRQ', 'Iraq');
add('TUR', 'Turkey', ['türkiye', 'turkiye']);
add('SWE', 'Sweden');
add('CHE', 'Switzerland');
add('AUT', 'Austria');
add('BEL', 'Belgium');
add('NLD', 'Netherlands', ['holland']);
add('ESP', 'Spain');
add('POL', 'Poland');
add('CZE', 'Czech Republic', ['czechia']);
add('SVK', 'Slovakia');
add('UKR', 'Ukraine');
add('BLR', 'Belarus');
add('FIN', 'Finland');
add('NOR', 'Norway');
add('DNK', 'Denmark');
add('BRA', 'Brazil');
add('ARG', 'Argentina');
add('CAN', 'Canada');
add('AUS', 'Australia');
add('NZL', 'New Zealand');
add('ZAF', 'South Africa');
add('EGY', 'Egypt');
add('SAU', 'Saudi Arabia');
add('ARE', 'United Arab Emirates', ['uae']);
add('SRB', 'Serbia');
add('HRV', 'Croatia');
add('ROU', 'Romania');
add('BGR', 'Bulgaria');
add('HUN', 'Hungary');
add('GRC', 'Greece');
add('PRT', 'Portugal');
add('MEX', 'Mexico');
add('IDN', 'Indonesia');
add('SGP', 'Singapore');
add('THA', 'Thailand');
add('VNM', 'Vietnam');
add('PHL', 'Philippines');
add('MYS', 'Malaysia');
add('TWN', 'Taiwan', ['republic of china']);
add('COL', 'Colombia');
add('CHL', 'Chile');
add('PER', 'Peru');
add('NGA', 'Nigeria');
add('ETH', 'Ethiopia');
add('KEN', 'Kenya');
add('MAR', 'Morocco');
add('DZA', 'Algeria');
add('JOR', 'Jordan');
add('SYR', 'Syria');
add('LBN', 'Lebanon');
add('QAT', 'Qatar');
add('KWT', 'Kuwait');
add('AZE', 'Azerbaijan');
add('KAZ', 'Kazakhstan');
add('UZB', 'Uzbekistan');
add('GEO', 'Georgia');
add('ARM', 'Armenia');
add('IRL', 'Ireland');
add('SVN', 'Slovenia');
add('LTU', 'Lithuania');
add('LVA', 'Latvia');
add('EST', 'Estonia');

// ── Historical states, mapped to a successor for the map ──────
add('RUS', 'Soviet Union', ['ussr', 'soviet russia', 'russian empire'], 'Soviet Union');
add('DEU', 'Nazi Germany', ['german reich', 'third reich', 'wehrmacht'], 'Nazi Germany');
add('DEU', 'West Germany', ['federal republic of germany (1949–1990)'], 'West Germany');
add('DEU', 'East Germany', ['german democratic republic', 'gdr'], 'East Germany');
add('CZE', 'Czechoslovakia', [], 'Czechoslovakia');
add('SRB', 'Yugoslavia', ['socialist federal republic of yugoslavia'], 'Yugoslavia');
add('GBR', 'British Empire', [], 'British Empire');
add('JPN', 'Empire of Japan', [], 'Empire of Japan');
add('ITA', 'Kingdom of Italy', [], 'Kingdom of Italy');
add('AUT', 'Austria-Hungary', ['austro-hungarian empire'], 'Austria-Hungary');
add('TUR', 'Ottoman Empire', [], 'Ottoman Empire');

export const COUNTRIES = RAW;

/**
 * Resolve a free-text country string to a definition.
 * Tolerates the parenthetical and date suffixes common in infobox values.
 */
export function resolveCountry(input: string): CountryDef | undefined {
  const cleaned = input
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(1[89]\d{2}|20\d{2})\b/g, '')
    .replace(/[–—-]/g, ' ')
    .trim()
    .toLowerCase();

  if (!cleaned) return undefined;
  if (RAW[cleaned]) return RAW[cleaned];

  // Longest-alias substring match, so "Soviet Union / Russia" resolves and
  // short keys like "us" don't spuriously match inside other words.
  const keys = Object.keys(RAW).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length < 5) continue;
    if (cleaned.includes(key)) return RAW[key];
  }
  return undefined;
}

/** Split a multi-country infobox value into resolved definitions. */
export function resolveCountryList(input: string): CountryDef[] {
  const parts = input.split(/[,;/]|\band\b|\n/);
  const seen = new Set<string>();
  const out: CountryDef[] = [];

  for (const part of parts) {
    const def = resolveCountry(part);
    if (def && !seen.has(def.iso3 + (def.historical ?? ''))) {
      seen.add(def.iso3 + (def.historical ?? ''));
      out.push(def);
    }
  }
  return out;
}
