import { Bookmark, Trash2, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { EquipmentCard } from '@/components/ui/EquipmentCard';
import { Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
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
          <h1 className="mt-6 text-h1 text-titanium">Saved</h1>
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
            Icon={Bookmark}
            title="Nothing saved yet"
            body="Use the bookmark button on any entry to keep it here."
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
        <Container className="mt-24">
          <Reveal>
            <SectionHeading
              overline="On this device"
              title="Recently Viewed"
              action={
                <button
                  type="button"
                  onClick={clearRecentlyViewed}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
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
                  className="flex items-center gap-4 rounded-(--radius-card) border border-line bg-card p-3 transition-colors hover:border-line-strong"
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

function EmptyState({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-card px-6 py-16 text-center">
      <Icon size={28} className="mx-auto text-fg-tertiary" aria-hidden="true" />
      <p className="mt-4 text-h3 text-fg">{title}</p>
      <p className="mx-auto mt-2 max-w-[40ch] text-caption text-fg-secondary">{body}</p>
      <Link
        to="/browse"
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-fg px-6 text-[0.9375rem] font-medium text-deep transition-colors hover:bg-white"
      >
        Browse equipment
      </Link>
    </div>
  );
}
