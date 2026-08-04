/**
 * Guards the three copies of the palette against drift.
 *
 * src/styles/index.css declares the same colour tokens three times: once in
 * `@theme` (the canonical dark set), once in `.on-dark` (photographic regions,
 * which must stay dark whatever the page theme is), and once in
 * `:root[data-theme='light']` (different values, same keys).
 *
 * Nothing enforced that. Adding a token to `@theme` and forgetting `.on-dark`
 * means a hero silently picks up the light value in light mode; forgetting the
 * light block means light mode inherits the *dark* value from :root. Both are
 * invisible until someone screenshots the other theme, and neither is
 * something axe or verify:contrast can see — axe never visits a hero in the
 * wrong theme with the right element focused, and the contrast sampler only
 * looks at nine specific pages.
 *
 * So: two assertions.
 *   1. Every property `.on-dark` declares has a byte-identical value in
 *      `@theme`. `.on-dark` is a verbatim copy by definition — if it needs a
 *      *different* value from `@theme`, the token is wrong, not the copy.
 *   2. Every mirrored-family token in `@theme` is present in both `.on-dark`
 *      and the light block. Presence only for light, since its whole job is
 *      to hold different values.
 *
 * Deliberately not a browser test: it is a file read and two regexes, so it
 * costs nothing and can run on every gate pass.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = join(root, 'src', 'styles', 'index.css');

/**
 * Families that describe a *surface or the ink on it*, and therefore have to
 * exist in all three blocks. Everything else in `@theme` — typography, radii,
 * easing, shadows, layout — is theme-invariant and correctly declared once.
 */
const MIRRORED = [
  /^--color-(deep|base|card|elevated|raised)$/,
  /^--color-line(-strong|-glow)?$/,
  /^--color-grid(-strong)?$/,
  /^--color-fg(-secondary|-tertiary)?$/,
  /^--color-accent(-bright|-dim)?$/,
  /^--color-(olive|steel|titanium)$/,
];

/**
 * --color-scrim is theme-invariant by construction: it is the black a
 * photographic gradient is built from, and a scrim that inverted with the
 * theme would bleach the photograph it sits on. It is declared once, in
 * `@theme`, and must NOT appear in the other two blocks.
 *
 * The semantic trio is shared as-is; danger/success/warning read the same in
 * both themes and are admin-surface only.
 */
const INVARIANT = new Set(['--color-scrim', '--color-danger', '--color-success', '--color-warning']);

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n        ${detail}` : ''}`);
  if (!ok) failures++;
};

/**
 * Extracts a block by its opening selector, matching braces rather than
 * stopping at the first `}` — the light block contains a nested `.glass`
 * rule, and a naive match would truncate there and silently check nothing.
 *
 * Expects comment-free input. Selectors are discussed *by name* in the
 * comments (the `@theme` note on --color-scrim says it is absent from
 * `.on-dark`), so searching the raw file finds the prose before the rule and
 * then brace-walks into whatever follows. That produced a confident,
 * completely wrong diff on first run.
 */
function block(css: string, selector: string): string {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found in index.css: ${selector}`);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i);
  }
  throw new Error(`unbalanced braces after ${selector}`);
}

/** Custom properties declared directly in a block. */
function props(source: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1]!, m[2]!.trim().toLowerCase());
  }
  return out;
}

const css = (await readFile(CSS, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
const theme = props(block(css, '@theme'));
const onDark = props(block(css, '.on-dark'));
const light = props(block(css, ":root[data-theme='light']"));

console.log(
  `\npalette drift — @theme ${theme.size} · .on-dark ${onDark.size} · light ${light.size}\n`
);

// 1. .on-dark is a verbatim copy.
const mismatched: string[] = [];
for (const [name, value] of onDark) {
  const canonical = theme.get(name);
  if (canonical === undefined) mismatched.push(`${name}: absent from @theme`);
  else if (canonical !== value) mismatched.push(`${name}: @theme ${canonical} vs .on-dark ${value}`);
}
check(
  '.on-dark values are identical to @theme',
  mismatched.length === 0,
  mismatched.join('\n        ')
);

// 2. Nothing invariant leaks into a themed block.
const leaked = [...INVARIANT].filter((n) => onDark.has(n) || light.has(n));
check(
  'theme-invariant tokens are declared once',
  leaked.length === 0,
  leaked.length ? `${leaked.join(', ')} must live only in @theme` : ''
);

// 3. Every mirrored family is complete in both overrides.
const mirrored = [...theme.keys()].filter(
  (n) => !INVARIANT.has(n) && MIRRORED.some((re) => re.test(n))
);
for (const [label, set] of [
  ['.on-dark', onDark],
  ['light theme', light],
] as const) {
  const missing = mirrored.filter((n) => !set.has(n));
  check(
    `${label} covers every mirrored token`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : ''
  );
}

console.log(
  failures === 0
    ? `\nPASS — ${mirrored.length} mirrored tokens consistent across three blocks\n`
    : `\nFAIL — ${failures} drift check(s) failed\n`
);
process.exit(failures === 0 ? 0 : 1);
