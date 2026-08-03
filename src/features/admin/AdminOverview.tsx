import { AlertTriangle, ArrowUpRight, Check, CloudUpload, Minus, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/primitives';
import { CATEGORIES } from '@shared/taxonomy';
import type { Equipment } from '@shared/schema';
import { useListing, type ListingEntry } from '@/lib/data';
import { useAdminEquipment } from './useAdminData';

/**
 * The dashboard landing screen: what is in the system of record, and how far
 * it has drifted from what visitors are actually being served.
 *
 * That second half is the part worth having. Firestore is the write target but
 * content pages read a build-time export, so an edit made here is invisible on
 * the live site until someone reseeds and redeploys. Without this panel that
 * gap is silent, and the natural assumption after clicking Save is that the
 * change went live.
 */
export default function AdminOverview() {
  const { data: entries, isLoading, error } = useAdminEquipment();
  const { data: listing } = useListing();

  const health = useMemo(() => computeHealth(entries ?? []), [entries]);
  const drift = useMemo(() => computeDrift(entries, listing), [entries, listing]);

  if (error) {
    return (
      <Panel tone="danger">
        <AlertTriangle size={18} aria-hidden="true" className="shrink-0 text-danger" />
        <div>
          <p className="text-caption font-medium text-fg">Could not read the equipment collection</p>
          <p className="mt-1 text-[0.6875rem] text-fg-secondary">{error.message}</p>
        </div>
      </Panel>
    );
  }

  if (isLoading || !entries) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="corpus-heading">
        <h2 id="corpus-heading" className="text-overline uppercase text-fg-tertiary">
          Corpus
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entries" value={health.total} />
          <Stat label="Categories in use" value={`${health.categoriesUsed} / ${CATEGORIES.length}`} />
          <Stat label="Featured" value={health.featured} />
          <Stat
            label="Missing a hero image"
            value={health.noHero}
            tone={health.noHero > 0 ? 'warning' : 'ok'}
          />
          <Stat
            label="No specifications"
            value={health.noSpecs}
            tone={health.noSpecs > 0 ? 'warning' : 'ok'}
          />
          <Stat
            label="No sources"
            value={health.noSources}
            tone={health.noSources > 0 ? 'danger' : 'ok'}
            hint={health.noSources > 0 ? 'CC BY-SA requires attribution' : undefined}
          />
          <Stat label="No service date" value={health.noServiceStart} />
          <Stat label="Empty categories" value={health.emptyCategories.length} />
        </div>
      </section>

      <section aria-labelledby="drift-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="drift-heading" className="text-overline uppercase text-fg-tertiary">
              Deploy drift
            </h2>
            <p className="mt-2 max-w-[62ch] text-caption text-fg-secondary">
              Firestore against the static export in <code className="text-fg">public/data</code>{' '}
              that visitors read. Closing a gap means{' '}
              <code className="text-fg">npm run seed</code> then a redeploy — edits here do not
              reach the live site on their own.
            </p>
          </div>
        </div>

        {!listing ? (
          <Skeleton className="mt-4 h-24" />
        ) : drift.total === 0 ? (
          <Panel tone="ok">
            <Check size={18} aria-hidden="true" className="shrink-0 text-success" />
            <p className="text-caption text-fg">
              In sync — all {health.total} entries match the shipped export.
            </p>
          </Panel>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <DriftGroup
              Icon={Plus}
              tone="warning"
              title="Only in Firestore"
              body="Added or restored here, but not in the shipped export. Not yet visible to visitors."
              slugs={drift.onlyInFirestore}
            />
            <DriftGroup
              Icon={Minus}
              tone="danger"
              title="Only in the export"
              body="Still served to visitors, but no longer in the system of record. A reseed will drop them."
              slugs={drift.onlyInExport}
              linkable={false}
            />
            <DriftGroup
              Icon={CloudUpload}
              tone="warning"
              title="Edited since the last build"
              body="Present in both, but the fields below differ from what is being served."
              slugs={drift.changed}
            />
          </div>
        )}
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-overline uppercase text-fg-tertiary">
          By category
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-caption">
            <thead>
              <tr className="border-b border-line text-left text-fg-tertiary">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Category
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Group
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Entries
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  With hero
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => {
                const stats = health.byCategory.get(category.slug);
                const count = stats?.count ?? 0;
                return (
                  <tr key={category.slug} className="border-b border-line/60">
                    <th scope="row" className="py-2 pr-4 text-left font-normal text-fg">
                      <Link
                        to={`/admin/equipment?category=${category.slug}`}
                        className="transition-colors hover:text-accent-bright"
                      >
                        {category.name}
                      </Link>
                    </th>
                    <td className="py-2 pr-4 text-fg-tertiary">{category.group}</td>
                    <td
                      className={
                        count === 0
                          ? 'tnum py-2 pr-4 text-right text-warning'
                          : 'tnum py-2 pr-4 text-right text-fg-secondary'
                      }
                    >
                      {count}
                    </td>
                    <td className="tnum py-2 text-right text-fg-tertiary">{stats?.withHero ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Derivations ───────────────────────────────────────────────

function computeHealth(entries: Equipment[]) {
  const byCategory = new Map<string, { count: number; withHero: number }>();

  let noHero = 0;
  let noSpecs = 0;
  let noSources = 0;
  let noServiceStart = 0;
  let featured = 0;

  for (const entry of entries) {
    const hasHero = Boolean(entry.images?.hero?.url);
    if (!hasHero) noHero++;
    if (!entry.specifications?.length) noSpecs++;
    if (!entry.sources?.length) noSources++;
    if (entry.serviceStart === undefined) noServiceStart++;
    if (entry.featured) featured++;

    const stats = byCategory.get(entry.category) ?? { count: 0, withHero: 0 };
    stats.count++;
    if (hasHero) stats.withHero++;
    byCategory.set(entry.category, stats);
  }

  return {
    total: entries.length,
    featured,
    noHero,
    noSpecs,
    noSources,
    noServiceStart,
    byCategory,
    categoriesUsed: byCategory.size,
    emptyCategories: CATEGORIES.filter((c) => !byCategory.has(c.slug)).map((c) => c.slug),
  };
}

/** Mirrors `entry.description.slice(0, 180)` in scripts/seed/index.ts. */
const LISTING_DESCRIPTION_LIMIT = 180;

/**
 * Compared on the fields the listing projection actually carries, in the shape
 * it carries them. The export holds no prose beyond a truncated description
 * and no `updatedAt`, so a body-only edit cannot be detected here — the panel
 * reports what it can prove rather than guessing.
 *
 * The truncation matters: comparing a full description against the export's
 * 180-character prefix reported 366 of 382 entries as edited, which is worse
 * than no drift panel at all — a signal that is always red is one nobody
 * reads.
 */
function computeDrift(entries: Equipment[] | undefined, listing: ListingEntry[] | undefined) {
  if (!entries || !listing) {
    return { onlyInFirestore: [], onlyInExport: [], changed: [], total: 0 };
  }

  const shipped = new Map(listing.map((entry) => [entry.slug, entry]));
  const live = new Map(entries.map((entry) => [entry.slug, entry]));

  const onlyInFirestore = entries.filter((entry) => !shipped.has(entry.slug)).map((e) => e.slug);
  const onlyInExport = listing.filter((entry) => !live.has(entry.slug)).map((e) => e.slug);

  const changed: string[] = [];
  for (const entry of entries) {
    const published = shipped.get(entry.slug);
    if (!published) continue;
    if (
      published.name !== entry.name ||
      published.description !== entry.description.slice(0, LISTING_DESCRIPTION_LIMIT) ||
      published.category !== entry.category ||
      published.kind !== entry.kind ||
      published.featured !== entry.featured ||
      published.popularity !== entry.popularity ||
      published.serviceStart !== entry.serviceStart ||
      published.hero !== entry.images?.hero?.url ||
      published.galleryCount !== entry.gallery.length ||
      published.countryCodes.join('|') !== entry.countryCodes.join('|')
    ) {
      changed.push(entry.slug);
    }
  }

  return {
    onlyInFirestore,
    onlyInExport,
    changed,
    total: onlyInFirestore.length + onlyInExport.length + changed.length,
  };
}

// ── Presentation ──────────────────────────────────────────────

type Tone = 'ok' | 'warning' | 'danger';

const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-fg',
  warning: 'text-warning',
  danger: 'text-danger',
};

function Stat({
  label,
  value,
  tone = 'ok',
  hint,
}: {
  label: string;
  value: number | string;
  tone?: Tone | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-card px-4 py-4">
      <p className="text-[0.6875rem] uppercase tracking-wide text-fg-tertiary">{label}</p>
      <p className={`tnum mt-2 text-h3 ${TONE_TEXT[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-[0.6875rem] text-fg-tertiary">{hint}</p> : null}
    </div>
  );
}

function Panel({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const border = tone === 'danger' ? 'border-danger/40' : tone === 'warning' ? 'border-warning/40' : 'border-line';
  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-(--radius-card) border ${border} bg-card px-4 py-4`}
    >
      {children}
    </div>
  );
}

function DriftGroup({
  Icon,
  tone,
  title,
  body,
  slugs,
  linkable = true,
}: {
  Icon: typeof Plus;
  tone: Tone;
  title: string;
  body: string;
  slugs: string[];
  linkable?: boolean;
}) {
  if (slugs.length === 0) return null;

  return (
    <div className="rounded-(--radius-card) border border-line bg-card px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon size={15} aria-hidden="true" className={TONE_TEXT[tone]} />
        <h3 className="text-caption font-medium text-fg">{title}</h3>
        <span className="tnum ml-auto text-caption text-fg-tertiary">{slugs.length}</span>
      </div>
      <p className="mt-1.5 text-[0.6875rem] text-fg-tertiary">{body}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {slugs.slice(0, 24).map((slug) => (
          <li key={slug}>
            {linkable ? (
              <Link
                to={`/admin/equipment/${slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-base px-2.5 py-1 text-[0.6875rem] text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
              >
                {slug}
                <ArrowUpRight size={11} aria-hidden="true" />
              </Link>
            ) : (
              <span className="inline-block rounded-full border border-line bg-base px-2.5 py-1 text-[0.6875rem] text-fg-tertiary">
                {slug}
              </span>
            )}
          </li>
        ))}
        {slugs.length > 24 ? (
          <li className="self-center text-[0.6875rem] text-fg-tertiary">
            +{slugs.length - 24} more
          </li>
        ) : null}
      </ul>
    </div>
  );
}
