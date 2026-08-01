import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { byCategory, useListing } from '@/lib/data';
import { useDocumentMeta } from '@/lib/seo';
import { getCategory } from '@shared/taxonomy';

type SortKey = 'popularity' | 'name' | 'year';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'popularity', label: 'Most viewed' },
  { key: 'name', label: 'A–Z' },
  { key: 'year', label: 'Newest' },
];

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entries, isLoading } = useListing();
  const [sort, setSort] = useState<SortKey>('popularity');
  const [country, setCountry] = useState<string | null>(null);

  const category = slug ? getCategory(slug) : undefined;

  useDocumentMeta({
    title: `${category?.name ?? 'Category'} | Arsenal Atlas`,
    description: category?.blurb ?? 'Browse military equipment by category.',
    canonical: `/category/${slug}`,
  });

  const items = useMemo(() => {
    if (!entries || !slug) return [];
    const base = byCategory(entries, slug);
    const filtered = country
      ? base.filter((entry) => entry.countries.some((c) => c.name === country))
      : base;

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'year') return (b.serviceStart ?? 0) - (a.serviceStart ?? 0);
      return b.popularity - a.popularity;
    });
  }, [entries, slug, sort, country]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries ?? []) {
      if (entry.category !== slug) continue;
      for (const c of entry.countries) set.add(c.name);
    }
    return [...set].sort();
  }, [entries, slug]);

  if (!category) {
    return (
      <Container className="flex min-h-dvh flex-col justify-center py-32">
        <h1 className="text-h1 text-fg">Unknown category</h1>
        <Link to="/browse" className="mt-6 text-body text-fg-secondary underline">
          Back to browse
        </Link>
      </Container>
    );
  }

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-caption text-fg-tertiary">
              <li>
                <Link to="/browse" className="transition-colors hover:text-fg-secondary">
                  Browse
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-fg-secondary">{category.group}</li>
            </ol>
          </nav>

          <h1 className="mt-6 text-h1 text-titanium">{category.name}</h1>
          <p className="mt-4 max-w-[58ch] text-body text-fg-secondary">{category.blurb}</p>
          <p className="tnum mt-4 text-caption text-fg-tertiary">
            {items.length} {items.length === 1 ? 'entry' : 'entries'}
          </p>
        </Reveal>

        {/* ── Filters ──────────────────────────────────────── */}
        <Reveal className="mt-10">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2" role="group" aria-label="Sort entries">
              {SORTS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSort(option.key)}
                  aria-pressed={sort === option.key}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full border px-4 text-caption transition-colors duration-200',
                    sort === option.key
                      ? 'border-line-glow bg-elevated text-fg'
                      : 'border-line bg-card text-fg-secondary hover:text-fg'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {countries.length > 1 ? (
              <label className="flex items-center gap-2 text-caption text-fg-tertiary">
                <span>Origin</span>
                <select
                  value={country ?? ''}
                  onChange={(event) => setCountry(event.target.value || null)}
                  className="min-h-11 rounded-full border border-line bg-card px-4 text-caption text-fg outline-none focus-visible:border-line-glow"
                >
                  <option value="">All countries</option>
                  {countries.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </Reveal>
      </Container>

      <Container className="mt-12">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-(--radius-card) border border-line bg-card p-12 text-center">
            <p className="text-body text-fg-secondary">
              No entries match this filter yet.
            </p>
            {country ? (
              <button
                type="button"
                onClick={() => setCountry(null)}
                className="mt-4 text-caption text-fg underline underline-offset-4"
              >
                Clear the country filter
              </button>
            ) : null}
          </div>
        ) : (
          <RevealGroup
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            stagger={0.04}
          >
            {items.map((entry, index) => (
              <RevealItem key={entry.id}>
                <EquipmentCard
                  entry={entry}
                  priority={index < 3}
                  sizes="(min-width: 1024px) 28rem, (min-width: 640px) 45vw, 90vw"
                  // The grid sits directly under the page <h1>.
                  headingLevel={2}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </Container>
    </div>
  );
}
