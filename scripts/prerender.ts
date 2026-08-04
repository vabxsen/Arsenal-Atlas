import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { buildConflictIndex, CONFLICT_PRERENDER_MIN } from '../shared/conflicts.ts';
import { CATEGORIES } from '../shared/taxonomy.ts';
import { HERO_MAX_WIDTH, sizedImage, wikimediaSrcSet } from '../shared/images.ts';
import { normalizeOrigin } from '../shared/site.ts';
import type { Equipment } from '../shared/schema.ts';

/**
 * Bakes per-route metadata into the built HTML.
 *
 * This is not full server-side rendering — the body is still rendered by
 * React. It exists because the things that must work *without* JavaScript are
 * all in the head: the title and description crawlers index, the Open Graph
 * tags link unfurlers read (Slack, iMessage, and Twitter do not execute JS),
 * the canonical URL, and the JSON-LD that drives rich results. A single
 * `index.html` shared by 430 routes would give every one of them the same
 * title and no structured data.
 *
 * Each equipment route additionally preloads its own hero image, which is the
 * LCP element — that preload is worth more to perceived speed than
 * prerendering the markup would be.
 */

const DIST = join(process.cwd(), 'dist');
const DATA = join(process.cwd(), 'data');
const SITE = normalizeOrigin(process.env.VITE_SITE_URL);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `</script>` inside JSON-LD would close the tag early. */
function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

interface RouteMeta {
  path: string;
  title: string;
  description: string;
  image?: string;
  preloadImage?: string;
  /** Must mirror the <img> the page renders, or the preload is wasted. */
  preloadSrcSet?: string;
  jsonLd?: unknown[];
}

function renderHead(meta: RouteMeta): string {
  const url = `${SITE}${meta.path}`;
  const image = meta.image ? (meta.image.startsWith('http') ? meta.image : `${SITE}${meta.image}`) : `${SITE}/og-default.png`;

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="${meta.path.startsWith('/equipment/') ? 'article' : 'website'}">`,
    `<meta property="og:site_name" content="Arsenal Atlas">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ];

  if (meta.preloadImage) {
    // imagesrcset/imagesizes must match the rendered <img> exactly. A bare
    // href preload would fetch one fixed rendition while the responsive <img>
    // selects another — two downloads, and the LCP image arriving late.
    const responsive = meta.preloadSrcSet
      ? ` imagesrcset="${escapeHtml(meta.preloadSrcSet)}" imagesizes="100vw"`
      : '';
    tags.push(
      `<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}"${responsive} fetchpriority="high">`
    );
  }

  for (const block of meta.jsonLd ?? []) {
    tags.push(`<script type="application/ld+json">${escapeJsonLd(block)}</script>`);
  }

  return tags.join('\n    ');
}

/**
 * Replace the template's placeholder head tags with the route's own.
 * Removing the originals matters: two <title> elements or two canonical links
 * are worse than none.
 */
function buildPage(template: string, meta: RouteMeta): string {
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
  html = html.replace(/<meta\s+name="description"[^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');

  return html.replace('</head>', `  ${renderHead(meta)}\n  </head>`);
}

/**
 * Written flat (`equipment/ak-47.html`) rather than as a directory index
 * (`equipment/ak-47/index.html`), and paired with `"cleanUrls": true` in
 * firebase.json.
 *
 * Directory indexes only resolve at `/equipment/ak-47/`, so Firebase would
 * 301-redirect the un-slashed URL — the exact URL emitted as `<link
 * rel="canonical">` and listed in the sitemap. Serving the canonical URL
 * directly, with no redirect hop, is both faster and unambiguous for crawlers.
 */
async function writePage(path: string, html: string): Promise<void> {
  const file = path === '/' ? join(DIST, 'index.html') : join(DIST, `${path.slice(1)}.html`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, 'utf8');
}

const organisation = {
  '@type': 'Organization',
  name: 'Arsenal Atlas',
  url: SITE,
};

function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE}${crumb.path}`,
    })),
  };
}

async function main(): Promise<void> {
  const template = await readFile(join(DIST, 'index.html'), 'utf8');
  const entries = JSON.parse(await readFile(join(DATA, 'equipment.json'), 'utf8')) as Equipment[];

  const routes: RouteMeta[] = [];

  // ── Home ────────────────────────────────────────────────────
  routes.push({
    path: '/',
    title: "Arsenal Atlas — Explore the World's Military Arsenal",
    description:
      `A premium encyclopedia of the world's military equipment. Specifications, history, ` +
      `variants, and imagery for ${entries.length} entries across ${CATEGORIES.length} categories.`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Arsenal Atlas',
        url: SITE,
        publisher: organisation,
        // Enables the sitelinks search box in Google results.
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/browse?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  });

  // ── Static routes ───────────────────────────────────────────
  const staticRoutes: [string, string, string][] = [
    ['/browse', 'Browse All Categories | Arsenal Atlas', 'Browse military equipment by category — firearms, artillery, missiles, armour, aircraft, naval vessels, munitions, and soldier systems.'],
    ['/timeline', 'Timeline | Arsenal Atlas', 'A chronological view of military equipment by year of entry into service, from the nineteenth century to the present.'],
    ['/countries', 'Country Explorer | Arsenal Atlas', 'Explore military equipment by country of origin on an interactive world map.'],
    ['/conflicts', 'Conflicts | Arsenal Atlas', 'Every armed conflict referenced across the collection, from the World Wars to current campaigns — and the equipment that served in each.'],
    ['/compare', 'Compare Equipment | Arsenal Atlas', 'Compare up to four pieces of military equipment side by side, with differences highlighted.'],
    ['/saved', 'Saved | Arsenal Atlas', 'Your saved equipment and recently viewed entries.'],
  ];
  for (const [path, title, description] of staticRoutes) {
    routes.push({ path, title, description });
  }

  // ── Conflicts ───────────────────────────────────────────────
  /*
   * Only conflicts cited by two or more entries get a shell.
   *
   * 222 of 405 are cited exactly once, and a generated page for each would be
   * a heading, one card and nothing else — thin content that dilutes the
   * sitemap without helping anyone find anything. Singletons stay reachable
   * through the SPA and set their metadata at runtime via useDocumentMeta;
   * they just do not get prerendered head tags or a sitemap entry.
   */
  for (const conflict of buildConflictIndex(entries)) {
    if (conflict.count < CONFLICT_PRERENDER_MIN) continue;
    routes.push({
      path: `/conflicts/${conflict.slug}`,
      title: `${conflict.name} — ${conflict.count} Entries | Arsenal Atlas`,
      description: `${conflict.count} pieces of military equipment recorded as having served in the ${conflict.name}, with full specifications, history, and imagery.`,
      jsonLd: [
        breadcrumbs([
          { name: 'Conflicts', path: '/conflicts' },
          { name: conflict.name, path: `/conflicts/${conflict.slug}` },
        ]),
      ],
    });
  }

  // ── Categories ──────────────────────────────────────────────
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);

  for (const category of CATEGORIES) {
    const count = counts.get(category.slug) ?? 0;
    routes.push({
      path: `/category/${category.slug}`,
      title: `${category.name} — ${count} Entries | Arsenal Atlas`,
      description: `${category.blurb} Browse ${count} catalogued entries with full specifications, history, and imagery.`,
      jsonLd: [
        breadcrumbs([
          { name: 'Browse', path: '/browse' },
          { name: category.name, path: `/category/${category.slug}` },
        ]),
      ],
    });
  }

  // ── Equipment ───────────────────────────────────────────────
  for (const entry of entries) {
    const category = CATEGORIES.find((c) => c.slug === entry.category);
    const hero = entry.images.hero?.url;
    const heroWidth = entry.images.hero?.width;

    const route: RouteMeta = {
      path: `/equipment/${entry.slug}`,
      title: `${entry.name} — Specifications, History & Images | Arsenal Atlas`,
      description: entry.description.slice(0, 155).trim(),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: entry.name,
          description: entry.description.slice(0, 250),
          image: hero ? sizedImage(hero, 1280, heroWidth) : undefined,
          dateModified: entry.updatedAt,
          datePublished: entry.publishedAt,
          publisher: organisation,
          license: 'https://creativecommons.org/licenses/by-sa/4.0/',
          isBasedOn: entry.sources.map((source) => source.url),
          about: {
            '@type': 'Product',
            name: entry.name,
            category: category?.name ?? entry.category,
            ...(entry.manufacturers[0]
              ? { manufacturer: { '@type': 'Organization', name: entry.manufacturers[0].name } }
              : {}),
            ...(entry.countries[0] ? { countryOfOrigin: entry.countries[0].name } : {}),
          },
        },
        breadcrumbs([
          { name: 'Browse', path: '/browse' },
          { name: category?.name ?? entry.category, path: `/category/${entry.category}` },
          { name: entry.name, path: `/equipment/${entry.slug}` },
        ]),
      ],
    };

    if (hero) {
      route.image = sizedImage(hero, HERO_MAX_WIDTH, heroWidth);
      // Mirrors SmartImage on the detail hero, so the preload resolves to the
      // exact rendition the <img> will pick — including the same width cap.
      const cap = Math.min(heroWidth ?? HERO_MAX_WIDTH, HERO_MAX_WIDTH);
      route.preloadImage = sizedImage(hero, HERO_MAX_WIDTH, cap);
      const srcSet = wikimediaSrcSet(hero, cap);
      if (srcSet) route.preloadSrcSet = srcSet;
    }
    routes.push(route);
  }

  await Promise.all(routes.map((route) => writePage(route.path, buildPage(template, route))));

  // ── Sitemap ─────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const priority = (path: string) =>
    path === '/' ? '1.0' : path.startsWith('/equipment/') ? '0.8' : '0.6';

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    routes
      .map(
        (route) =>
          `  <url><loc>${SITE}${route.path}</loc><lastmod>${today}</lastmod>` +
          `<changefreq>monthly</changefreq><priority>${priority(route.path)}</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  await writeFile(join(DIST, 'sitemap.xml'), sitemap, 'utf8');

  // Generated rather than kept in public/, so the Sitemap line can never drift
  // from the origin used for canonical links. Overwrites the copy Vite copies
  // out of public/.
  const robots =
    `User-agent: *\n` +
    `Allow: /\n\n` +
    `# Interactive views hold no indexable content of their own.\n` +
    `Disallow: /compare?\n` +
    `Disallow: /saved\n\n` +
    `# Admin is gated on the admin custom claim; this only keeps it out of\n` +
    `# the index. The route also emits noindex at runtime, because it has no\n` +
    `# prerendered shell for a crawler to read the directive from.\n` +
    `Disallow: /admin\n\n` +
    `Sitemap: ${SITE}/sitemap.xml\n`;
  await writeFile(join(DIST, 'robots.txt'), robots, 'utf8');

  console.log(`Prerendered ${routes.length} routes for ${SITE}`);
  console.log(`  home + static   ${1 + staticRoutes.length}`);
  console.log(`  categories      ${CATEGORIES.length}`);
  console.log(`  equipment       ${entries.length}`);
  console.log(`Wrote dist/sitemap.xml`);
}

await main();
