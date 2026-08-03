import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { countryCounts, type ListingEntry } from '@/lib/data';

/** Top design nations by number of entries originating there. */
export function CountryRail({ entries }: { entries: ListingEntry[] }) {
  const counts = countryCounts(entries);
  const nameByIso = new Map<string, string>();
  for (const entry of entries) {
    for (const country of entry.countries) {
      if (country.iso3 && !nameByIso.has(country.iso3)) nameByIso.set(country.iso3, country.name);
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([iso3, count]) => ({ iso3, count, name: nameByIso.get(iso3) ?? iso3 }));

  if (top.length === 0) return null;
  const max = top[0]?.count ?? 1;

  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading
          overline="Country Explorer"
          title="Where It Was Designed"
          action={
            <Link
              to="/countries"
              className="hidden shrink-0 items-center gap-1.5 text-caption text-fg-secondary transition-colors hover:text-fg sm:flex"
            >
              Open map <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </Reveal>

      <RevealGroup className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
        {top.map((country) => (
          <RevealItem key={country.iso3}>
            <Link
              to={`/countries/${country.iso3}`}
              className="group relative block overflow-hidden rounded-(--radius-card) bg-card px-5 py-4 transition-colors duration-300 hover:bg-elevated"
            >
              {/* Proportional fill doubles as the bar chart — no separate
                  visualisation needed at this density. */}
              <div
                className="absolute inset-y-0 left-0 -z-0 bg-accent-dim transition-all duration-500 ease-(--ease-out-expo) group-hover:bg-accent/20"
                style={{ width: `${(country.count / max) * 100}%` }}
                aria-hidden="true"
              />
              <div className="relative flex items-center justify-between gap-4">
                <span className="text-[0.9375rem] text-fg">{country.name}</span>
                <span className="tnum text-caption text-fg-tertiary">{country.count}</span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  );
}
