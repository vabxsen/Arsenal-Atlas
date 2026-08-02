import { AlertTriangle, ImageOff, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/primitives';
import { CATEGORIES, getCategory } from '@shared/taxonomy';
import type { Equipment } from '@shared/schema';
import { cn } from '@/lib/cn';
import { useAdminEquipment, useDeleteEquipment } from './useAdminData';

/**
 * The equipment index.
 *
 * Reads Firestore rather than the static export, because this screen exists to
 * show what the system of record holds — including entries that have not been
 * built into the site yet, which by definition are absent from the export.
 *
 * Filtering is done in memory over the already-fetched collection. At 382
 * entries that is instant, and every alternative costs another round-trip per
 * keystroke plus a composite index for each filter combination.
 */
export default function EquipmentList() {
  const { data: entries, isLoading, error } = useAdminEquipment();
  const remove = useDeleteEquipment();

  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const [term, setTerm] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return (entries ?? []).filter((entry) => {
      if (category && entry.category !== category) return false;
      if (!needle) return true;
      return (
        entry.name.toLowerCase().includes(needle) ||
        entry.slug.includes(needle) ||
        entry.aliases.some((alias) => alias.toLowerCase().includes(needle))
      );
    });
  }, [entries, category, term]);

  const setCategory = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next) updated.set('category', next);
    else updated.delete('category');
    // Replace rather than push: filtering is not a navigation, and stacking a
    // history entry per keystroke-adjacent change makes Back useless.
    setParams(updated, { replace: true });
  };

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-(--radius-card) border border-danger/40 bg-card px-4 py-4">
        <AlertTriangle size={18} aria-hidden="true" className="shrink-0 text-danger" />
        <div>
          <p className="text-caption font-medium text-fg">Could not load entries</p>
          <p className="mt-1 text-[0.6875rem] text-fg-secondary">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
          />
          <label htmlFor="admin-search" className="sr-only">
            Filter entries by name, slug, or alias
          </label>
          <input
            id="admin-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Filter by name, slug, or alias…"
            className="w-full min-h-11 rounded-xl border border-line bg-base py-2 pl-9 pr-3 text-[0.9375rem] text-fg transition-colors placeholder:text-fg-tertiary hover:border-line-strong focus:border-line-glow focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div className="relative">
          <SlidersHorizontal
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary"
          />
          <label htmlFor="admin-category" className="sr-only">
            Filter by category
          </label>
          <select
            id="admin-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="min-h-11 cursor-pointer rounded-xl border border-line bg-base py-2 pl-9 pr-3 text-[0.9375rem] text-fg transition-colors hover:border-line-strong focus:border-line-glow focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <Link
          to="/admin/equipment/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-fg px-5 text-[0.9375rem] font-medium text-deep transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <Plus size={16} aria-hidden="true" />
          New entry
        </Link>
      </div>

      <p aria-live="polite" className="text-caption text-fg-tertiary">
        {isLoading
          ? 'Loading…'
          : `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}${
              category ? ` in ${getCategory(category)?.name ?? category}` : ''
            }${term ? ` matching “${term}”` : ''}`}
      </p>

      {remove.isError ? (
        <p role="alert" className="text-caption text-danger">
          Delete failed: {remove.error.message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-line px-6 py-16 text-center text-caption text-fg-tertiary">
          Nothing matches those filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-caption">
            <thead>
              <tr className="border-b border-line text-left text-fg-tertiary">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Name
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Category
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Specs
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Sources
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Updated
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <Row
                  key={entry.slug}
                  entry={entry}
                  confirming={pendingDelete === entry.slug}
                  busy={remove.isPending && remove.variables === entry.slug}
                  onAskDelete={() => setPendingDelete(entry.slug)}
                  onCancelDelete={() => setPendingDelete(null)}
                  onConfirmDelete={() => {
                    setPendingDelete(null);
                    remove.mutate(entry.slug);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  entry,
  confirming,
  busy,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  entry: Equipment;
  confirming: boolean;
  busy: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const specCount = entry.specifications.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <tr className={cn('border-b border-line/60', busy && 'opacity-50')}>
      <th scope="row" className="py-2.5 pr-4 text-left font-normal">
        <Link
          to={`/admin/equipment/${entry.slug}`}
          className="flex items-center gap-3 text-fg transition-colors hover:text-accent-bright"
        >
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-base">
            {entry.images?.thumb ? (
              <img src={entry.images.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
              <ImageOff size={13} aria-hidden="true" className="text-fg-tertiary" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate">{entry.name}</span>
            <span className="block truncate font-mono text-[0.6875rem] text-fg-tertiary">
              {entry.slug}
            </span>
          </span>
        </Link>
      </th>

      <td className="py-2.5 pr-4 text-fg-secondary">
        {getCategory(entry.category)?.name ?? entry.category}
      </td>

      <td className={cn('tnum py-2.5 pr-4 text-right', specCount === 0 ? 'text-warning' : 'text-fg-tertiary')}>
        {specCount}
      </td>

      <td
        className={cn(
          'tnum py-2.5 pr-4 text-right',
          entry.sources.length === 0 ? 'text-danger' : 'text-fg-tertiary'
        )}
      >
        {entry.sources.length}
      </td>

      <td className="py-2.5 pr-4 text-fg-tertiary">{entry.updatedAt.slice(0, 10)}</td>

      <td className="py-2.5 text-right">
        {confirming ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={onConfirmDelete}
              className="min-h-11 rounded-full border border-danger/50 px-3 text-[0.6875rem] font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              Delete {entry.slug}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="min-h-11 rounded-full px-3 text-[0.6875rem] text-fg-secondary transition-colors hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={onAskDelete}
            disabled={busy}
            className="grid size-11 place-items-center rounded-full text-fg-tertiary transition-colors hover:bg-card hover:text-danger focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-40"
          >
            <span className="sr-only">Delete {entry.name}</span>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
}
