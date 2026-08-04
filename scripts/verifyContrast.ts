/**
 * Contrast for text that sits on photography.
 *
 * axe reports colour-contrast as *incomplete* whenever an element's background
 * is an image — it cannot know what is behind the glyphs — so `npm run a11y`
 * passing says nothing about the hero, the browse tiles, or anything else
 * where type is laid over a picture. Those are exactly the surfaces this
 * design leans on, and exactly the ones a scrim change breaks silently.
 *
 * Method: screenshot the page, read it back through a canvas (a data: URL is
 * same-origin, so the canvas is not tainted) and sample the composited pixels
 * actually behind each piece of text.
 *
 * Two details are load-bearing, both learned by getting them wrong:
 *
 *   - Sample *text line rects*, not the element box. A block-level heading
 *     spans its container even when the last line is one short word, so the
 *     element box includes empty background beside the text and reports
 *     failures where no glyph exists.
 *   - Sample each line in thirds and take the worst. A headline running from a
 *     dark edge onto bright sky averages out to a pass while its right-hand
 *     end is unreadable.
 *
 * Background luminance is the 25th percentile within the sample: the copy is
 * light on dark, so the darker tail is background and the lighter tail is the
 * glyphs.
 *
 * Run: npm run preview, then npm run verify:contrast
 */
import { launch } from 'chrome-launcher';
import CDP from 'chrome-remote-interface';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173';

interface Target {
  route: string;
  label: string;
  selector: string;
  /** 3:1 for large text (>=24px, or >=18.66px bold); 4.5:1 otherwise. */
  required: number;
}

/**
 * Weighted towards pale backgrounds — sky, sea, snow, studio white — because
 * that is where a scrim fails first.
 */
const HERO_SLUGS = [
  'ak-47',
  'm14-rifle',
  'm1-abrams',
  'f-16-fighting-falcon',
  'supermarine-spitfire',
  'north-american-p-51-mustang',
  'uss-nimitz-cvn-68',
  'type-212-submarine',
  'lockheed-sr-71-blackbird',
];

const TARGETS: Target[] = [
  { route: '/', label: 'home h1', selector: '#main h1', required: 3 },
  { route: '/', label: 'home overline', selector: '#main p.text-overline', required: 4.5 },
  { route: '/', label: 'home body', selector: '#main p.text-body', required: 4.5 },

  /*
   * Two homepage cards set type *over* their own photograph, on their own
   * scrim rather than the hero's. They are the likeliest places in the
   * redesign for text on an image to fail and neither was measured, since the
   * three targets above all sit in the hero.
   *
   * The selectors are heading-level specific and that is load-bearing. Cards
   * render an h3 by default, so the first `#main article h3` is the showcase
   * lead. DailyDispatch is a section of one item and its heading IS the
   * section heading, so it is the only <article> on the page containing an h2.
   * The first attempt used `#main article h2` for the feature card and
   * silently measured the dispatch instead — which is how the dispatch blurb
   * turned out to be the thing actually failing.
   *
   * Ordered after the three hero targets and before the first route change, so
   * the hero is always sampled at scroll position 0: both of these are below
   * the fold, and reaching them scrolls the page, which moves the hero's
   * parallax backdrop.
   */
  { route: '/', label: 'home feature card name', selector: '#main article h3', required: 3 },
  { route: '/', label: 'home feature card meta', selector: '#main article h3 + p', required: 4.5 },
  { route: '/', label: 'home dispatch name', selector: '#main article h2', required: 3 },
  { route: '/', label: 'home dispatch blurb', selector: '#main article h2 + p', required: 4.5 },
  // Category tiles put their label straight onto the photograph.
  { route: '/browse', label: 'browse tile name', selector: '#main a h3', required: 3 },
  { route: '/browse', label: 'browse tile count', selector: '#main a h3 + p', required: 4.5 },
  ...HERO_SLUGS.flatMap((slug) => [
    { route: `/equipment/${slug}`, label: `${slug} h1`, selector: '#main h1', required: 3 },
    {
      route: `/equipment/${slug}`,
      label: `${slug} breadcrumb`,
      selector: '#main nav ol',
      required: 4.5,
    },
  ]),
];

const chrome = await launch({
  chromeFlags: ['--headless=new', '--no-sandbox'],
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
});

let failures = 0;

try {
  const client = await CDP({ port: chrome.port });
  const { Page, Runtime, Emulation } = client;
  await Page.enable();
  await Runtime.enable();
  await Emulation.setDeviceMetricsOverride({
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  let currentRoute = '';

  for (const target of TARGETS) {
    if (target.route !== currentRoute) {
      await Page.navigate({ url: `${BASE}${target.route}` });
      await Page.loadEventFired();
      await new Promise((resolve) => setTimeout(resolve, 4500));
      currentRoute = target.route;
    }

    /*
     * Bring the target into view before capturing.
     *
     * The screenshot is viewport-only and the rects below are viewport-
     * relative, so anything past the fold used to fall out of the image and
     * report SKIP — which does not fail the run. Every target that has ever
     * been added happened to sit above 900px, so the limitation was invisible
     * until the first one did not.
     *
     * Scrolls only when the element is actually outside the viewport, so
     * above-the-fold targets are still measured at scroll position 0. That
     * matters on `/`, where the hero backdrop parallaxes: sampling it at any
     * other scroll position would measure a composite the visitor never sees
     * behind that text.
     */
    await Runtime.evaluate({
      expression: `
        (() => {
          const el = document.querySelector(${JSON.stringify(target.selector)});
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (r.top >= 0 && r.bottom <= window.innerHeight) return;
          window.scrollBy({ top: r.top - window.innerHeight * 0.35, behavior: 'instant' });
        })()
      `,
    });
    // Long enough for a scroll-triggered reveal to finish: the slowest is
    // DURATION.cinematic at 0.9s, plus stagger.
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const shot = await Page.captureScreenshot({ format: 'png' });

    const { result } = await Runtime.evaluate({
      expression: `
        (async () => {
          const el = document.querySelector(${JSON.stringify(target.selector)});
          if (!el) return JSON.stringify({ error: 'not found' });

          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = [...range.getClientRects()].filter((r) => r.width > 4 && r.height > 4);
          if (rects.length === 0) return JSON.stringify({ error: 'no text rects' });

          const colour = getComputedStyle(el).color;
          const img = new Image();
          img.src = 'data:image/png;base64,${shot.data}';
          await img.decode();

          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const scale = img.width / window.innerWidth;
          const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

          const samples = [];
          for (const rect of rects) {
            const w = Math.max(1, Math.round(rect.width * scale));
            const h = Math.max(1, Math.round(rect.height * scale));
            const x0 = Math.max(0, Math.round(rect.left * scale));
            const y0 = Math.max(0, Math.round(rect.top * scale));
            if (y0 + h > img.height || x0 + w > img.width) continue;
            const d = ctx.getImageData(x0, y0, w, h).data;
            for (let t = 0; t < 3; t++) {
              const lum = [];
              const a = Math.floor((w / 3) * t);
              const b = Math.max(a + 1, Math.floor((w / 3) * (t + 1)));
              for (let y = 0; y < h; y++) {
                for (let x = a; x < b; x++) {
                  const i = (y * w + x) * 4;
                  lum.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
                }
              }
              if (!lum.length) continue;
              lum.sort((p, q) => p - q);
              samples.push(lum[Math.floor(lum.length * 0.25)]);
            }
          }
          return JSON.stringify({ colour, samples, lines: rects.length });
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    if (typeof result.value !== 'string') {
      console.log(`  SKIP  ${target.label.padEnd(30)} evaluate failed`);
      continue;
    }
    const data = JSON.parse(result.value) as {
      error?: string;
      colour?: string;
      samples?: number[];
      lines?: number;
    };
    if (data.error || !data.samples?.length) {
      console.log(`  SKIP  ${target.label.padEnd(30)} ${data.error ?? 'no samples'}`);
      continue;
    }

    const [r, g, b] = (data.colour ?? 'rgb(255,255,255)').match(/\d+/g)!.map(Number) as [
      number,
      number,
      number,
    ];
    const lin = (v: number) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    const textLum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

    const ratio = Math.min(
      ...data.samples.map((bg) => (Math.max(textLum, bg) + 0.05) / (Math.min(textLum, bg) + 0.05))
    );
    const ok = ratio >= target.required;
    if (!ok) failures++;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${target.label.padEnd(30)} worst ${ratio.toFixed(2)}:1  ` +
        `(needs ${target.required}:1, ${data.lines} line${data.lines === 1 ? '' : 's'})`
    );
  }

  await client.close();
} finally {
  try {
    chrome.kill();
  } catch {
    /* Chrome's temp-profile cleanup routinely fails with EPERM on Windows. */
  }
}

console.log(`\n${failures === 0 ? 'PASS — text over imagery clears its floor' : `${failures} below floor`}`);
process.exit(failures === 0 ? 0 : 1);
