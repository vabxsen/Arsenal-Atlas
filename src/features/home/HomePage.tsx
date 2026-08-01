import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { ButtonLink, Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import {
  featured,
  newest,
  popular,
  randomDaily,
  useListing,
  type ListingEntry,
} from '@/lib/data';
import { sizedImage } from '@shared/images';
import { heroReveal } from '@/lib/motion';
import { paletteStore } from '@/features/search/store';
import { groupedCategories } from '@shared/taxonomy';
import { CountryRail } from './CountryRail';
import { TimelinePreview } from './TimelinePreview';

export function HomePage() {
  const { data: entries, isLoading } = useListing();

  return (
    <div className="pb-32">
      <Hero entries={entries} />

      {isLoading || !entries ? (
        <Container className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </Container>
      ) : (
        <>
          <Rail
            overline="Curated"
            title="Featured Equipment"
            entries={featured(entries, 8)}
            to="/browse"
          />
          <CategoryGrid />
          <Rail overline="Most Viewed" title="Popular Entries" entries={popular(entries, 8)} to="/browse" />
          <TimelinePreview entries={entries} />
          <CountryRail entries={entries} />
          <Rail
            overline="Newest in Service"
            title="Modern Arsenal"
            entries={newest(entries, 8)}
            to="/timeline"
          />
          <TechnologySpotlight entries={entries} />
          <Rail
            overline="Discover"
            title="Something Unexpected"
            entries={randomDaily(entries, 4)}
            to="/browse"
          />
        </>
      )}
    </div>
  );
}

/**
 * Cinematic hero.
 *
 * The background image parallaxes and fades on scroll via `useScroll`, driven
 * entirely by transform and opacity so it stays on the compositor. All of it
 * collapses to a static image under reduced motion.
 */
function Hero({ entries }: { entries: ListingEntry[] | undefined }) {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  // The most prominent entry with a wide hero makes the best backdrop.
  const backdrop = entries?.find((entry) => entry.hero && (entry.heroWidth ?? 0) > 1600);

  // `isolate` creates the stacking context so the layers below order with
  // plain positive z-index — negative z-index escapes to the page root and is
  // far more fragile.
  return (
    <section
      ref={sectionRef}
      className="on-dark relative isolate flex min-h-dvh items-center overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 z-0"
        style={prefersReduced ? undefined : { y: imageY, scale: imageScale }}
      >
        {backdrop?.hero ? (
          <img
            src={sizedImage(backdrop.hero, 1920, backdrop.heroWidth)}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="sync"
            className="size-full object-cover"
          />
        ) : null}
      </motion.div>

      {/* Two-stop scrim: darkens the photograph enough for AA text contrast
          while keeping the subject readable. */}
      <div className="absolute inset-0 z-10 bg-linear-to-b from-deep/85 via-deep/70 to-deep" />
      <div className="absolute inset-0 z-10 bg-linear-to-r from-deep via-deep/60 to-transparent" />

      <Container className="relative z-20">
        <motion.div
          className="max-w-4xl py-32"
          style={prefersReduced ? undefined : { y: contentY, opacity: contentOpacity }}
        >
          <Reveal variants={heroReveal} variantKey="heroReveal">
            <p className="text-overline uppercase text-fg-tertiary">
              An encyclopedia of military equipment
            </p>
            <h1 className="mt-6 text-display text-titanium">
              Explore the World&rsquo;s Military Arsenal
            </h1>
            <p className="mt-8 max-w-[54ch] text-body text-fg-secondary">
              Specifications, history, and imagery for the firearms, armour, aircraft, and vessels
              that define modern warfare &mdash; researched, sourced, and presented with the care
              the subject deserves.
            </p>
          </Reveal>

          <Reveal className="mt-10" delay={0.2}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => paletteStore.open()}
                className="group flex min-h-14 w-full max-w-md items-center gap-3 rounded-full border border-line-strong bg-card/80 px-6 text-left backdrop-blur-md transition-colors duration-300 hover:border-line-glow sm:w-auto sm:min-w-[24rem]"
              >
                <Search size={18} className="text-fg-tertiary" aria-hidden="true" />
                <span className="flex-1 text-body text-fg-tertiary">
                  Search rifles, tanks, aircraft&hellip;
                </span>
                <kbd
                  aria-hidden="true"
                  className="hidden rounded border border-line px-2 py-1 text-[0.6875rem] text-fg-tertiary sm:inline"
                >
                  ⌘K
                </kbd>
              </button>

              <ButtonLink to="/browse" variant="secondary" className="min-h-14">
                Browse all
                <ArrowRight size={16} aria-hidden="true" />
              </ButtonLink>
            </div>
          </Reveal>
        </motion.div>
      </Container>
    </section>
  );
}

function Rail({
  overline,
  title,
  entries,
  to,
}: {
  overline: string;
  title: string;
  entries: ListingEntry[];
  to: string;
}) {
  if (entries.length === 0) return null;

  return (
    <Container className="mt-32">
      <Reveal>
        <SectionHeading
          overline={overline}
          title={title}
          action={
            <Link
              to={to}
              className="hidden shrink-0 items-center gap-1.5 text-caption text-fg-secondary transition-colors hover:text-fg sm:flex"
            >
              View all <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </Reveal>

      <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <RevealItem key={entry.id}>
            <EquipmentCard entry={entry} />
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  );
}

function CategoryGrid() {
  const groups = groupedCategories();

  return (
    <Container className="mt-32">
      <Reveal>
        <SectionHeading overline="By Type" title="Popular Categories" />
      </Reveal>

      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ group, categories }) => (
          <RevealItem key={group}>
            <div className="h-full rounded-(--radius-card) border border-line bg-card p-6 transition-colors duration-300 hover:border-line-strong">
              <h3 className="text-h3 text-fg">{group}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      to={`/category/${category.slug}`}
                      className="inline-flex min-h-9 items-center rounded-full border border-line bg-base px-3 text-caption text-fg-secondary transition-colors duration-200 hover:border-line-strong hover:text-fg"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  );
}

/** Editorial rail contrasting the oldest and newest designs still in service. */
function TechnologySpotlight({ entries }: { entries: ListingEntry[] }) {
  const dated = entries.filter((entry) => entry.serviceStart && entry.hero);
  const oldest = [...dated].sort((a, b) => (a.serviceStart ?? 0) - (b.serviceStart ?? 0))[0];
  const latest = [...dated].sort((a, b) => (b.serviceStart ?? 0) - (a.serviceStart ?? 0))[0];
  if (!oldest || !latest) return null;

  const span = (latest.serviceStart ?? 0) - (oldest.serviceStart ?? 0);

  return (
    <Container className="mt-32">
      <Reveal>
        <SectionHeading overline="Technology Spotlight" title="Across the Centuries" />
      </Reveal>

      <Reveal className="mt-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <EquipmentCard entry={oldest} />
          <div className="text-center">
            <p className="tnum text-h1 text-titanium">{span}</p>
            <p className="mt-2 text-overline uppercase text-fg-tertiary">Years apart</p>
          </div>
          <EquipmentCard entry={latest} />
        </div>
      </Reveal>
    </Container>
  );
}
