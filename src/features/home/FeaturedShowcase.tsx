import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading } from '@/components/ui/primitives';
import type { ListingEntry } from '@/lib/data';

/**
 * Section 02 — an asymmetric editorial block.
 *
 * One large plate carrying its title over the image, with three landscape rows
 * stacked beside it. The point is the asymmetry: this used to be four equal
 * tiles, identical to three other sections on the page, and a reader scanning
 * downward had no way to tell where one ended and the next began.
 *
 * The lead takes `priority` because on a short viewport it can be the LCP
 * element once the hero scrolls past.
 */
export function FeaturedShowcase({ entries }: { entries: ListingEntry[] }) {
  const [lead, ...rest] = entries;
  if (!lead) return null;

  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading
          index="01"
          overline="Curated"
          title="Featured Equipment"
          action={
            <Link
              to="/browse"
              className="hidden shrink-0 items-center gap-1.5 text-caption text-fg-secondary transition-colors hover:text-fg sm:flex"
            >
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </Reveal>

      <RevealGroup className="mt-10 grid gap-6 lg:grid-cols-12">
        <RevealItem className="lg:col-span-7">
          <EquipmentCard entry={lead} variant="feature" priority />
        </RevealItem>

        <div className="flex flex-col gap-5 lg:col-span-5">
          {rest.slice(0, 3).map((entry) => (
            <RevealItem key={entry.id}>
              <EquipmentCard entry={entry} variant="row" />
            </RevealItem>
          ))}
        </div>
      </RevealGroup>
    </Container>
  );
}
