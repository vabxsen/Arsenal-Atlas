import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading } from '@/components/ui/primitives';
import type { ListingEntry } from '@/lib/data';

/**
 * Section 04 — a compact horizontal carousel.
 *
 * Square thumbs at a density no other section uses, running off the right edge
 * so the row reads as a continuing shelf rather than a closed grid.
 *
 * No framer-motion here on purpose: native scroll-snap does this better than
 * any JS carousel, keeps momentum scrolling on touch, and costs nothing in
 * bundle. The arrows call `scrollBy` and are hidden from assistive tech —
 * the list is already scrollable by keyboard through the container below.
 */
export function PopularCarousel({ entries }: { entries: ListingEntry[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (entries.length === 0) return null;

  const nudge = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="mt-section">
      <Container>
        <Reveal>
          <SectionHeading
            index="03"
            overline="Most Viewed"
            title="Popular Entries"
            action={
              <div className="hidden gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => nudge(-1)}
                  aria-label="Scroll popular entries left"
                  className="grid size-11 place-items-center rounded-full bg-elevated text-fg-secondary transition-colors hover:bg-raised hover:text-fg"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => nudge(1)}
                  aria-label="Scroll popular entries right"
                  className="grid size-11 place-items-center rounded-full bg-elevated text-fg-secondary transition-colors hover:bg-raised hover:text-fg"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            }
          />
        </Reveal>
      </Container>

      {/*
        `tabIndex={0}` with a role and label is the pattern a scrollable region
        needs to be reachable by keyboard — without it the only way to see the
        overflow is a pointer. Same shape as the old TimelinePreview.
        Padding rather than a Container so cards can bleed off the right edge.
      */}
      <Reveal className="mt-10">
        {/*
          The gutter is padding plus a MATCHING scroll-padding, not a margin on
          the first child. `snap-start` aligns an item to the scrollport edge
          and ignores padding, so the first version — padding on the track, a
          centring margin on the first item — was silently snapped past on
          load: the browser landed at scrollLeft 45, exactly the gutter, and
          the first card sat clipped against the viewport edge.

          `snap-proximity` rather than `mandatory` for the same reason: a
          mandatory axis re-snaps on every layout change, including the one the
          reveal animation causes.
        */}
        {/*
          The scrollable region is the wrapper, not the list.
          `role="region"` on a <ul> is an aria-allowed-role violation — a list
          has an implicit role, and overriding it also detaches every <li> from
          its parent, which axe reports separately as three listitem errors.
          Keep the list a list; make the box around it the region.
        */}
        <div
          ref={trackRef}
          tabIndex={0}
          role="region"
          aria-label="Popular entries, scrollable"
          className="snap-x snap-proximity overflow-x-auto pb-4 pl-[max(1.5rem,calc((100vw-84rem)/2))] pr-6 scroll-pl-[max(1.5rem,calc((100vw-84rem)/2))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-5">
            {entries.map((entry) => (
              <li key={entry.id} className="w-40 shrink-0 snap-start sm:w-44 lg:w-48">
                <EquipmentCard entry={entry} variant="compact" />
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  );
}
