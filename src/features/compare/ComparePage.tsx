import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { SmartImage } from '@/components/ui/Image';
import { Container, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { useListing } from '@/lib/data';
import { sizedImage } from '@shared/images';
import { useDocumentMeta } from '@/lib/seo';
import type { Equipment } from '@shared/schema';

const MAX_SLOTS = 4;

async function loadEntry(slug: string): Promise<Equipment> {
  const res = await fetch(`/data/equipment/${slug}.json`);
  if (!res.ok) throw new Error(`Failed to load ${slug}`);
  return (await res.json()) as Equipment;
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const { data: listing } = useListing();
  const [entries, setEntries] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);

  useDocumentMeta({
    title: 'Compare Equipment | Arsenal Atlas',
    description: 'Compare up to four pieces of military equipment side by side.',
    canonical: '/compare',
  });

  const slugs = useMemo(() => params.getAll('add').slice(0, MAX_SLOTS), [params]);

  useEffect(() => {
    let cancelled = false;

    if (slugs.length === 0) {
      // Cleared asynchronously so the state update never lands during the
      // effect's synchronous pass.
      queueMicrotask(() => !cancelled && setEntries([]));
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setLoading(true);
      const loaded = await Promise.all(slugs.map((slug) => loadEntry(slug).catch(() => null)));
      if (cancelled) return;
      setEntries(loaded.filter((entry): entry is Equipment => entry !== null));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [slugs]);

  const setSlugs = (next: string[]) => {
    const search = new URLSearchParams();
    for (const slug of next.slice(0, MAX_SLOTS)) search.append('add', slug);
    setParams(search, { replace: true });
  };

  /**
   * Union of every spec label across the selected entries, so a field only one
   * of them has still gets a row (rendered as a dash for the others) rather
   * than being silently dropped.
   */
  const rows = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const entry of entries) {
      for (const label of Object.keys(entry.specIndex)) {
        if (!seen.has(label)) {
          seen.add(label);
          labels.push(label);
        }
      }
    }
    return labels;
  }, [entries]);

  return (
    <div className="pb-32 pt-nav">
      <Container className="pt-20">
        <Reveal>
          <p className="text-overline uppercase text-fg-tertiary">Side by Side</p>
          <h1 className="mt-6 text-h1 text-fg">Compare</h1>
          <p className="mt-4 max-w-[54ch] text-body text-fg-secondary">
            Select up to four entries. Values that differ across the selection are highlighted.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: MAX_SLOTS }, (_, index) => {
              const entry = entries[index];
              return entry ? (
                <div
                  key={entry.slug}
                  className="relative overflow-hidden rounded-(--radius-card) bg-card"
                >
                  <div className="relative aspect-16/10 bg-base">
                    {entry.images.hero ? (
                      <SmartImage
                        src={sizedImage(entry.images.hero.url, 960, entry.images.hero.width)}
                        alt={entry.name}
                        fill
                        sizes="(min-width: 1024px) 20rem, 45vw"
                        intrinsicWidth={entry.images.hero.width}
                      />
                    ) : null}
                  </div>
                  <p className="p-4 text-[0.9375rem] text-fg">{entry.name}</p>
                  <button
                    type="button"
                    onClick={() => setSlugs(slugs.filter((s) => s !== entry.slug))}
                    className="on-dark absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-scrim/70 text-fg-secondary backdrop-blur transition-colors hover:text-fg"
                    aria-label={`Remove ${entry.name} from comparison`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <AddSlot
                  key={`slot-${index}`}
                  listing={listing ?? []}
                  exclude={slugs}
                  onAdd={(slug) => setSlugs([...slugs, slug])}
                />
              );
            })}
          </div>
        </Reveal>
      </Container>

      <Container className="mt-16">
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : entries.length < 2 ? (
          <div className="rounded-(--radius-card) bg-card p-12 text-center">
            <p className="text-body text-fg-secondary">
              Add at least two entries to see a comparison.
            </p>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Comparison table, scrollable"
            className="overflow-x-auto rounded-(--radius-card) bg-card"
          >
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                {/* Sticky header keeps the entry names visible while scrolling
                    a long specification list. */}
                <tr className="sticky top-nav z-10 bg-elevated">
                  <th scope="col" className="w-56 p-4 text-overline uppercase text-fg-secondary">
                    Specification
                  </th>
                  {entries.map((entry) => (
                    <th key={entry.slug} scope="col" className="p-4 text-[0.9375rem] text-fg">
                      {entry.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((label) => {
                  const values = entries.map((entry) => entry.specIndex[label]);
                  const present = values.filter((value) => value !== undefined);
                  const differs =
                    present.length > 1 && new Set(present.map(String)).size > 1;

                  return (
                    <tr key={label} className="border-t border-line">
                      <th
                        scope="row"
                        className="p-4 align-top text-caption font-normal text-fg-tertiary"
                      >
                        {label}
                      </th>
                      {values.map((value, index) => (
                        <td
                          key={`${label}-${index}`}
                          className={cn(
                            'tnum p-4 align-top text-[0.9375rem] transition-colors',
                            // Difference is marked with a tinted cell AND a
                            // left rule, so it does not rely on colour alone.
                            differs
                              ? 'border-l-2 border-l-accent bg-accent-dim text-fg'
                              : 'text-fg-secondary'
                          )}
                        >
                          {value === undefined ? (
                            <span className="text-fg-tertiary" aria-label="Not specified">
                              —
                            </span>
                          ) : (
                            String(value)
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
}

function AddSlot({
  listing,
  exclude,
  onAdd,
}: {
  listing: { slug: string; name: string; category: string }[];
  exclude: string[];
  onAdd: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = listing
    .filter((entry) => !exclude.includes(entry.slug))
    .filter((entry) => entry.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full min-h-52 w-full flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-line-strong bg-base text-fg-tertiary transition-colors hover:border-line-glow hover:text-fg-secondary"
        aria-expanded={open}
      >
        <Plus size={22} />
        <span className="text-caption">Add equipment</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-(--radius-card) bg-elevated shadow-(--shadow-sheet)"
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter…"
              autoFocus
              className="h-12 w-full border-b border-line bg-transparent px-4 text-caption text-fg outline-none placeholder:text-fg-tertiary"
            />
            <ul className="max-h-64 overflow-y-auto p-1">
              {options.map((entry) => (
                <li key={entry.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(entry.slug);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="w-full truncate rounded-lg px-3 py-2 text-left text-caption text-fg-secondary transition-colors hover:bg-card hover:text-fg"
                  >
                    {entry.name}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
