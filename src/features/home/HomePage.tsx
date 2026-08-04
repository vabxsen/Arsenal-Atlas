import { Container, Skeleton } from '@/components/ui/primitives';
import { featured, newest, popular, randomDaily, useListing } from '@/lib/data';
import { ArsenalMagazine } from './ArsenalMagazine';
import { CategoryIndex } from './CategoryIndex';
import { CountryMap } from './CountryMap';
import { DailyDispatch } from './DailyDispatch';
import { FeaturedShowcase } from './FeaturedShowcase';
import { Hero } from './Hero';
import { PopularCarousel } from './PopularCarousel';
import { TechnologySpotlight } from './TechnologySpotlight';
import { TimelineScale } from './TimelineScale';

/**
 * The homepage is a composition file and nothing else.
 *
 * Nine sections, nine layouts. Four of them used to be the same `Rail`
 * component — an identical four-column grid rendered for Featured, Popular,
 * Modern Arsenal and Random Discovery — which is why the page read as a
 * template no matter how good the individual tiles were. The eye learns a
 * shape once and then stops looking.
 *
 * They now run: cinematic hero, asymmetric editorial block, typographic
 * ledger, dense carousel, instrument scale, choropleth, magazine spread,
 * full-bleed diptych, single editorial plate. No two share a grid, an aspect
 * ratio, or a density, and only one of them (the ledger) has no photography,
 * which is what gives the eye somewhere to rest.
 *
 * Heading order is a hard constraint, not a convention: axe runs with
 * `best-practice` enabled, so a skipped level fails all 20 route/theme
 * combinations at once. Every section emits exactly one <h2> and every entry
 * name beneath it is an <h3>. The one exception is DailyDispatch, which is a
 * section of a single item and whose <h2> IS the entry name.
 */
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
          <FeaturedShowcase entries={featured(entries, 4)} />
          <CategoryIndex entries={entries} />
          <PopularCarousel entries={popular(entries, 14)} />
          <TimelineScale entries={entries} />
          <CountryMap entries={entries} />
          <ArsenalMagazine entries={newest(entries, 6)} />
          <TechnologySpotlight entries={entries} />
          <DailyDispatch entry={randomDaily(entries, 1)[0]} />
        </>
      )}
    </div>
  );
}
