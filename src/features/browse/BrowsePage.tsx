import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { useListing } from '@/lib/data';
import { sizedImage } from '@shared/images';
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
  const covers = new Map<string, string>();
  for (const entry of entries ?? []) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    if (entry.hero && !covers.has(entry.category)) covers.set(entry.category, entry.hero);
  }

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">The Collection</p>
          <h1 className="mt-6 max-w-[16ch] text-h1 text-titanium">Browse the Arsenal</h1>
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
          <Container key={group} className="mt-20">
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
                      className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-(--radius-card) border border-line bg-card p-6 transition-colors duration-300 hover:border-line-strong"
                    >
                      {cover ? (
                        <img
                          src={sizedImage(cover, 500)}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 size-full object-cover opacity-20 transition-all duration-700 ease-(--ease-out-expo) group-hover:scale-105 group-hover:opacity-30"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-linear-to-t from-card via-card/85 to-card/40" />

                      <div className="relative">
                        <h3 className="text-h3 text-fg">{category.name}</h3>
                        <p className="mt-1 line-clamp-2 text-caption text-fg-secondary">
                          {category.blurb}
                        </p>
                        <p className="tnum mt-3 text-overline uppercase text-fg-tertiary">
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
