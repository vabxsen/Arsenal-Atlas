import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '@/components/motion/Reveal';
import { ButtonLink, Container } from '@/components/ui/primitives';
import { paletteStore } from '@/features/search/store';
import type { ListingEntry } from '@/lib/data';
import { heroReveal, motionWhen } from '@/lib/motion';
import { sizedImage, wikimediaSrcSet } from '@shared/images';
import { HeroStats } from './HeroStats';

/**
 * Cinematic hero.
 *
 * The background parallaxes and fades on scroll via `useScroll`, driven
 * entirely by transform and opacity so it stays on the compositor. All of it
 * collapses to a static image under reduced motion.
 *
 * Four elements here are load-bearing for `npm run verify:contrast`, which
 * samples the composited pixels behind text over photography and asserts
 * against `#main h1`, `#main p.text-overline` and `#main p.text-body` — using
 * `querySelector`, so it takes the FIRST match in the document, and screenshots
 * only the top 900px at 1440 wide. So: the overline stays a <p class=
 * "text-overline">, the blurb stays a <p class="text-body">, both stay ahead of
 * any other such element in DOM order, and all three stay above the fold. The
 * stats strip sits below the blurb for exactly that reason. If a selector ever
 * stops matching, the script prints SKIP and still exits 0 — the coverage
 * disappears silently, so changes here need the output read rather than the
 * exit code.
 */
export function Hero({ entries }: { entries: ListingEntry[] | undefined }) {
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

  // Curated rather than incidental. This used to take the first entry over
  // 1600px wide, which is whatever happened to sort first — a cut-out or a
  // portrait could land here and read as a mistake. Require a featured entry
  // with a genuinely landscape frame, and fall back progressively.
  const backdrop =
    entries?.find(
      (entry) =>
        entry.featured &&
        entry.hero &&
        (entry.heroWidth ?? 0) >= 1920 &&
        (entry.heroWidth ?? 0) / (entry.heroHeight ?? 1) >= 1.4 &&
        (entry.heroWidth ?? 0) / (entry.heroHeight ?? 1) <= 2.1
    ) ?? entries?.find((entry) => entry.hero && (entry.heroWidth ?? 0) > 1600);

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
        {...motionWhen(!prefersReduced, { style: { y: imageY, scale: imageScale } })}
      >
        {backdrop?.hero ? (
          <img
            src={sizedImage(backdrop.hero, 1920, backdrop.heroWidth)}
            // Without a srcset a phone downloaded the same 1920 rendition as a
            // desktop — the largest single image on the site, for a screen that
            // cannot show a third of it.
            srcSet={wikimediaSrcSet(backdrop.hero, backdrop.heroWidth)}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="sync"
            className="size-full object-cover"
          />
        ) : null}
      </motion.div>

      {/* One vertical gradient anchors the copy and the bottom edge; the
          horizontal pass stops at 65% so the right of the frame keeps its
          image. Both are built from --color-scrim, which never inverts. */}
      <div className="absolute inset-0 z-10 bg-linear-to-b from-scrim/70 via-scrim/40 via-40% to-scrim" />
      <div className="absolute inset-0 z-10 bg-linear-to-r from-scrim via-scrim/55 via-35% to-transparent to-65%" />
      <div aria-hidden="true" className="field-vignette absolute inset-0 z-10" />

      {/* The technical field, masked into the left third where the copy sits.
          Above the scrim so it reads as drawing paper laid over the photograph
          rather than as an artefact of the image. */}
      <div
        aria-hidden="true"
        className="field-grid absolute inset-y-0 left-0 z-10 w-full max-w-3xl opacity-70"
      />

      <Container className="relative z-20">
        <motion.div
          className="max-w-4xl py-28"
          {...motionWhen(!prefersReduced, { style: { y: contentY, opacity: contentOpacity } })}
        >
          <Reveal variants={heroReveal} variantKey="heroReveal">
            <div className="corner-ticks -m-4 p-4">
              <p className="text-overline uppercase text-fg-tertiary">
                An encyclopedia of military equipment
              </p>
              <h1 className="mt-6 text-display text-fg">
                Explore the World&rsquo;s Military Arsenal
              </h1>
              <p className="mt-7 max-w-[54ch] text-body text-fg-secondary">
                Specifications, history, and imagery for the firearms, armour, aircraft, and
                vessels that define modern warfare &mdash; researched, sourced, and presented with
                the care the subject deserves.
              </p>
            </div>
          </Reveal>

          <Reveal className="mt-9" delay={0.2}>
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

          <Reveal className="mt-12" delay={0.32}>
            <HeroStats entries={entries} />
          </Reveal>
        </motion.div>
      </Container>
    </section>
  );
}
