import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { useListing } from '@/lib/data';
import { sizedImage, wikimediaSrcSet } from '@shared/images';
import { useDocumentMeta } from '@/lib/seo';
import { groupedCategories } from '@shared/taxonomy';

export default function BrowsePage() {
  const { data: entries, isLoading } = useListing();

  useDocumentMeta({
    title: 'Browse All Categories | Arsenal Atlas',
    description:
      'Browse military equipment by category — firearms, artillery, missiles, armour, aircraft, naval vessels, munitions, and soldier systems.',
    canonical: '/browse',
  });

  const counts = new Map<string, number>();
  const covers = new Map<string, { url: string; width?: number | undefined }>();
  for (const entry of entries ?? []) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    if (entry.hero && !covers.has(entry.category))
      covers.set(entry.category, { url: entry.hero, width: entry.heroWidth });
  }

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">The Collection</p>
          <h1 className="mt-6 max-w-[16ch] text-h1 text-fg">Browse the Arsenal</h1>
          <p className="mt-6 max-w-[56ch] text-body text-fg-secondary">
            {entries ? `${entries.length} entries` : 'Hundreds of entries'} across 44 categories,
            from service pistols to nuclear-powered aircraft carriers.
          </p>
        </Reveal>
      </Container>

      {isLoading ? (
        <Container className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </Container>
      ) : (
        groupedCategories().map(({ group, categories }) => (
          <Container key={group} className="mt-section">
            <Reveal>
              <SectionHeading title={group} />
            </Reveal>
            <RevealGroup
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              stagger={0.04}
            >
              {categories.map((category) => {
                const count = counts.get(category.slug) ?? 0;
                const cover = covers.get(category.slug);

                return (
                  <RevealItem key={category.slug}>
                    <Link
                      to={`/category/${category.slug}`}
                      className="on-dark group relative flex h-56 flex-col justify-end overflow-hidden rounded-(--radius-card) bg-base p-6"
                    >
                      {/* Full opacity. This was previously held at 0.2 beneath
                          a near-opaque wash, which turned the whole browse
                          grid into a field of grey rectangles with the
                          photography barely detectable. The imagery is the
                          point; a real bottom-weighted scrim carries the text.

                          `on-dark` because the scrim is built from --color-deep:
                          in light mode that inverts to white, which would wash
                          the photograph out and leave dark text sitting on
                          whatever the picture happens to be. A photographic
                          tile stays dark in both themes, same as the heroes. */}
                      {cover ? (
                        <img
                          src={sizedImage(cover.url, 960, cover.width)}
                          srcSet={wikimediaSrcSet(cover.url, cover.width)}
                          sizes="(min-width: 1024px) 27rem, (min-width: 640px) 45vw, 90vw"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-linear-to-t from-deep via-deep/75 via-45% to-deep/25" />

                      <div className="relative">
                        <h3 className="text-h3 text-fg">{category.name}</h3>
                        <p className="tnum mt-1.5 text-caption text-fg-secondary">
                          {count} {count === 1 ? 'entry' : 'entries'}
                        </p>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </Container>
        ))
      )}
    </div>
  );
}
