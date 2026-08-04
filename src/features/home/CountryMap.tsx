import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { DATA_LABEL } from '@/components/ui/styles';
import { countryCounts, type ListingEntry } from '@/lib/data';

/**
 * Section 06 — the corpus as a map.
 *
 * The homepage previously showed the same information as twelve tinted bars.
 * A choropleth says the thing the bars could not: that this collection is
 * overwhelmingly a record of a handful of industrial states, and that most of
 * the map is empty.
 *
 * The map is deferred hard. `WorldMap` pulls d3-geo and topojson-client and
 * needs a 105 KB topology, none of which may touch the homepage's critical
 * path — `/` scores 100 with a 0.6s LCP and this section is four screens down.
 * So: a dynamic import behind an IntersectionObserver that fires 400px early,
 * with a fixed-aspect skeleton holding the box so nothing reflows when it
 * arrives. The query key matches CountriesPage's exactly, so scrolling past
 * here warms the cache for /countries.
 */
const WorldMap = lazy(() =>
  // Named export, so the default-shape shim is required rather than optional.
  import('@/features/countries/WorldMap').then((module) => ({ default: module.WorldMap }))
);

interface TopoJson {
  type: 'Topology';
  objects: { countries: unknown };
  arcs: unknown;
  transform?: unknown;
}

export function CountryMap({ entries }: { entries: ListingEntry[] }) {
  const navigate = useNavigate();
  const frameRef = useRef<HTMLDivElement>(null);
  // Lazily initialised rather than set from inside the effect: no
  // IntersectionObserver (jsdom, very old Safari) simply means load eagerly,
  // and deciding that at mount avoids a cascading render.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { data: topology } = useQuery<TopoJson>({
    queryKey: ['world-atlas'],
    queryFn: async () => {
      const response = await fetch('/data/countries-110m.json');
      if (!response.ok) throw new Error('Failed to load world atlas');
      return (await response.json()) as TopoJson;
    },
    enabled: near,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const counts = countryCounts(entries);

  /*
   * Names come from the entries, not from a lookup.
   *
   * `resolveCountry` maps free text to a definition — it is the seed's
   * name-to-code direction, and calling it with an ISO3 only works where the
   * code happens to also be an alias: "USA" resolved and "RUS" rendered as
   * literally "RUS" in the ranking. The corpus already carries both halves on
   * every entry, so index them. Same approach as CountriesPage.
   */
  const nameByIso = new Map<string, string>();
  for (const entry of entries) {
    for (const country of entry.countries) {
      if (country.iso3 && !nameByIso.has(country.iso3)) nameByIso.set(country.iso3, country.name);
    }
  }

  const ranked = [...counts.entries()]
    .map(([iso3, count]) => ({ iso3, count, name: nameByIso.get(iso3) ?? iso3 }))
    .sort((a, b) => b.count - a.count);
  const busiest = ranked[0]?.count ?? 1;

  return (
    <div className="mt-section">
      <Container>
        <Reveal>
          <SectionHeading
            index="05"
            overline="Country Explorer"
            title="Where It Was Designed"
            action={
              <p className={`${DATA_LABEL} hidden sm:block`}>{ranked.length} nations of origin</p>
            }
          />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <Reveal>
            <div ref={frameRef} className="field-radar relative rounded-(--radius-card)">
              {/* aspect-video matches the map's own 960x500 viewBox closely
                  enough that the swap from skeleton to SVG moves nothing. */}
              {topology ? (
                <Suspense fallback={<Skeleton className="aspect-video w-full" />}>
                  <WorldMap
                    topology={topology}
                    counts={counts}
                    selected={null}
                    onSelect={(iso3) => {
                      if (iso3) void navigate(`/countries/${iso3}`);
                    }}
                  />
                </Suspense>
              ) : (
                <Skeleton className="aspect-video w-full" />
              )}
            </div>
          </Reveal>

          <Reveal>
            {/* The keyboard- and screen-reader-accessible equivalent of the
                map, and a ranking in its own right — the SVG alone would
                strand non-pointer users. */}
            <ol className="flex flex-col">
              {ranked.slice(0, 8).map((country, index) => (
                <li key={country.iso3}>
                  <a
                    href={`/countries/${country.iso3}`}
                    onClick={(event) => {
                      event.preventDefault();
                      void navigate(`/countries/${country.iso3}`);
                    }}
                    className="group relative flex items-center gap-4 border-b border-line py-3.5 transition-colors hover:border-line-strong"
                  >
                    <span className={`${DATA_LABEL} w-6 shrink-0`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 truncate text-[0.9375rem] text-fg-secondary transition-colors group-hover:text-fg">
                      {country.name}
                    </span>
                    {/* The bar is the data, in olive — a material colour, so it
                        never reads as something to click. */}
                    <span aria-hidden="true" className="hidden h-1.5 w-28 bg-line sm:block">
                      <span
                        className="block h-full bg-olive"
                        style={{ width: `${(country.count / busiest) * 100}%` }}
                      />
                    </span>
                    <span className="tnum w-8 shrink-0 text-right text-caption text-fg-tertiary">
                      {country.count}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </Container>
    </div>
  );
}
