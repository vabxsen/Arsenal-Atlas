/**
 * Responsive overflow audit.
 *
 * Asserts that no route scrolls horizontally at phone or tablet width, and
 * names the elements responsible when one does.
 *
 * Horizontal overflow is the single most common way a dark, image-led layout
 * breaks on a phone, and it is invisible to every other gate here: axe does not
 * model viewport width, verify:contrast screenshots a fixed 1440x900, and
 * Lighthouse's own check only reports that the page is wider than the screen,
 * not which element made it so. It is also the failure that most looks like
 * nobody tested — a page you can drag sideways to reveal a strip of background.
 *
 * The usual culprits are exactly the things this redesign added: full-bleed
 * sections, a horizontally scrolling carousel, wide data tables, and grids with
 * fixed-width children. Most of those are legitimate *inside* a scroll
 * container, which is why the check walks the DOM for offenders rather than
 * just comparing scrollWidth — a carousel that scrolls internally is correct,
 * a carousel that widens the document is not.
 *
 * Requires the preview server: `npm run preview` then `npm run verify:responsive`.
 */
import { launch } from 'chrome-launcher';
import CDP from 'chrome-remote-interface';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173';

const ROUTES = [
  '/',
  '/browse',
  '/category/tanks',
  '/equipment/ak-47',
  '/compare?add=ak-47&add=m16-rifle',
  '/countries/USA',
  '/conflicts',
  '/conflicts/vietnam-war',
  '/timeline',
  '/saved',
  '/does-not-exist',
];

/** iPhone 14 and a small tablet — the two widths where the grid breakpoints change. */
const VIEWPORTS = [
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
] as const;

/**
 * A few pixels of slack.
 *
 * Sub-pixel layout rounding and a scrollbar-less overlay can leave
 * documentElement.scrollWidth a hair over the viewport on a page that is
 * visually fine. Two pixels is below the threshold of a drag anyone would
 * notice and well under the width of a real overflow.
 */
const TOLERANCE = 2;

interface Offender {
  selector: string;
  right: number;
  width: number;
}

interface Report {
  scrollWidth: number;
  innerWidth: number;
  offenders: Offender[];
}

const chrome = await launch({
  chromeFlags: ['--headless=new', '--no-sandbox', '--hide-scrollbars'],
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
});

let failures = 0;

try {
  const client = await CDP({ port: chrome.port });
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();

  for (const viewport of VIEWPORTS) {
    console.log(`\n  ── ${viewport.label} (${viewport.width}px) ${'─'.repeat(30)}`);

    await Emulation.setDeviceMetricsOverride({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 700,
    });

    for (const route of ROUTES) {
      await Page.navigate({ url: `${BASE}${route}` });
      await Page.loadEventFired();
      // The app is client-rendered; give it a beat to fetch and paint.
      await new Promise((resolve) => setTimeout(resolve, 2200));

      const { result } = await Runtime.evaluate({
        returnByValue: true,
        expression: `
          (() => {
            const limit = document.documentElement.clientWidth;
            const offenders = [];

            for (const el of document.body.querySelectorAll('*')) {
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') continue;

              const rect = el.getBoundingClientRect();
              if (rect.width === 0) continue;
              if (rect.right <= limit + ${TOLERANCE} && rect.left >= -${TOLERANCE}) continue;

              /*
               * Ignore anything already inside a horizontal scroll container.
               * A carousel wider than the screen is the entire point of a
               * carousel; it only matters if it widens the document.
               */
              let inScroller = false;
              for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                const overflow = getComputedStyle(p).overflowX;
                if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden') {
                  inScroller = true;
                  break;
                }
              }
              if (inScroller) continue;

              const id = el.id ? '#' + el.id : '';
              const cls = typeof el.className === 'string' && el.className
                ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
                : '';
              offenders.push({
                selector: el.tagName.toLowerCase() + id + cls,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
            }

            // Deepest elements first, then dedupe by selector: a wide child
            // drags every ancestor over the line, and only the child is the bug.
            const seen = new Set();
            const unique = [];
            for (const o of offenders.reverse()) {
              if (seen.has(o.selector)) continue;
              seen.add(o.selector);
              unique.push(o);
            }

            return {
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: limit,
              offenders: unique.slice(0, 5),
            };
          })()
        `,
      });

      const report = result.value as Report;
      const overflow = report.scrollWidth - report.innerWidth;
      const bad = overflow > TOLERANCE;
      if (bad) failures++;

      console.log(
        `  ${bad ? 'FAIL' : 'PASS'}  ${route.padEnd(34)} ${
          bad ? `+${overflow}px horizontal scroll` : 'no horizontal scroll'
        }`
      );
      for (const offender of bad ? report.offenders : []) {
        console.log(`          ${offender.selector} — ${offender.width}px, right edge ${offender.right}`);
      }
    }
  }

  await client.close();
} finally {
  try {
    // Not awaited: kill() is synchronous. And it throws EPERM on Windows when
    // Chrome still holds a handle to its own temp profile — a teardown detail
    // that must not fail a run whose results are already collected.
    chrome.kill();
  } catch {
    /* the process is going away regardless */
  }
}

console.log(
  failures === 0
    ? `\nPASS — no route scrolls sideways at 390px or 768px\n`
    : `\nFAIL — ${failures} route/viewport combination(s) overflow\n`
);
process.exit(failures === 0 ? 0 : 1);
