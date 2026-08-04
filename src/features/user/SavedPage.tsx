import { Bookmark, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import {
  ButtonLink,
  Container,
  EmptyState,
  SectionHeading,
  Skeleton,
} from '@/components/ui/primitives';
import { useListing, type ListingEntry } from '@/lib/data';
import { useDocumentMeta } from '@/lib/seo';
import { useAuth } from '@/features/auth/useAuth';
import { clearRecentlyViewed, useFavorites, useRecentlyViewed } from './collections';

export default function SavedPage() {
  const { data: listing, isLoading } = useListing();
  const { favorites, synced } = useFavorites();
  const recent = useRecentlyViewed();
  const { available, signIn } = useAuth();

  useDocumentMeta({
    title: 'Saved | Arsenal Atlas',
    description: 'Your saved equipment and recently viewed entries.',
    canonical: '/saved',
  });

  const bySlug = useMemo(() => {
    const map = new Map<string, ListingEntry>();
    for (const entry of listing ?? []) map.set(entry.slug, entry);
    return map;
  }, [listing]);

  // Preserve saved order (most recent first) rather than the listing's.
  const resolve = (slugs: string[]) =>
    slugs.map((slug) => bySlug.get(slug)).filter((e): e is ListingEntry => Boolean(e));

  const savedEntries = resolve(favorites);
  const recentEntries = resolve(recent);

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">Your Library</p>
          <h1 className="mt-6 text-h1 text-fg">Saved</h1>
          <p className="mt-4 max-w-[56ch] text-body text-fg-secondary">
            {synced
              ? 'Synced to your account and available on any device.'
              : 'Stored on this device.'}
            {available && !synced ? (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => void signIn()}
                  className="text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
                >
                  Sign in
                </button>{' '}
                to sync them.
              </>
            ) : null}
          </p>
        </Reveal>
      </Container>

      <Container className="mt-16">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : savedEntries.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={28} aria-hidden="true" />}
            title="Nothing saved yet"
            description="Use the bookmark button on any entry to keep it here."
            action={<ButtonLink to="/browse">Browse equipment</ButtonLink>}
          />
        ) : (
          <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
            {savedEntries.map((entry) => (
              <RevealItem key={entry.id}>
                <EquipmentCard entry={entry} headingLevel={2} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </Container>

      {recentEntries.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading
              overline="On this device"
              title="Recently Viewed"
              action={
                <button
                  type="button"
                  onClick={clearRecentlyViewed}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-elevated px-4 text-caption text-fg-secondary transition-colors hover:bg-raised hover:text-fg"
                >
                  <Trash2 size={14} aria-hidden="true" /> Clear
                </button>
              }
            />
          </Reveal>

          <RevealGroup as="ul" className="mt-8 grid gap-2" stagger={0.03}>
            {recentEntries.map((entry) => (
              <RevealItem as="li" key={entry.id}>
                <Link
                  to={`/equipment/${entry.slug}`}
                  className="flex items-center gap-4 rounded-(--radius-card) bg-card p-3 transition-colors hover:bg-elevated"
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-base">
                    {entry.thumb ? (
                      <img
                        src={entry.thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] text-fg">{entry.name}</p>
                    <p className="truncate text-caption text-fg-tertiary">
                      {entry.countries[0]?.name}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      ) : null}
    </div>
  );
}

