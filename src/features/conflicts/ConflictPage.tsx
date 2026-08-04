import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { DATA_VALUE } from '@/components/ui/styles';
import { decadeBuckets } from '@/lib/aggregates';
import { useConflicts, useListing, type ListingEntry } from '@/lib/data';
import { useDocumentMeta } from '@/lib/seo';

/**
 * One conflict, and everything recorded as having served in it.
 *
 * The service-year distribution above the grid is the thing this page can say
 * that no other page can: the Vietnam War's equipment clusters in the 1950s
 * and 60s, the Russo-Ukrainian War's spreads across seventy years, and that
 * contrast is the actual history. It reuses the decade bucketing from
 * lib/aggregates so the floor and the arithmetic match the timeline exactly.
 */
export default function ConflictPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: conflicts, isLoading } = useConflicts();
  const { data: entries } = useListing();

  const conflict = conflicts?.find((candidate) => candidate.slug === slug);

  useDocumentMeta({
    title: conflict ? `${conflict.name} | Arsenal Atlas` : 'Conflict | Arsenal Atlas',
    description: conflict
      ? `${conflict.count} pieces of equipment recorded as having served in the ${conflict.name}.`
      : 'Equipment recorded as having served in this conflict.',
    canonical: `/conflicts/${slug}`,
  });

  const items = useMemo(() => {
    if (!conflict || !entries) return [];
    const bySlug = new Map<string, ListingEntry>();
    for (const entry of entries) bySlug.set(entry.slug, entry);
    return conflict.entries
      .map((entrySlug) => bySlug.get(entrySlug))
      .filter((entry): entry is ListingEntry => Boolean(entry));
  }, [conflict, entries]);

  const related = useMemo(() => {
    if (!conflict || !conflicts) return [];
    const own = new Set(conflict.entries);
    return conflicts
      .filter((candidate) => candidate.slug !== conflict.slug)
      .map((candidate) => ({
        conflict: candidate,
        shared: candidate.entries.filter((entrySlug) => own.has(entrySlug)).length,
      }))
      .filter(({ shared }) => shared >= 2)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 12);
  }, [conflict, conflicts]);

  if (isLoading) {
    return (
      <Container className="pb-32 pt-40">
        <Skeleton className="h-12 w-1/2 max-w-md" />
        <Skeleton className="mt-8 h-96 w-full" />
      </Container>
    );
  }

  if (!conflict) {
    return (
      <Container className="flex min-h-dvh flex-col justify-center py-32">
        <h1 className="text-h1 text-fg">Unknown conflict</h1>
        <Link to="/conflicts" className="mt-6 text-body text-fg-secondary underline">
          Back to all conflicts
        </Link>
      </Container>
    );
  }

  const buckets = decadeBuckets(items);
  const busiest = Math.max(1, ...buckets.map((bucket) => bucket.entries.length));

  return (
    <div className="pb-32 pt-nav">
      <div className="relative">
        <div
          aria-hidden="true"
          className="field-grid pointer-events-none absolute inset-x-0 top-0 h-[22rem]"
        />
        <Container className="relative pt-20">
          <Reveal>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-caption text-fg-tertiary">
                <li>
                  <Link to="/conflicts" className="transition-colors hover:text-fg-secondary">
                    Conflicts
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li className="text-fg-secondary">{conflict.name}</li>
              </ol>
            </nav>

            <h1 className="mt-6 max-w-[18ch] text-h1 text-fg">{conflict.name}</h1>
            <p className={`${DATA_VALUE} mt-6`}>
              {conflict.count} {conflict.count === 1 ? 'entry' : 'entries'}
            </p>
          </Reveal>

          {buckets.length > 1 ? (
            <Reveal className="mt-12">
              {/* Service years of the equipment, not of the war — the corpus
                  records when a design entered service, and that is the more
                  interesting figure here anyway. */}
              <p className="text-caption text-fg-tertiary">Equipment by decade of introduction</p>
              <ol className="mt-4 flex items-end gap-1.5">
                {buckets.map((bucket) => (
                  <li key={bucket.decade} className="group flex flex-1 flex-col items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="w-full rounded-sm bg-olive/70 transition-colors group-hover:bg-olive"
                      style={{ height: `${8 + (bucket.entries.length / busiest) * 72}px` }}
                    />
                    <span className="tnum text-[0.6875rem] text-fg-tertiary">
                      {String(bucket.decade).slice(2)}
                    </span>
                    <span className="sr-only">
                      {bucket.decade}s: {bucket.entries.length}
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          ) : null}
        </Container>
      </div>

      <Container className="mt-section">
        <Reveal>
          <SectionHeading overline="Served In" title={`Equipment of the ${conflict.name}`} />
        </Reveal>

        <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.03}>
          {items.map((entry, index) => (
            <RevealItem key={entry.id}>
              <EquipmentCard entry={entry} priority={index < 3} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>

      {related.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading
              overline="Shared Equipment"
              title="Related Conflicts"
              className="mb-8"
            />
            <ul className="flex flex-wrap gap-2">
              {related.map(({ conflict: candidate, shared }) => (
                <li key={candidate.slug}>
                  <Link
                    to={`/conflicts/${candidate.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-caption text-fg-secondary transition-colors duration-200 hover:border-line-strong hover:text-fg"
                  >
                    {candidate.name}
                    <span className="tnum text-fg-tertiary">{shared} shared</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      ) : null}
    </div>
  );
}
