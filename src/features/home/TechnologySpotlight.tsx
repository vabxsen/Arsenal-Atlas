import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { DATA_LABEL } from '@/components/ui/styles';
import type { ListingEntry } from '@/lib/data';
import { sizedImage } from '@shared/images';

/**
 * Section 08 — a full-bleed diptych.
 *
 * The oldest and newest designs in the corpus, meeting at a centre hairline,
 * with the span between them set at display scale straddling the join.
 *
 * Full-bleed and square-edged, so it is the one moment on the page where the
 * imagery is not held inside a rounded frame. After six contained sections
 * that break is what makes the span read as a statement rather than as two
 * more cards with a number between them — which is exactly what it was.
 *
 * `.on-dark` because the type sits on photography and must stay light in both
 * themes; the scrim is built from --color-scrim, which never inverts.
 */
export function TechnologySpotlight({ entries }: { entries: ListingEntry[] }) {
  const dated = entries.filter((entry) => entry.serviceStart && entry.hero);
  const oldest = [...dated].sort((a, b) => (a.serviceStart ?? 0) - (b.serviceStart ?? 0))[0];
  const latest = [...dated].sort((a, b) => (b.serviceStart ?? 0) - (a.serviceStart ?? 0))[0];
  if (!oldest || !latest) return null;

  const span = (latest.serviceStart ?? 0) - (oldest.serviceStart ?? 0);

  return (
    <div className="mt-section">
      <Container>
        <Reveal>
          <SectionHeading index="07" overline="Technology Spotlight" title="Across the Centuries" />
        </Reveal>
      </Container>

      <Reveal className="mt-10">
        <div className="on-dark relative isolate grid grid-cols-2">
          <Plate entry={oldest} align="left" />
          <Plate entry={latest} align="right" />

          {/* The join. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-line-glow"
          />

          {/* The span, straddling the rule. `pointer-events-none` so it never
              intercepts a click meant for either plate. */}
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
            <div className="bg-scrim/55 px-8 py-6 text-center backdrop-blur-md">
              <p className="tnum text-display leading-none text-fg">{span}</p>
              <p className={`${DATA_LABEL} mt-3 text-fg-secondary`}>Years apart</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function Plate({ entry, align }: { entry: ListingEntry; align: 'left' | 'right' }) {
  return (
    <Link
      to={`/equipment/${entry.slug}`}
      className="group relative block aspect-4/5 overflow-hidden sm:aspect-16/10"
    >
      {entry.hero ? (
        <img
          src={sizedImage(entry.hero, 960, entry.heroWidth)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
        />
      ) : null}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-scrim via-scrim/60 via-40% to-scrim/20"
      />

      <div
        className={`absolute inset-x-0 bottom-0 p-6 sm:p-10 ${
          align === 'right' ? 'sm:text-right' : ''
        }`}
      >
        <p className={`${DATA_LABEL} text-fg-secondary`}>
          {align === 'left' ? 'Earliest in service' : 'Latest in service'}
        </p>
        <p className="tnum mt-2 text-h2 text-fg">{entry.serviceStart}</p>
        <h3 className="mt-1 text-h3 text-fg-secondary transition-colors group-hover:text-fg">
          {entry.name}
        </h3>
      </div>
    </Link>
  );
}
