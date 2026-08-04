import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { Container, FilterPill, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { DATA_LABEL, DATA_VALUE } from '@/components/ui/styles';
import { useConflicts, useListing } from '@/lib/data';
import { useDocumentMeta } from '@/lib/seo';
import { sizedImage } from '@shared/images';
import type { ConflictSummary } from '@shared/conflicts';
import type { ListingEntry } from '@/lib/data';

/**
 * The conflict index.
 *
 * Deliberately has no photographic hero. There is no image that represents a
 * war honestly at hero scale, and choosing one would be an editorial claim the
 * rest of the site does not make — this is a reference work, and the entry
 * point to 1,782 references is a typographic index over the technical grid.
 *
 * Two densities on one page: the twelve most-cited campaigns as large ledger
 * rows carrying a thumbnail strip drawn from their own entries, then the
 * remaining ~390 as a dense wrap of links. That split is the content's own —
 * 76 conflicts have five or more entries and 222 have exactly one, and
 * pretending otherwise would give a footnote the same weight as the Vietnam War.
 */
export default function ConflictsPage() {
  const { data: conflicts, isLoading } = useConflicts();
  const { data: entries } = useListing();
  const [showAll, setShowAll] = useState(false);

  useDocumentMeta({
    title: 'Conflicts | Arsenal Atlas',
    description:
      'Every armed conflict referenced across the collection, from the World Wars to current campaigns — and the equipment that served in each.',
    canonical: '/conflicts',
  });

  const bySlug = useMemo(() => {
    const map = new Map<string, ListingEntry>();
    for (const entry of entries ?? []) map.set(entry.slug, entry);
    return map;
  }, [entries]);

  if (isLoading || !conflicts) {
    return (
      <Container className="pb-32 pt-40">
        <Skeleton className="h-12 w-1/2 max-w-md" />
        <Skeleton className="mt-8 h-96 w-full" />
      </Container>
    );
  }

  const references = conflicts.reduce((sum, conflict) => sum + conflict.count, 0);
  const lead = conflicts.slice(0, 12);
  const tail = conflicts.slice(12);
  const visibleTail = showAll ? tail : tail.slice(0, 80);

  return (
    <div className="pb-32 pt-nav">
      <div className="relative">
        <div
          aria-hidden="true"
          className="field-grid pointer-events-none absolute inset-x-0 top-0 h-[26rem]"
        />
        <Container className="relative pt-20">
          <Reveal>
            <p className="text-overline uppercase text-fg-tertiary">Where It Served</p>
            <h1 className="mt-6 max-w-[14ch] text-h1 text-fg">Conflicts</h1>
            <p className="mt-6 max-w-[58ch] text-body text-fg-secondary">
              Every armed conflict named across the collection, and the equipment recorded as
              having served in it.
            </p>
            <p className={`${DATA_VALUE} mt-8`}>
              {conflicts.length} conflicts · {references} references
            </p>
          </Reveal>
        </Container>
      </div>

      <Container className="mt-section">
        <Reveal>
          <SectionHeading index="01" overline="Most Referenced" title="The Major Campaigns" />
        </Reveal>

        <RevealGroup as="ol" className="mt-10 border-t border-line">
          {lead.map((conflict, index) => (
            <RevealItem as="li" key={conflict.slug}>
              <LedgerRow conflict={conflict} index={index + 1} bySlug={bySlug} />
            </RevealItem>
          ))}
        </RevealGroup>
      </Container>

      {tail.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading
              index="02"
              overline="The Long Tail"
              title="Every Other Conflict"
              action={<p className={`${DATA_VALUE} hidden sm:block`}>{tail.length} more</p>}
            />
          </Reveal>

          <Reveal className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {visibleTail.map((conflict) => (
                <li key={conflict.slug}>
                  <Link
                    to={`/conflicts/${conflict.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-caption text-fg-secondary transition-colors duration-200 hover:border-line-strong hover:text-fg"
                  >
                    {conflict.name}
                    <span className="tnum text-fg-tertiary">{conflict.count}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {!showAll && tail.length > visibleTail.length ? (
              <div className="mt-8">
                <FilterPill onClick={() => setShowAll(true)}>
                  Show all {tail.length} conflicts
                </FilterPill>
              </div>
            ) : null}
          </Reveal>
        </Container>
      ) : null}
    </div>
  );
}

/**
 * One large row: rank, name, count, and an overlapping strip of the equipment
 * that served in it. The thumbnails are the argument for the row's size — they
 * turn a line in a list into a recognisable set of objects.
 */
function LedgerRow({
  conflict,
  index,
  bySlug,
}: {
  conflict: ConflictSummary;
  index: number;
  bySlug: Map<string, ListingEntry>;
}) {
  const thumbs = conflict.entries
    .map((slug) => bySlug.get(slug))
    .filter((entry): entry is ListingEntry => Boolean(entry?.hero))
    .slice(0, 5);

  return (
    <Link
      to={`/conflicts/${conflict.slug}`}
      className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-6 gap-y-3 border-b border-line py-6 transition-colors hover:border-line-strong sm:grid-cols-[2.5rem_1fr_auto_5rem]"
    >
      <span className={DATA_LABEL}>{String(index).padStart(2, '0')}</span>

      <h3 className="text-h3 text-fg-secondary transition-colors group-hover:text-fg">
        {conflict.name}
      </h3>

      {/* Overlapping, so five thumbs read as one object rather than five.
          aria-hidden: the row's accessible name is already the conflict. */}
      <div aria-hidden="true" className="col-start-2 flex sm:col-start-3 sm:justify-end">
        {thumbs.map((entry, i) => (
          <span
            key={entry.id}
            className="-ml-3 size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-deep first:ml-0"
            style={{ zIndex: thumbs.length - i }}
          >
            <img
              src={sizedImage(entry.hero!, 330, entry.heroWidth)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </span>
        ))}
      </div>

      <span className="tnum col-start-3 row-start-1 text-right text-caption text-fg-tertiary sm:col-start-4 sm:row-start-auto">
        {conflict.count}
      </span>
    </Link>
  );
}
