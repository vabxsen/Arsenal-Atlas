/**
 * Accessibility audit.
 *
 * Runs axe-core against every route type in a real Chrome instance. Lighthouse
 * covers a subset of the same rules; this catches the rest (form labels, ARIA
 * relationships, focus order) and reports per-route rather than per-page-load.
 *
 * Requires the preview server: `npm run preview` then `npm run a11y`.
 */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { launch } from 'chrome-launcher';
import CDP from 'chrome-remote-interface';

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173';
const ROUTES = [
  '/',
  '/browse',
  '/category/tanks',
  '/equipment/ak-47',
  '/compare?add=ak-47&add=m16-rifle',
  '/countries/USA',
  '/timeline',
  '/saved',
  // Only the guard is reachable here: the audit runs against a build with no
  // credentials, so /admin renders its "not configured" notice. The screens
  // behind the admin claim cannot be driven headlessly without minting a
  // custom token, and are not covered.
  '/admin',
  '/does-not-exist',
];

/**
 * Both themes are audited. Contrast is the most common failure class and it is
 * theme-specific — a palette that passes on near-black says nothing about the
 * same tokens on white.
 */
const THEMES = ['dark', 'light'] as const;

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[] }[];
}

const chrome = await launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  // Spread rather than assigned: under exactOptionalPropertyTypes an optional
  // property may be absent but not explicitly undefined.
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
});

let totalViolations = 0;
const summary: string[] = [];

try {
  const client = await CDP({ port: chrome.port });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  for (const theme of THEMES) {
    summary.push(`\n  ── ${theme} theme ─────────────────────────────────────`);

    for (const route of ROUTES) {
      // Seed the preference before navigation so the pre-paint bootstrap
      // script picks it up, rather than flipping the theme after audit.
      await Page.navigate({ url: `${BASE}/` });
      await Page.loadEventFired();
      await Runtime.evaluate({ expression: `localStorage.setItem('aa.theme', '${theme}')` });

      await Page.navigate({ url: `${BASE}${route}` });
      await Page.loadEventFired();
      // The app is client-rendered; give it a beat to fetch data and paint
      // before auditing, or axe sees an empty shell.
      await new Promise((resolve) => setTimeout(resolve, 2200));

      await Runtime.evaluate({ expression: axeSource });
      const { result } = await Runtime.evaluate({
        expression: `axe.run(document, {
          resultTypes: ['violations'],
          runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] }
        }).then(r => JSON.stringify(r.violations))`,
        awaitPromise: true,
        returnByValue: true,
      });

      const violations = JSON.parse((result.value as string) ?? '[]') as AxeViolation[];
      totalViolations += violations.length;

      const label = route.padEnd(34);
      if (violations.length === 0) {
        summary.push(`  PASS  ${label} no violations`);
      } else {
        summary.push(`  FAIL  ${label} ${violations.length} violation(s)`);
        for (const violation of violations) {
          summary.push(
            `          [${violation.impact ?? 'n/a'}] ${violation.id} — ${violation.help}`
          );
          for (const node of violation.nodes.slice(0, 3)) {
            summary.push(`            ${node.target.join(' ').slice(0, 96)}`);
          }
        }
      }
    }
  }

  await client.close();
} finally {
  // Chrome's temp-profile cleanup routinely fails with EPERM on Windows
  // because the browser process still holds the directory. That is a teardown
  // detail, not an audit result — swallowing it keeps the report from being
  // lost to an unrelated error.
  try {
    chrome.kill();
  } catch {
    /* ignore */
  }
}

console.log(`axe-core audit — ${ROUTES.length} routes x ${THEMES.length} themes`);
console.log(summary.join('\n'));
console.log(`\n${totalViolations} total violation(s)`);
if (totalViolations > 0) process.exitCode = 1;
