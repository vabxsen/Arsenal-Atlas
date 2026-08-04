import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { Container, FilterPill, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { decadeBuckets } from '@/lib/aggregates';
import { useListing } from '@/lib/data';
import { sizedImage } from '@shared/images';
import { useDocumentMeta } from '@/lib/seo';

export default function TimelinePage() {
  const { data: entries, isLoading } = useListing();
  const [activeDecade, setActiveDecade] = useState<number | null>(null);

  useDocumentMeta({
    title: 'Timeline | Arsenal Atlas',
    description:
      'A chronological view of military equipment by year of entry into service, from the nineteenth century to the present.',
    canonical: '/timeline',
  });

  const decades = useMemo(
    () =>
      decadeBuckets(entries ?? []).map(({ decade, entries: items }) => ({
        decade,
        items: items.sort((a, b) => (a.serviceStart ?? 0) - (b.serviceStart ?? 0)),
      })),
    [entries]
  );

  const visible = activeDecade
    ? decades.filter((bucket) => bucket.decade === activeDecade)
    : decades;

  if (isLoading) {
    return (
      <Container className="pb-32 pt-40">
        <Skeleton className="h-12 w-1/2 max-w-md" />
        <Skeleton className="mt-8 h-96 w-full" />
      </Container>
    );
  }

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">Chronology</p>
          <h1 className="mt-6 text-h1 text-fg">Timeline</h1>
          <p className="mt-4 max-w-[56ch] text-body text-fg-secondary">
            Equipment ordered by the year it entered service. Select a decade to focus, or scroll
            the full span.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter timeline by decade"
          >
            <FilterPill active={activeDecade === null} onClick={() => setActiveDecade(null)}>
              All
            </FilterPill>
            {decades.map((bucket) => (
              <FilterPill
                key={bucket.decade}
                active={activeDecade === bucket.decade}
                onClick={() =>
                  setActiveDecade(activeDecade === bucket.decade ? null : bucket.decade)
                }
                className="tnum"
              >
                {bucket.decade}s
                <span className="text-fg-tertiary">{bucket.items.length}</span>
              </FilterPill>
            ))}
          </div>
        </Reveal>
      </Container>

      <Container className="mt-16">
        {visible.map((bucket) => (
          <section key={bucket.decade} className="mt-16 first:mt-0">
            <Reveal>
              <SectionHeading
                overline={`${bucket.items.length} ${bucket.items.length === 1 ? 'entry' : 'entries'}`}
                title={`${bucket.decade}s`}
              />
            </Reveal>

            {/* The rule is the timeline spine; each row hangs its year off it. */}
            <RevealGroup as="ol" className="mt-8 border-l border-line pl-6" stagger={0.03}>
              {bucket.items.map((entry) => (
                <RevealItem as="li" key={entry.id}>
                  <Link
                    to={`/equipment/${entry.slug}`}
                    className="group relative flex items-center gap-5 border-b border-line py-4 transition-colors hover:border-line-strong"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -left-[1.6875rem] size-2 rounded-full bg-line-strong transition-colors duration-300 group-hover:bg-accent-bright"
                    />
                    <span className="tnum w-14 shrink-0 text-caption text-fg-tertiary">
                      {entry.serviceStart}
                    </span>
                    <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-base">
                      {entry.hero ? (
                        <img
                          src={sizedImage(entry.hero, 330, entry.heroWidth)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] text-fg">{entry.name}</p>
                      <p className="truncate text-caption text-fg-tertiary">
                        {entry.countries[0]?.name}
                      </p>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        ))}
      </Container>
    </div>
  );
}
