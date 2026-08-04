import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { DATA_VALUE } from '@/components/ui/styles';
import { decadeBuckets } from '@/lib/aggregates';
import type { ListingEntry } from '@/lib/data';
import { drawIn, resolveVariants, revealViewport } from '@/lib/motion';

/**
 * Section 05 — the corpus as an instrument scale.
 *
 * A single rule with a tick per decade and a dot sized by how many entries
 * entered service in it. It replaces a bar histogram, and the change is not
 * only cosmetic: a bar chart of 17 decades invites you to compare heights that
 * mostly differ by two or three entries, which is noise. A scale invites you
 * to read the shape of the century, which is the real content — a thin
 * nineteenth century, a spike through the Cold War, a taper to now.
 *
 * The rule draws itself in via `drawIn`, which needs `origin-left` set in
 * `className` rather than through style: under reduced motion the variant is
 * swapped for an opacity-only mirror that never touches transform.
 */
export function TimelineScale({ entries }: { entries: ListingEntry[] }) {
  const prefersReduced = useReducedMotion() ?? false;
  const buckets = decadeBuckets(entries);
  if (buckets.length === 0) return null;

  const busiest = Math.max(...buckets.map((bucket) => bucket.entries.length));
  const dated = buckets.reduce((sum, bucket) => sum + bucket.entries.length, 0);

  return (
    <div className="relative mt-section">
      <div
        aria-hidden="true"
        className="field-contour pointer-events-none absolute inset-x-0 bottom-0 h-[24rem]"
      />

      <Container className="relative">
        <Reveal>
          <SectionHeading
            index="04"
            overline="Chronology"
            title="Two Centuries of Development"
            action={
              // DATA_VALUE, not DATA_LABEL: uppercasing turns "1860s" into
              // "1860S", which reads as a unit rather than a decade.
              <p className={`${DATA_VALUE} hidden sm:block`}>
                {dated} dated entries · {buckets[0]?.decade}s–{buckets.at(-1)?.decade}s
              </p>
            }
          />
        </Reveal>

        <Reveal className="mt-16">
          <div className="relative">
            {/* The scale itself. */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-10 h-px origin-left bg-line-strong"
              variants={resolveVariants(drawIn, prefersReduced, 'drawIn')}
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
            />

            <ol className="relative flex items-end justify-between">
              {buckets.map((bucket) => {
                const share = bucket.entries.length / busiest;
                // Area, not diameter — a dot scaled linearly by count
                // exaggerates the difference by its square.
                const size = 6 + Math.sqrt(share) * 26;

                return (
                  <li key={bucket.decade} className="group flex flex-1 flex-col items-center">
                    <Link
                      to="/timeline"
                      className="flex flex-col items-center gap-3 outline-none"
                      aria-label={`${bucket.decade}s — ${bucket.entries.length} entries`}
                    >
                      <span className="tnum text-caption text-fg-tertiary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                        {bucket.entries.length}
                      </span>
                      <span
                        aria-hidden="true"
                        style={{ width: `${size}px`, height: `${size}px` }}
                        className="rounded-full bg-steel transition-colors duration-300 group-hover:bg-accent-bright group-focus-visible:bg-accent-bright"
                      />
                      {/* Sits on the rule. Vertical at narrow widths, or 17
                          four-digit labels collide well before the sm break. */}
                      <span className="tnum mt-3 block h-7 text-[0.6875rem] text-fg-tertiary [writing-mode:vertical-rl] sm:[writing-mode:horizontal-tb]">
                        {String(bucket.decade).slice(2)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>
      </Container>
    </div>
  );
}
