import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { sizedImage } from '@shared/images';
import type { ListingEntry } from '@/lib/data';

const DECADE_SPAN = 10;

/**
 * Decade histogram of entries by year of entry into service.
 * Doubles as the entry point to the full timeline.
 */
export function TimelinePreview({ entries }: { entries: ListingEntry[] }) {
  const dated = entries.filter((entry) => entry.serviceStart && entry.serviceStart > 1850);
  if (dated.length < 10) return null;

  const buckets = new Map<number, ListingEntry[]>();
  for (const entry of dated) {
    const decade = Math.floor((entry.serviceStart as number) / DECADE_SPAN) * DECADE_SPAN;
    const bucket = buckets.get(decade);
    if (bucket) bucket.push(entry);
    else buckets.set(decade, [entry]);
  }

  const ordered = [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  const max = Math.max(...ordered.map(([, items]) => items.length));

  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading
          overline="Timeline"
          title="Two Centuries of Development"
          action={
            <Link
              to="/timeline"
              className="hidden shrink-0 items-center gap-1.5 text-caption text-fg-secondary transition-colors hover:text-fg sm:flex"
            >
              Explore <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </Reveal>

      <Reveal className="mt-10">
        {/* tabIndex makes the horizontal scroll reachable by keyboard — a
            scroll container that only responds to pointers strands anyone
            navigating by keyboard. */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Entries by decade, scrollable"
          className="overflow-x-auto rounded-(--radius-card) border border-line bg-card p-6"
        >
          <ol className="flex min-w-max items-end gap-2" aria-label="Entries by decade">
            {ordered.map(([decade, items]) => {
              const height = Math.max(8, (items.length / max) * 100);
              const sample = items.find((item) => item.hero);

              return (
                <li key={decade} className="group relative flex w-14 flex-col items-center gap-2">
                  <span className="tnum text-[0.6875rem] text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100">
                    {items.length}
                  </span>
                  <div
                    className="relative w-full overflow-hidden rounded-md bg-raised transition-all duration-500 ease-(--ease-out-expo) group-hover:bg-elevated"
                    style={{ height: `${height * 1.6}px` }}
                  >
                    {sample?.hero ? (
                      <img
                        src={sizedImage(sample.hero, 330)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover opacity-25 transition-opacity duration-500 group-hover:opacity-60"
                      />
                    ) : null}
                  </div>
                  <span className="tnum text-[0.6875rem] text-fg-tertiary">
                    {`'${String(decade).slice(2)}`}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </Reveal>
    </Container>
  );
}
