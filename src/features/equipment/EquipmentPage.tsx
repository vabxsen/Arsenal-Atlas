import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft, Check, Copy, GitCompareArrows, Printer, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';
import { SmartImage } from '@/components/ui/Image';
import { Button, Chip, Container, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { useEquipment, useFamilies, useListing } from '@/lib/data';
import { HERO_MAX_WIDTH, heroFit, sizedImage } from '@shared/images';
import { useDocumentMeta } from '@/lib/seo';
import { getCategory } from '@shared/taxonomy';
import type { Equipment } from '@shared/schema';
import { motionWhen } from '@/lib/motion';
import { ReadingProgress } from '@/components/ui/ReadingProgress';
import { FavoriteButton } from '@/features/user/FavoriteButton';
import { recordVisit } from '@/features/user/collections';
import { GalleryViewer } from './Gallery';
import { FamilyTree } from './FamilyTree';
import { SpecTable } from './SpecTable';

export default function EquipmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entry, isLoading, isError } = useEquipment(slug);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !entry) return <NotFound slug={slug} />;
  return <Detail entry={entry} />;
}

function Detail({ entry }: { entry: Equipment }) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion() ?? false;
  const fit = heroFit(entry.images.hero?.width, entry.images.hero?.height);

  const category = getCategory(entry.category);
  const { data: families } = useFamilies();
  const { data: listing } = useListing();

  const family = families?.find((f) => f.id === entry.familyId);

  useDocumentMeta({
    title: `${entry.name} — Specifications, History & Images | Arsenal Atlas`,
    description: entry.description.slice(0, 155),
    image: entry.images.hero?.url,
    canonical: `/equipment/${entry.slug}`,
    jsonLd: buildJsonLd(entry),
  });

  // Recorded once per entry, not per render.
  useEffect(() => {
    recordVisit(entry.slug);
  }, [entry.slug]);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);

  const copySpecs = () => {
    const text = entry.specifications
      .map(
        (group) =>
          `${group.group}\n${group.items.map((i) => `  ${i.label}: ${i.value}`).join('\n')}`
      )
      .join('\n\n');

    // Fire-and-forget: the handler stays synchronous so it can be passed
    // straight to onClick without a promise-returning-void mismatch.
    void navigator.clipboard
      .writeText(`${entry.name}\n\n${text}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      // Clipboard blocked — the specs remain visible on the page.
      .catch(() => undefined);
  };

  const share = () => {
    const url = window.location.href;
    const fallback = () =>
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => undefined);

    if (navigator.share) {
      void navigator
        .share({ title: entry.name, text: entry.description.slice(0, 120), url })
        // User dismissed the sheet, or sharing is unavailable for this payload.
        .catch(() => undefined);
      return;
    }
    void fallback();
  };

  const related = listing
    ?.filter((item) => item.category === entry.category && item.slug !== entry.slug)
    .slice(0, 4);

  return (
    <article className="pb-32">
      <ReadingProgress />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="on-dark print-compact relative isolate flex min-h-[86vh] items-end overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 z-0"
          {...motionWhen(!prefersReduced, { style: { y: heroY, opacity: heroOpacity } })}
        >
          {entry.images.hero ? (
            <>
              {/* A letterboxed subject would otherwise sit between two dead
                  black bands. A blurred, darkened copy of the same image fills
                  them, so the frame stays full-bleed and the photograph's own
                  colour carries across it.

                  Requested at 500px deliberately: it is blurred well past the
                  point where resolution is visible, so anything larger is
                  transfer cost for no pixels anyone can see. */}
              {fit === 'contain' ? (
                <>
                  <img
                    src={sizedImage(entry.images.hero.url, 500, entry.images.hero.width)}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-3xl"
                  />
                  {/* Confined to the upper region rather than the whole frame.
                      Letterboxing centres the subject vertically, which put it
                      directly behind the title block — the breadcrumb landed on
                      a pale studio backdrop at roughly 1.5:1 contrast. Giving
                      the image the top 56% and the copy the rest keeps them
                      apart whatever the title wraps to. */}
                  <div className="absolute inset-x-0 top-0 h-[56%]">
                    <SmartImage
                      src={sizedImage(
                        entry.images.hero.url,
                        HERO_MAX_WIDTH,
                        entry.images.hero.width
                      )}
                      alt={entry.name}
                      fill
                      priority
                      fit="contain"
                      sizes="100vw"
                      intrinsicWidth={Math.min(entry.images.hero.width, HERO_MAX_WIDTH)}
                      className="p-6 sm:p-10"
                    />
                  </div>
                </>
              ) : (
                <SmartImage
                  src={sizedImage(entry.images.hero.url, HERO_MAX_WIDTH, entry.images.hero.width)}
                  alt={entry.name}
                  fill
                  priority
                  fit="cover"
                  sizes="100vw"
                  intrinsicWidth={Math.min(entry.images.hero.width, HERO_MAX_WIDTH)}
                />
              )}
            </>
          ) : null}
        </motion.div>
        {/* Two scrims, because the two hero layouts need opposite things.
            Over a cropped photograph the darkening can rise gently through the
            whole frame. Over a letterboxed one it has to be dense under the
            copy and then clear quickly, or it dims the very subject the
            letterbox exists to show. */}
        <div
          className={
            fit === 'contain'
              ? 'absolute inset-0 z-10 bg-linear-to-t from-scrim via-scrim/85 via-38% to-scrim/5 to-62%'
              : 'absolute inset-0 z-10 bg-linear-to-t from-scrim via-scrim/88 via-48% to-scrim/10'
          }
        />

        <Container className="relative z-20 pb-16 pt-32">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-2 text-caption text-fg-secondary">
                <li>
                  <Link to="/browse" className="transition-colors hover:text-fg">
                    Browse
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to={`/category/${entry.category}`}
                    className="transition-colors hover:text-fg"
                  >
                    {category?.name ?? entry.category}
                  </Link>
                </li>
              </ol>
            </nav>

            <h1 className="max-w-[18ch] text-h1 text-fg">{entry.name}</h1>

            {entry.subcategory ? (
              <p className="mt-4 max-w-[60ch] text-body text-fg-secondary">{entry.subcategory}</p>
            ) : null}

            <ul className="mt-6 flex flex-wrap gap-2">
              {entry.countries.map((country) => (
                <Chip as="li" key={country.name}>
                  {country.name}
                </Chip>
              ))}
              {entry.serviceStart ? <Chip as="li">In service {entry.serviceStart}</Chip> : null}
              {entry.gallery.length > 0 ? (
                <Chip as="li">{entry.gallery.length} images</Chip>
              ) : null}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3 no-print">
              {entry.gallery.length > 0 ? (
                <Button onClick={() => setGalleryIndex(0)}>View gallery</Button>
              ) : null}
              <FavoriteButton slug={entry.slug} name={entry.name} />
              <Button variant="secondary" onClick={copySpecs}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy specs'}
              </Button>
              <Button variant="secondary" onClick={share}>
                <Share2 size={16} /> Share
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </Button>
              <Link
                to={`/compare?add=${entry.slug}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-elevated px-6 text-[0.9375rem] font-medium text-fg transition-colors hover:bg-raised"
              >
                <GitCompareArrows size={16} /> Compare
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Overview ─────────────────────────────────────────── */}
      <Container className="mt-section">
        <Reveal>
          <p className="max-w-[62ch] text-[1.375rem] leading-[1.55] text-fg">
            {entry.description}
          </p>
        </Reveal>
      </Container>

      {/* ── Specifications ───────────────────────────────────── */}
      {entry.specifications.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading overline="Reference" title="Specifications" />
          </Reveal>
          <Reveal className="mt-10">
            <SpecTable groups={entry.specifications} />
          </Reveal>
        </Container>
      ) : null}

      {/* ── Gallery strip ────────────────────────────────────── */}
      {entry.gallery.length > 1 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading overline="Imagery" title="Gallery" />
          </Reveal>
          <RevealGroup
            className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            stagger={0.04}
          >
            {entry.gallery.slice(0, 12).map((image, index) => (
              <RevealItem key={image.url}>
                <button
                  type="button"
                  onClick={() => setGalleryIndex(index)}
                  className="group relative block aspect-4/3 w-full overflow-hidden rounded-(--radius-card) bg-base"
                  aria-label={`Open image ${index + 1} of ${entry.gallery.length}`}
                >
                  <SmartImage
                    src={sizedImage(image.url, 960, image.width)}
                    alt={image.caption ?? ''}
                    fill
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 30vw, 45vw"
                    intrinsicWidth={image.width}
                    className="transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                  />
                </button>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      ) : null}

      {/* ── Prose ────────────────────────────────────────────── */}
      {entry.history ? <Prose title="History" overline="Background" body={entry.history} /> : null}
      {entry.development ? (
        <Prose title="Development" overline="Origins" body={entry.development} />
      ) : null}

      {/* ── Timeline ─────────────────────────────────────────── */}
      {entry.timeline.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading overline="Chronology" title="Timeline" />
          </Reveal>
          <RevealGroup className="mt-10" as="ol">
            {entry.timeline.map((event) => (
              <RevealItem as="li" key={`${event.year}-${event.title}`}>
                <div className="flex gap-6 border-b border-line py-5">
                  <span className="tnum w-16 shrink-0 text-h3 text-fg">{event.year}</span>
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] text-fg">{event.title}</p>
                    {event.detail ? (
                      <p className="mt-1 text-caption text-fg-tertiary">{event.detail}</p>
                    ) : null}
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      ) : null}

      {/* ── Family tree ──────────────────────────────────────── */}
      {family ? <FamilyTree family={family} currentSlug={entry.slug} /> : null}

      {/* ── Relations ────────────────────────────────────────── */}
      <RelationLists entry={entry} />

      {/* ── Related equipment ────────────────────────────────── */}
      {related && related.length > 0 ? (
        <Container className="mt-section">
          <Reveal>
            <SectionHeading overline="See Also" title={`More ${category?.name ?? 'Equipment'}`} />
          </Reveal>
          <RevealGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <RevealItem key={item.id}>
                <Link to={`/equipment/${item.slug}`} className="group block">
                  <div className="aspect-16/10 overflow-hidden rounded-(--radius-card) bg-base">
                    {item.hero ? (
                      <SmartImage
                        src={sizedImage(item.hero, 960, item.heroWidth)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 90vw"
                        intrinsicWidth={item.heroWidth}
                        className="transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <p className="pt-3 text-[0.9375rem] text-fg">{item.name}</p>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </Container>
      ) : null}

      {/* ── Sources ──────────────────────────────────────────── */}
      <Container className="mt-section">
        <Reveal>
          <SectionHeading overline="Attribution" title="Sources" />
          <ul className="mt-8 space-y-4">
            {entry.sources.map((source) => (
              <li key={source.url} className="border-b border-line pb-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[0.9375rem] text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
                >
                  {source.title}
                </a>
                <p className="tnum mt-1 text-caption text-fg-tertiary">
                  {source.license}
                  {source.revisionId ? ` · revision ${source.revisionId}` : ''}
                  {` · retrieved ${new Date(source.retrievedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>

      <AnimatePresence>
        {galleryIndex !== null ? (
          <GalleryViewer
            images={entry.gallery}
            startIndex={galleryIndex}
            title={entry.name}
            onClose={() => setGalleryIndex(null)}
          />
        ) : null}
      </AnimatePresence>
    </article>
  );
}

function Prose({ overline, title, body }: { overline: string; title: string; body: string }) {
  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading overline={overline} title={title} />
        <div className="mt-8 max-w-[68ch] space-y-5">
          {body
            .split('\n')
            .filter((paragraph) => paragraph.trim().length > 0)
            .map((paragraph, index) => (
              <p key={index} className="text-body leading-[1.75] text-fg-secondary">
                {paragraph}
              </p>
            ))}
        </div>
      </Reveal>
    </Container>
  );
}

function RelationLists({ entry }: { entry: Equipment }) {
  const blocks = [
    { title: 'Manufacturers', items: entry.manufacturers.map((m) => m.name) },
    { title: 'Designers', items: entry.designers.map((d) => d.name) },
    { title: 'Operators', items: entry.operators.map((o) => o.name) },
    { title: 'Conflicts', items: entry.conflicts.map((c) => c.name) },
    { title: 'Variants', items: entry.variants.map((v) => v.name) },
  ].filter((block) => block.items.length > 0);

  if (blocks.length === 0) return null;

  return (
    <Container className="mt-section">
      <RevealGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {blocks.map((block) => (
          <RevealItem key={block.title}>
            <div>
              <h3 className="border-b border-line pb-3 text-overline uppercase text-fg-tertiary">
                {block.title}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {block.items.map((item) => (
                  <Chip as="li" key={item}>
                    {item}
                  </Chip>
                ))}
              </ul>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </Container>
  );
}

function buildJsonLd(entry: Equipment): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.name,
    description: entry.description.slice(0, 250),
    image: entry.images.hero?.url,
    dateModified: entry.updatedAt,
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
    about: {
      '@type': 'Product',
      name: entry.name,
      category: entry.category,
      ...(entry.manufacturers[0]
        ? { manufacturer: { '@type': 'Organization', name: entry.manufacturers[0].name } }
        : {}),
    },
    citation: entry.sources.map((source) => source.url),
  };
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-[70vh] w-full rounded-none" />
      <Container className="mt-16 space-y-6">
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-40 w-full" />
      </Container>
    </div>
  );
}

function NotFound({ slug }: { slug: string | undefined }) {
  return (
    <Container className="flex min-h-dvh flex-col justify-center py-32">
      <p className="text-overline uppercase text-fg-tertiary">Not found</p>
      <h1 className="mt-4 text-h1 text-fg">No entry for &ldquo;{slug}&rdquo;</h1>
      <p className="mt-4 max-w-[52ch] text-body text-fg-secondary">
        That page may have moved, or the entry has not been catalogued yet.
      </p>
      <Link
        to="/browse"
        className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-fg px-6 text-[0.9375rem] font-medium text-deep transition-colors hover:bg-white"
      >
        <ArrowLeft size={16} /> Browse all equipment
      </Link>
    </Container>
  );
}
