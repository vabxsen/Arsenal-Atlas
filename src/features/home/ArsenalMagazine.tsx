import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { DATA_VALUE } from '@/components/ui/styles';
import type { ListingEntry } from '@/lib/data';

/**
 * Section 07 — a magazine spread.
 *
 * One portrait plate, two landscape tiles, and three image-less rows. Mixing
 * aspect ratios inside a single section is the most effective thing available
 * against "every section looks the same", because it breaks the grid the eye
 * has been tracking for six screens without introducing a new colour, border
 * or effect.
 *
 * The three text rows are deliberate rather than a fallback for missing
 * images: a section that is entirely pictures has no hierarchy inside itself.
 */
export function ArsenalMagazine({ entries }: { entries: ListingEntry[] }) {
  const [portrait, ...rest] = entries;
  if (!portrait) return null;

  const tiles = rest.slice(0, 2);
  const rows = rest.slice(2, 5);

  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading
          index="06"
          overline="Newest in Service"
          title="Modern Arsenal"
          action={
            <Link
              to="/timeline"
              className="hidden shrink-0 items-center gap-1.5 text-caption text-fg-secondary transition-colors hover:text-fg sm:flex"
            >
              Full timeline <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </Reveal>

      <RevealGroup className="mt-10 grid gap-6 lg:grid-cols-12">
        {/* The tall plate. 4:5 against the 16:10 tiles beside it — without a
            genuinely different ratio the spread was three equal columns, which
            is the uniformity this section exists to break. */}
        <RevealItem className="lg:col-span-4">
          <EquipmentCard entry={portrait} variant="portrait" />
        </RevealItem>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-5">
          {tiles.map((entry) => (
            <RevealItem key={entry.id}>
              <EquipmentCard entry={entry} />
            </RevealItem>
          ))}
        </div>

        <div className="lg:col-span-3">
          <ol className="border-t border-line">
            {rows.map((entry) => (
              <RevealItem as="li" key={entry.id}>
                <Link
                  to={`/equipment/${entry.slug}`}
                  className="group flex flex-col gap-1 border-b border-line py-4 transition-colors hover:border-line-strong"
                >
                  <span className="text-[0.9375rem] font-medium leading-snug text-fg">
                    {entry.name}
                  </span>
                  <span className="text-caption text-fg-tertiary">
                    {entry.role ?? entry.countries[0]?.name}
                  </span>
                  {entry.serviceStart ? (
                    <span className={`${DATA_VALUE} mt-1`}>{entry.serviceStart}</span>
                  ) : null}
                </Link>
              </RevealItem>
            ))}
          </ol>
        </div>
      </RevealGroup>
    </Container>
  );
}
