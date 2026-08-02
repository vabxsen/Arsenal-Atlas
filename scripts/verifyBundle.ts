/**
 * Asserts the bundle's load-bearing boundaries against the built output.
 *
 * Two chunks must never reach a normal visitor: the Firebase SDK (~207 KB
 * gzipped, only needed to sign in) and the admin dashboard (~35 KB gzipped,
 * only usable with the admin claim). Both are reached exclusively through
 * dynamic imports, and both are excluded from the service-worker precache.
 *
 * That arrangement is easy to break from a distance and impossible to notice
 * by eye. Naming the admin chunks through a manual chunk, for instance, made
 * the bundler fold react-query and lucide's icon factory into them; because
 * the rest of the app needs those, the entry gained a *static* import of the
 * admin chunk and every visitor started downloading the dashboard. The build
 * succeeded, every test passed, and the only visible symptom was a number in
 * a size table.
 *
 * Run: npm run verify:bundle   (after `npm run build`)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const ASSETS = join(DIST, 'assets');

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n      ${detail}` : ''}`);
  if (!ok) failures++;
};

const files = await readdir(ASSETS);
const entry = files.find((f) => /^index-[^/]+\.js$/.test(f));
if (!entry) {
  console.error('No entry chunk in dist/assets — run `npm run build` first.');
  process.exit(1);
}

const html = await readFile(join(DIST, 'index.html'), 'utf8');
const entrySource = await readFile(join(ASSETS, entry), 'utf8');
const sw = await readFile(join(DIST, 'sw.js'), 'utf8');

/** Static ESM imports only — dynamic ones live in the lazy-chunk dep map. */
const staticImports = [...entrySource.matchAll(/from"\.\/([^"]+)"/g)].map((m) => m[1] as string);
const preloaded = [...html.matchAll(/rel="modulepreload"[^>]*href="\/assets\/([^"]+)"/g)].map(
  (m) => m[1] as string
);
const precached = [...sw.matchAll(/"(assets\/[^"]+\.js)"/g)].map((m) => m[1] as string);

console.log(`\nentry chunk: ${entry}`);
console.log(`  static imports : ${staticImports.join(', ') || '(none)'}`);
console.log(`  modulepreloads : ${preloaded.join(', ') || '(none)'}\n`);

for (const [label, pattern] of [
  ['firebase', /^firebase-/],
  ['admin', /^admin-/],
] as const) {
  const chunks = files.filter((f) => pattern.test(f) && f.endsWith('.js'));
  check(`${label}: at least one chunk exists`, chunks.length > 0, chunks.join(', '));

  check(
    `${label}: not statically imported by the entry`,
    !staticImports.some((f) => pattern.test(f)),
    staticImports.filter((f) => pattern.test(f)).join(', ')
  );

  check(
    `${label}: not modulepreloaded in index.html`,
    !preloaded.some((f) => pattern.test(f)),
    preloaded.filter((f) => pattern.test(f)).join(', ')
  );

  check(
    `${label}: not in the service-worker precache`,
    !precached.some((f) => pattern.test(f.replace('assets/', ''))),
    precached.filter((f) => pattern.test(f.replace('assets/', ''))).join(', ')
  );
}

/**
 * zod is the browser's only runtime use of shared/schema.ts — every other
 * import of it in src/ is type-only and erases at build. If it turns up in a
 * chunk a visitor loads, something started validating at runtime on a content
 * page and ~50 KB came along with it.
 */
const zodInEntry = /zod/i.test(entrySource) || staticImports.some((f) => /^admin-/.test(f));
check('zod stays out of the entry chunk', !zodInEntry);

console.log(`\n${failures === 0 ? 'PASS — bundle boundaries intact' : `${failures} failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
