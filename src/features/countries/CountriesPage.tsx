import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { countryCounts, useListing } from '@/lib/data';
import { useDocumentMeta } from '@/lib/seo';
import { WorldMap } from './WorldMap';

export default function CountriesPage() {
  const { iso3 } = useParams<{ iso3: string }>();
  const navigate = useNavigate();
  const { data: entries, isLoading } = useListing();
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const { data: topology } = useQuery({
    queryKey: ['world-atlas'],
    // Lazily fetched and cached: the map is 105 KB and only this route needs it.
    queryFn: async () => {
      const res = await fetch('/data/countries-110m.json');
      if (!res.ok) throw new Error('Failed to load map data');
      return res.json() as Promise<Parameters<typeof WorldMap>[0]['topology']>;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const selected = iso3 ?? null;
  const counts = useMemo(() => countryCounts(entries ?? []), [entries]);

  const nameByIso = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries ?? []) {
      for (const country of entry.countries) {
        if (country.iso3 && !map.has(country.iso3)) map.set(country.iso3, country.name);
      }
    }
    return map;
  }, [entries]);

  const ranked = useMemo(
    () =>
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => ({ iso3: code, count, name: nameByIso.get(code) ?? code })),
    [counts, nameByIso]
  );

  const selectedName = selected ? (nameByIso.get(selected) ?? selected) : null;
  const selectedEntries = useMemo(
    () =>
      selected
        ? (entries ?? [])
            .filter((entry) => entry.countries.some((c) => c.iso3 === selected))
            .sort((a, b) => b.popularity - a.popularity)
        : [],
    [entries, selected]
  );

  useDocumentMeta({
    title: selectedName
      ? `${selectedName} — Equipment by Country | Arsenal Atlas`
      : 'Country Explorer | Arsenal Atlas',
    description: selectedName
      ? `Military equipment designed in ${selectedName}, with manufacturers and service history.`
      : 'Explore military equipment by country of origin on an interactive world map.',
    canonical: selected ? `/countries/${selected}` : '/countries',
  });

  const select = (code: string | null) => {
    void navigate(code ? `/countries/${code}` : '/countries');
  };

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">Country Explorer</p>
          <h1 className="mt-6 text-h1 text-titanium">Where It Was Made</h1>
          <p className="mt-4 max-w-[56ch] text-body text-fg-secondary">
            {ranked.length} countries of origin across the collection. Select a country on the map
            or from the list.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <div className="rounded-(--radius-card) border border-line bg-card p-4 sm:p-8">
            {topology && !isLoading ? (
              <WorldMap
                topology={topology}
                counts={counts}
                selected={selected}
                onSelect={(code, name) => {
                  setHoveredName(name);
                  select(code);
                }}
              />
            ) : (
              <Skeleton className="aspect-video w-full" />
            )}
            {hoveredName ? <span className="sr-only">Selected {hoveredName}</span> : null}
          </div>
        </Reveal>

        {/* Keyboard- and screen-reader-accessible equivalent of the map.
            The SVG alone would strand non-pointer users. */}
        <Reveal className="mt-10">
          <SectionHeading overline="All Countries" title="By Number of Entries" />
          <ul className="mt-8 flex flex-wrap gap-2">
            {ranked.map((country) => (
              <li key={country.iso3}>
                <button
                  type="button"
                  onClick={() => select(country.iso3 === selected ? null : country.iso3)}
                  aria-pressed={country.iso3 === selected}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-caption transition-colors duration-200',
                    country.iso3 === selected
                      ? 'border-line-glow bg-elevated text-fg'
                      : 'border-line bg-card text-fg-secondary hover:border-line-strong hover:text-fg'
                  )}
                >
                  {country.name}
                  <span className="tnum text-fg-tertiary">{country.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>

      {selected && selectedEntries.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading
              overline="Designed in"
              title={`${selectedName} · ${selectedEntries.length} ${
                selectedEntries.length === 1 ? 'entry' : 'entries'
              }`}
            />
          </Reveal>
          <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
            {selectedEntries.map((entry) => (
              <RevealItem key={entry.id}>
                {/* Grid follows a SectionHeading <h2>. */}
                <EquipmentCard entry={entry} headingLevel={3} />
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      ) : null}
    </div>
  );
}
