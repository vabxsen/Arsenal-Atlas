import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, RefreshCw, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Skeleton } from '@/components/ui/primitives';
import { CATEGORIES, getCategory } from '@shared/taxonomy';
import type { CountryRef, EntityRef, Equipment, SourceRef } from '@shared/schema';
import { emptyEquipment, slugExists, slugify, validateEquipment, type FieldIssue } from './adminApi';
import { rebuildSpecIndex } from '@shared/derive';
import { useAdminEntry, useSaveEquipment } from './useAdminData';
import {
  JsonField,
  NumberInput,
  RepeatList,
  Select,
  StringList,
  TextArea,
  TextInput,
  Toggle,
} from './fields';

/**
 * The entry editor.
 *
 * Two shapes of field, split on how the data is actually produced. Everything
 * a human authors or corrects by hand — names, prose, countries, attribution —
 * gets a real control. The deeply nested structures that arrive fully formed
 * from the seed pipeline (grouped specifications, galleries, timelines) get a
 * validated JSON panel instead: they are edited rarely and surgically, and
 * four levels of nested repeatable form would be more code and worse to use.
 *
 * Nothing is written until the assembled document parses against
 * `equipmentSchema` — the same gate `scripts/seed/normalize.ts` passes through
 * — so a hand-made entry cannot be less well-formed than a seeded one.
 */
export default function EquipmentEditor() {
  const { slug } = useParams<{ slug: string }>();
  const isNew = slug === 'new';
  const navigate = useNavigate();

  const { data: loaded, isLoading } = useAdminEntry(isNew ? undefined : slug);
  const save = useSaveEquipment();

  const [draft, setDraft] = useState<Equipment>(emptyEquipment);
  const [dirty, setDirty] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string | null>>({});
  const [saved, setSaved] = useState(false);
  // Bumped to remount the spec-index panel after an out-of-band rebuild.
  const [rebuildCount, setRebuildCount] = useState(0);
  // Once the slug is typed by hand it stops tracking the name, or every
  // keystroke in Name would overwrite a deliberate URL choice.
  const [slugTouched, setSlugTouched] = useState(!isNew);

  // Adopt the fetched document during render rather than in an effect, the
  // same idiom Nav uses for route changes. An effect would paint one frame of
  // the blank draft first, and React would then have to render twice.
  const [hydratedFrom, setHydratedFrom] = useState<string | null>(null);
  if (!isNew && loaded && hydratedFrom !== loaded.slug) {
    setHydratedFrom(loaded.slug);
    setDraft(loaded);
  }

  // Editing is a long, losable piece of work; a stray Cmd-W should not
  // discard it silently.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patch = useCallback((changes: Partial<Equipment>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setDirty(true);
    setSaved(false);
  }, []);

  const jsonError = useMemo(
    () => Object.values(jsonErrors).find((value) => value) ?? null,
    [jsonErrors]
  );

  const onJsonError = useCallback(
    (field: string) => (error: string | null) =>
      setJsonErrors((current) => ({ ...current, [field]: error })),
    []
  );

  const issueFor = (path: string) => issues.find((issue) => issue.path === path)?.message;

  const handleSave = async () => {
    setIssues([]);
    setSaved(false);

    const candidate: Equipment = {
      ...draft,
      // The document id is the slug, matching scripts/seed/push.ts. `id` is
      // the in-document copy; defaulting it to the slug keeps a hand-made
      // entry shaped like a seeded one.
      id: draft.id.trim() || draft.slug,
      updatedAt: new Date().toISOString(),
    };

    const result = validateEquipment(candidate);
    if (!result.ok) {
      setIssues(result.issues);
      return;
    }

    if (isNew && (await slugExists(result.value.slug))) {
      setIssues([
        {
          path: 'slug',
          message: 'An entry already exists at this slug. Saving would overwrite it.',
        },
      ]);
      return;
    }

    await save.mutateAsync(result.value);
    setDraft(result.value);
    setDirty(false);
    setSaved(true);
    // Swap the URL from /new to the real slug so a reload lands on the entry
    // that was just created instead of a blank form.
    if (isNew) void navigate(`/admin/equipment/${result.value.slug}`, { replace: true });
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isNew && !isLoading && !loaded) {
    return (
      <div className="rounded-(--radius-card) bg-card px-6 py-16 text-center">
        <p className="text-h3 text-fg">No entry at “{slug}”</p>
        <p className="mt-2 text-caption text-fg-secondary">
          It may have been deleted, or it exists only in the static export.
        </p>
        <Link
          to="/admin/equipment"
          className="mt-8 inline-flex min-h-11 items-center rounded-full border border-line px-5 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
        >
          Back to all entries
        </Link>
      </div>
    );
  }

  const derivedKind = getCategory(draft.category)?.kind ?? draft.kind;

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/equipment"
            className="inline-flex items-center gap-1.5 text-caption text-fg-tertiary transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All entries
          </Link>
          <h1 className="mt-2 truncate text-h3 text-fg">
            {isNew ? 'New entry' : (draft.name || slug)}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {!isNew ? (
            <a
              href={`/equipment/${draft.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg"
            >
              View live
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : null}
          <Button type="submit" disabled={save.isPending || Boolean(jsonError)}>
            {save.isPending ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            {save.isPending ? 'Saving…' : isNew ? 'Create entry' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/* ── Status ─────────────────────────────────────────── */}
      <div aria-live="polite" className="empty:hidden">
        {jsonError ? (
          <Callout tone="danger" title="A JSON panel below is not valid">
            {jsonError}
          </Callout>
        ) : null}

        {issues.length > 0 ? (
          <Callout tone="danger" title={`${issues.length} field${issues.length === 1 ? '' : 's'} need attention`}>
            <ul className="mt-2 flex flex-col gap-1">
              {issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <code className="text-fg">{issue.path || 'document'}</code> — {issue.message}
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {save.isError ? (
          <Callout tone="danger" title="Firestore rejected the write">
            {save.error.message}
            <span className="mt-1 block text-fg-tertiary">
              A permission error here means the ID token is missing the admin claim.
            </span>
          </Callout>
        ) : null}

        {saved ? (
          <Callout tone="ok" title="Saved to Firestore">
            Visitors still see the previous version until <code className="text-fg">npm run seed</code>{' '}
            and a redeploy rebuild the static export.
          </Callout>
        ) : null}
      </div>

      {/* ── Identity ───────────────────────────────────────── */}
      <Section title="Identity">
        <TextInput
          label="Name"
          required
          value={draft.name}
          error={issueFor('name')}
          onChange={(name) =>
            patch(slugTouched ? { name } : { name, slug: slugify(name) })
          }
        />
        <TextInput
          label="Slug"
          required
          value={draft.slug}
          disabled={!isNew}
          error={issueFor('slug')}
          hint={
            isNew
              ? 'Lowercase, digits and hyphens. Becomes the document id and the public URL.'
              : 'Fixed after creation — it is the document id, and changing it would fork the entry rather than rename it.'
          }
          onChange={(value) => {
            setSlugTouched(true);
            patch({ slug: value });
          }}
        />
        <StringList
          label="Aliases"
          values={draft.aliases}
          onChange={(aliases) => patch({ aliases })}
          placeholder="Alternate designation or nickname"
          hint="Heavily weighted in search — this is what makes “kalash” find the AK-47."
        />
      </Section>

      {/* ── Classification ─────────────────────────────────── */}
      <Section title="Classification">
        <Select
          label="Category"
          value={draft.category}
          error={issueFor('category')}
          options={CATEGORIES.map((category) => ({
            value: category.slug,
            label: `${category.group} · ${category.name}`,
          }))}
          onChange={(category) => patch({ category })}
        />
        <TextInput
          label="Kind"
          value={derivedKind}
          disabled
          onChange={() => undefined}
          hint="Derived from the category by shared/taxonomy.ts, and set on save. It selects which specification groups the detail page renders."
        />
        <TextInput
          label="Subcategory"
          value={draft.subcategory ?? ''}
          onChange={(value) => patch({ subcategory: value || undefined })}
        />
      </Section>

      {/* ── Prose ──────────────────────────────────────────── */}
      <Section title="Prose">
        <TextArea
          label="Description"
          required
          rows={4}
          value={draft.description}
          error={issueFor('description')}
          onChange={(description) => patch({ description })}
          hint="The lead paragraph. Also the meta description and the card summary — the first 155 characters do most of the work."
        />
        <TextArea
          label="History"
          rows={10}
          value={draft.history ?? ''}
          onChange={(value) => patch({ history: value || undefined })}
        />
        <TextArea
          label="Development"
          rows={10}
          value={draft.development ?? ''}
          onChange={(value) => patch({ development: value || undefined })}
        />
        <StringList
          label="Facts"
          values={draft.facts}
          onChange={(facts) => patch({ facts })}
          placeholder="A single notable fact"
        />
      </Section>

      {/* ── Service ────────────────────────────────────────── */}
      <Section title="Service and ranking">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            label="Entered service"
            value={draft.serviceStart}
            error={issueFor('serviceStart')}
            onChange={(serviceStart) => patch({ serviceStart })}
          />
          <NumberInput
            label="Left service"
            value={draft.serviceEnd}
            error={issueFor('serviceEnd')}
            onChange={(serviceEnd) => patch({ serviceEnd })}
          />
          <NumberInput
            label="Popularity"
            value={draft.popularity}
            error={issueFor('popularity')}
            onChange={(value) => patch({ popularity: value ?? 0 })}
          />
        </div>
        <Toggle
          label="Featured"
          checked={draft.featured}
          onChange={(featured) => patch({ featured })}
          hint="Eligible for the homepage rails. Only entries with a hero image are shown there."
        />
      </Section>

      {/* ── Origin ─────────────────────────────────────────── */}
      <Section
        title="Origin and operators"
        note="ISO 3166-1 alpha-3 codes are what join an entry to the country explorer and the world map. A country without one still displays, but will not appear on the map."
      >
        <RepeatList<CountryRef>
          label="Countries of origin"
          rows={draft.countries}
          columns={COUNTRY_COLUMNS}
          blank={() => ({ name: '' })}
          onChange={(countries) => patch({ countries })}
          addLabel="Add country"
        />
        <RepeatList<CountryRef>
          label="Operators"
          rows={draft.operators}
          columns={COUNTRY_COLUMNS}
          blank={() => ({ name: '' })}
          onChange={(operators) => patch({ operators })}
          addLabel="Add operator"
        />
        <RepeatList<EntityRef>
          label="Manufacturers"
          rows={draft.manufacturers}
          columns={ENTITY_COLUMNS}
          blank={() => ({ name: '' })}
          onChange={(manufacturers) => patch({ manufacturers })}
          addLabel="Add manufacturer"
        />
        <RepeatList<EntityRef>
          label="Designers"
          rows={draft.designers}
          columns={ENTITY_COLUMNS}
          blank={() => ({ name: '' })}
          onChange={(designers) => patch({ designers })}
          addLabel="Add designer"
        />
        <RepeatList<EntityRef>
          label="Conflicts"
          rows={draft.conflicts}
          columns={ENTITY_COLUMNS}
          blank={() => ({ name: '' })}
          onChange={(conflicts) => patch({ conflicts })}
          addLabel="Add conflict"
        />
      </Section>

      {/* ── Attribution ────────────────────────────────────── */}
      <Section
        title="Attribution"
        note="Not optional. Prose adapted from Wikipedia is CC BY-SA 4.0, so at least one source with a licence must travel with every entry — the schema and firestore.rules both reject a write without one. The revision id is what makes the attribution verifiable rather than decorative."
      >
        <RepeatList<SourceRef>
          label="Sources"
          rows={draft.sources}
          columns={SOURCE_COLUMNS}
          blank={() => ({
            title: '',
            url: '',
            license: 'CC BY-SA 4.0',
            licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
            retrievedAt: new Date().toISOString(),
          })}
          onChange={(sources) => patch({ sources })}
          addLabel="Add source"
          error={issueFor('sources')}
        />
      </Section>

      {/* ── Imagery ────────────────────────────────────────── */}
      <Section
        title="Imagery"
        note="Wikimedia only serves pre-rendered thumbnail widths — 330, 500, 960, 1280, 1920. src/lib/images.ts snaps to that ladder, so store the full-resolution upload.wikimedia.org URL and let it pick. Each image carries its own licence and author because Commons files are licensed individually."
      >
        <JsonField
          label="Hero image"
          value={draft.images}
          onChange={(images) => patch({ images })}
          onParseError={onJsonError('images')}
          rows={12}
          hint="{ hero?: { url, width, height, caption?, license, licenseUrl?, attribution?, descriptionUrl? }, thumb?: string }"
        />
        <JsonField
          label="Gallery"
          value={draft.gallery}
          onChange={(gallery) => patch({ gallery })}
          onParseError={onJsonError('gallery')}
          rows={12}
          hint="An array of image records in the same shape as hero."
        />
      </Section>

      {/* ── Structured ─────────────────────────────────────── */}
      <Section
        title="Structured data"
        note="countryCodes is omitted: it is recomputed on save from the countries and operators above, exactly as scripts/seed/normalize.ts computes it. specIndex is not, and is editable below — see the note there."
      >
        <JsonField
          label="Specifications"
          value={draft.specifications}
          onChange={(specifications) => patch({ specifications })}
          onParseError={onJsonError('specifications')}
          rows={18}
          hint="[{ group, items: [{ label, value, numeric?, unit?, note? }] }]"
        />

        {/* specIndex is the one derived field the editor cannot recompute
            safely. It is keyed on the field labels in scripts/seed/specMap.ts,
            and those are not recoverable from a finished document: "Thrust
            (Afterburner)" is a field label in its own right, while "Range
            (land)" is the field "Range" qualified by a value line, and nothing
            stored distinguishes them. So it is carried through untouched and
            rebuilding it is a deliberate act, not a side effect of saving. */}
        <div className="flex flex-col gap-2">
          <JsonField
            // Remount so the textarea picks up an externally rebuilt value;
            // it holds its own text state to survive half-typed edits.
            key={`spec-index-${rebuildCount}`}
            label="Spec index"
            value={draft.specIndex}
            onChange={(specIndex) => patch({ specIndex })}
            onParseError={onJsonError('specIndex')}
            rows={10}
            hint="Flat label → value projection that Compare diffs against. Preserved as-is on save."
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                patch({ specIndex: rebuildSpecIndex(draft.specifications) });
                setRebuildCount((count) => count + 1);
              }}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-line px-4 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Rebuild from specifications
            </button>
            <p className="max-w-[52ch] text-[0.6875rem] leading-relaxed text-fg-tertiary">
              Approximate — it keys on item labels verbatim, which reproduces the pipeline on
              about 60% of the corpus. Use it after editing specifications, where the
              alternative is an index still describing the old values. The next{' '}
              <code className="text-fg-secondary">npm run seed</code> regenerates it properly.
            </p>
          </div>
        </div>
        <JsonField
          label="Timeline"
          value={draft.timeline}
          onChange={(timeline) => patch({ timeline })}
          onParseError={onJsonError('timeline')}
          rows={10}
          hint="[{ year, date?, title, detail? }]"
        />
        <JsonField
          label="Variants"
          value={draft.variants}
          onChange={(variants) => patch({ variants })}
          onParseError={onJsonError('variants')}
          rows={10}
          hint="[{ name, slug?, year?, description? }]"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <JsonField
            label="Related equipment"
            value={draft.relatedEquipment}
            onChange={(relatedEquipment) => patch({ relatedEquipment })}
            onParseError={onJsonError('relatedEquipment')}
            rows={8}
            hint="[{ name, slug? }]"
          />
          <JsonField
            label="Compatible ammunition"
            value={draft.compatibleAmmunition}
            onChange={(compatibleAmmunition) => patch({ compatibleAmmunition })}
            onParseError={onJsonError('compatibleAmmunition')}
            rows={8}
            hint="[{ name, slug? }]"
          />
        </div>
        <TextInput
          label="Family id"
          value={draft.familyId ?? ''}
          onChange={(value) => patch({ familyId: value || undefined })}
          hint="Links this entry into a families/{id} evolution tree, which is what draws the family diagram on the detail page."
        />
      </Section>

      <div className="flex items-center gap-4 border-t border-line pt-8">
        <Button type="submit" disabled={save.isPending || Boolean(jsonError)}>
          {save.isPending ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : (
            <Save size={15} aria-hidden="true" />
          )}
          {save.isPending ? 'Saving…' : isNew ? 'Create entry' : 'Save changes'}
        </Button>
        {dirty ? <p className="text-caption text-fg-tertiary">Unsaved changes</p> : null}
      </div>
    </form>
  );
}

// ── Column definitions ────────────────────────────────────────

const COUNTRY_COLUMNS = [
  { key: 'name' as const, label: 'Name', span: 8, placeholder: 'Soviet Union' },
  { key: 'iso3' as const, label: 'ISO3', span: 4, placeholder: 'SUN' },
];

const ENTITY_COLUMNS = [
  { key: 'name' as const, label: 'Name', span: 7 },
  { key: 'slug' as const, label: 'Slug (optional)', span: 5 },
];

const SOURCE_COLUMNS = [
  { key: 'title' as const, label: 'Title', span: 4 },
  { key: 'url' as const, label: 'URL', span: 4, type: 'url' as const },
  { key: 'license' as const, label: 'Licence', span: 2 },
  { key: 'revisionId' as const, label: 'Revision', span: 2, type: 'number' as const },
];

// ── Layout ────────────────────────────────────────────────────

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-8">
      <div>
        <h2 className="text-overline uppercase text-fg-tertiary">{title}</h2>
        {note ? <p className="mt-2 max-w-[72ch] text-[0.6875rem] leading-relaxed text-fg-tertiary">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'ok' | 'danger';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={`mb-3 flex items-start gap-3 rounded-(--radius-card) border px-4 py-3 text-[0.6875rem] text-fg-secondary ${
        tone === 'danger' ? 'border-danger/40' : 'border-success/40'
      } bg-card`}
    >
      {tone === 'danger' ? (
        <AlertTriangle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
      ) : null}
      <div className="min-w-0">
        <p className="text-caption font-medium text-fg">{title}</p>
        {children}
      </div>
    </div>
  );
}
