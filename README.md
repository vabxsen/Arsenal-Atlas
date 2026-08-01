# Arsenal Atlas

A premium encyclopedia of the world's military equipment — 382 entries across 43 categories,
from service pistols to nuclear-powered aircraft carriers.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

No Firebase credentials are needed, and no seed step either — the served corpus is committed
under `public/data/`. Run `npm run seed` only to refresh it from Wikimedia (~80 s cold, ~4 s
warm); it also regenerates the gitignored `data/` blob that `npm run push` consumes.

**Live:** https://arsenalatlas.firebaseapp.com

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, build, then prerender 431 route shells + sitemap |
| `npm run preview` | Serve `dist/` on :4173 |
| `npm run seed` | Fetch, normalise, validate, and export the corpus |
| `npm run push` | Push the corpus into Firestore (emulator by default) |
| `npm run a11y` | axe-core audit across every route type (needs `preview` running) |
| `npm run verify:images` | Check prerendered og:image URLs resolve on the Commons CDN |
| `npm run emulators` | Firebase Auth + Firestore emulators |
| `npm run lint` / `npm run typecheck` | ESLint (zero warnings) / `tsc --noEmit` |

## Audit results

Lighthouse 13, desktop preset, against `npm run preview`. axe-core 4.12 across 8 routes.

| Route | Perf | A11y | Best Practices | SEO | LCP | CLS | JS |
|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 77 | 100 | 0.6 s | 0 | 161 KB |
| `/saved` | 100 | 100 | **100** | 100 | 0.6 s | 0 | 164 KB |
| `/timeline` | 100 | 100 | 77 | 100 | 0.6 s | 0 | 164 KB |
| `/browse` | 99 | 100 | 77 | 100 | 0.8 s | 0 | 164 KB |
| `/category/tanks` | 96 | 100 | 77 | 100 | 1.4 s | 0 | 164 KB |
| `/equipment/:slug` | 93 | 100 | 77 | 100 | 1.7 s | 0 | 168 KB |

axe-core: **0 violations across 18 combinations** — 9 routes x both themes.

Against the deployed site the numbers are a little better, because Firebase's CDN beats
`vite preview` — `/` 99–100, `/browse` 97, `/equipment/:slug` **95**, all at CLS 0. (A cold
first run reports lower; take the warm runs.)

`/saved` scoring 100 on Best Practices while every other route scores 77 isolates the cause
exactly: it is the only route with no Wikimedia imagery on it.

Two scores are capped by deliberate architecture choices rather than defects:

- **Best Practices 77** — `upload.wikimedia.org` sets a third-party cookie when serving
  images. Unavoidable while hotlinking; it goes away only by mirroring images onto our own
  origin, which needs Firebase Storage and a billing plan.
- **Detail pages 93, not 95+** — the body is client-rendered, so ~730 ms of the LCP is React
  booting and fetching the entry before the hero can paint. Closing that needs real SSR/SSG
  of the body, not just the head. Hero requests are capped at 1280 px
  (`HERO_MAX_WIDTH`) because several heroes are multi-megabyte transparent PNGs and the
  hero always sits under a heavy scrim.

Note that hotlinking also rules out serving WebP/AVIF: we cannot re-encode images we do not
host, so responsive sizing is the only lever available on image weight.

## User features

Favorites, recently-viewed, theme, and search history are **local-first**: they live in
localStorage and work with no account and no Firebase config at all. Signing in only adds
cross-device sync for favorites — a reference site should not require an account to let
someone keep a reading list.

The Firebase SDK (~172 KB gzipped) is therefore loaded **on demand**, never at startup, and
is excluded from the service-worker precache. In a build with no credentials it is never
fetched at all. Every `firebase/*` import in `src/` is dynamic; adding a static one silently
puts 172 KB back on every page load, so don't.

Recently-viewed is deliberately device-local and never synced — it is browsing history, and
uploading it is a privacy cost with little user benefit.

Themes are `dark` (canonical) / `light` / `system`. The resolved theme is applied by a
blocking inline script in `index.html` before first paint; doing it in React would flash the
wrong theme on every load. Both themes are contrast-audited in CI via `npm run a11y`.

## Architecture

```
shared/          Types, zod schema, taxonomy, country table — used by app AND pipeline
scripts/seed/    ETL: Wikipedia + Commons -> validated Equipment documents
src/features/    Feature-scoped UI (search, browse, equipment, compare, countries, timeline)
src/components/  Design-system primitives and motion wrappers
src/lib/         Tokens-adjacent helpers: data access, images, motion, SEO, Firebase
```

### Where the data comes from

The pipeline reads three Wikimedia endpoints per article and validates the result against
`shared/schema.ts` before anything is written:

- **REST summary** → lead paragraph, description, hero image, revision id
- **`action=parse`** → raw wikitext, from which infoboxes are extracted and parsed
- **`generator=images`** → gallery candidates with per-file licence and author
- **`prop=redirects`** → alternate names, which become search aliases

Responses are cached on disk in `.cache/`, so re-running the seed costs no network traffic
and iterating on the normaliser is instant.

### Two things that are load-bearing and non-obvious

**Wikimedia thumbnail widths are not arbitrary.** Commons no longer renders thumbnails on
demand for hotlinked requests. Widths `330 / 500 / 960 / 1280 / 1920` are pre-rendered and
work; anything else returns HTTP 400. `src/lib/images.ts` snaps to that ladder — changing
those numbers will silently break every image on the site.

**Content is CC BY-SA 4.0.** Article prose is adapted from Wikipedia, so attribution is a
licence obligation, not a courtesy. Every entry carries `sources[]` with licence and a pinned
revision id; every image carries its own licence and author. The footer and each detail page
render these. Removing them would make the site non-compliant.

### Read path

Firestore is the system of record and the admin write target. Content pages read a build-time
static export (`public/data/`) — one cached CDN request per entry, free to serve, works
offline through the service worker. Search reads a single ~52 KB gzipped index and runs
entirely in memory, so keystrokes cost nothing.

## Firebase

Everything works without credentials. To use the emulators:

```bash
cp .env.example .env.local     # VITE_USE_EMULATORS=true is already set
npm run emulators              # terminal 1
npm run push                   # terminal 2 — loads the corpus into Firestore
```

`firestore.rules` is world-readable for content and gated on an `admin` custom claim for
writes. The admin dashboard UI is not built yet, but the rules and route guard ship now so
the write path is never open in the meantime.

## Adding a category

1. Add a `CategoryDef` to `CATEGORIES` in `shared/taxonomy.ts`.
2. If it needs specs no existing `EquipmentKind` covers, add the kind and a field map in
   `scripts/seed/specMap.ts`.
3. Add entries to `CATALOG` in `scripts/seed/catalog.ts` and re-run `npm run seed`.

Nothing else is category-aware — nav, grids, filters, breadcrumbs, and the country explorer
all derive from the taxonomy.

## Licence

Two different licences apply, and the distinction matters:

- **Source code** — MIT, per `LICENSE`.
- **Bundled corpus** (`public/data/**`, `public/search-index.json`) — adapted from Wikipedia
  and therefore **CC BY-SA 4.0**. Share-alike, and *not* MIT-compatible. Every entry carries
  `sources[]` with the licence and a pinned revision id; every image carries its own licence
  and author, and both render in the UI.

If you reuse the data, you inherit CC BY-SA obligations even though the code is MIT.
Photography is courtesy of Wikimedia Commons and public-domain government sources.

Arsenal Atlas is an educational reference and is not affiliated with any government or
manufacturer.
