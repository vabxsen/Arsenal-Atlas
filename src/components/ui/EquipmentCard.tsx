import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { motionWhen, TRANSITION_HOVER } from '@/lib/motion';
import { sizedImage } from '@shared/images';
import { getCategory } from '@shared/taxonomy';
import type { ListingEntry } from '@/lib/data';
import { FavoriteButton } from '@/features/user/FavoriteButton';
import { SmartImage } from './Image';
import { CARD_ASPECT, CARD_CAPTION, CARD_SIZES, CARD_TITLE, type CardVariant } from './cardStyles';
import { DATA_VALUE } from './styles';

/**
 * The tile used by every rail and grid.
 *
 * Image-first: a photograph with its label set beneath, on the page
 * background. No panel, no outline — the picture is the object and the type is
 * a caption for it, which is why a grid of these reads as a gallery rather
 * than a table of boxes.
 *
 * Five variants, because four homepage sections rendering the identical
 * four-column tile is the single loudest reason the page read as a template:
 * the eye learns the shape once and then stops reading.
 *
 * Metadata degrades by omission. `role`, `manufacturer` and `spec` are present
 * on 345, 354 and 369 of 482 entries respectively, and a card missing one
 * renders one fewer line — never a dash, never an empty badge. That is why the
 * lines are assembled by filtering arrays rather than by conditional JSX per
 * field: the alternative accumulates separators with nothing between them.
 */
export function EquipmentCard({
  entry,
  className,
  priority = false,
  variant = 'default',
  sizes,
  headingLevel = 3,
}: {
  entry: ListingEntry;
  className?: string;
  priority?: boolean;
  variant?: CardVariant;
  sizes?: string;
  /**
   * Depends on the surrounding outline, not on the card. Homepage rails
   * supply their own <h2>, so cards nest at 3; a category grid sits directly
   * under the page <h1>, so cards must be 2 or the heading order skips a level.
   */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const prefersReduced = useReducedMotion() ?? false;
  const category = getCategory(entry.category);
  const country = entry.countries[0]?.name;

  const overImage = variant === 'feature' || variant === 'editorial';
  const isRow = variant === 'row';

  /*
   * Line one is provenance: what it is, where it came from, when. `role` wins
   * over the category when present — "Bullpup assault rifle" says more than
   * "Assault Rifles", and the category is usually how the visitor arrived.
   *
   * Line two is technical, and it is the one that most often has nothing in
   * it, so the whole line is gated on the array rather than each part.
   */
  const provenance = [entry.role ?? category?.name ?? entry.category, country].filter(Boolean);
  if (entry.serviceStart) provenance.push(String(entry.serviceStart));

  const hasTechnical = Boolean(entry.manufacturer ?? entry.spec);

  const image = entry.hero ? (
    <SmartImage
      src={sizedImage(entry.hero, variant === 'compact' || isRow ? 500 : 960, entry.heroWidth)}
      alt={entry.name}
      fill
      priority={priority}
      sizes={sizes ?? CARD_SIZES[variant]}
      intrinsicWidth={entry.heroWidth}
      // Cropped, not letterboxed — unlike the hero. Tried the aspect-aware fit
      // here and it was worse: at card size a 3:1 rifle becomes a thin band
      // adrift in dead space and a portrait shot a narrow strip, so a grid of
      // mixed ratios reads ragged. A filled rectangle is what makes a grid scan.
      className={cn(
        'transition-transform duration-700 ease-(--ease-out-expo)',
        !prefersReduced && 'group-hover:scale-105'
      )}
    />
  ) : (
    <div className="absolute inset-0 grid place-items-center text-fg-tertiary">
      <span className="text-caption">No image</span>
    </div>
  );

  const caption = (
    <div className={CARD_CAPTION[variant]}>
      <Heading className={cn(CARD_TITLE[variant], 'text-fg')}>{entry.name}</Heading>

      {provenance.length > 0 ? (
        <p className={cn('tnum mt-1.5 text-caption', overImage ? 'text-fg' : 'text-fg-tertiary')}>
          {provenance.join(' · ')}
        </p>
      ) : null}

      {hasTechnical ? (
        <p className={cn(DATA_VALUE, 'mt-2.5', overImage && 'text-fg-secondary')}>
          {entry.manufacturer}
          {entry.manufacturer && entry.spec ? <span aria-hidden="true"> · </span> : null}
          {entry.spec ? (
            <span>
              {/* "64 t" is ambiguous with no column header above it. The label
                  is announced but not printed: the visual line has the
                  photograph for context, a screen reader has nothing. */}
              <span className="sr-only">{entry.spec.label}: </span>
              {entry.spec.value}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  return (
    <motion.article
      className={cn('group relative', isRow && 'flex', className)}
      {...motionWhen(!prefersReduced, { whileHover: { y: variant === 'compact' ? -3 : -6 } })}
      transition={TRANSITION_HOVER}
    >
      <Link
        to={`/equipment/${entry.slug}`}
        className={cn(isRow ? 'flex flex-1 items-center gap-4' : 'block')}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-(--radius-card) bg-base',
            CARD_ASPECT[variant],
            isRow && 'w-28 shrink-0 sm:w-32',
            // A hairline that resolves on hover, rather than a glow ring. A
            // ring on a dark page is the gaming register; an edge that firms up
            // is how a printed plate behaves.
            'ring-1 ring-line transition-shadow duration-300 group-hover:ring-line-strong',
            overImage && 'on-dark',
            // Only the variants that read as a filled surface take a shadow.
            // Under a bare photograph on a near-black page a drop shadow has
            // nothing to fall on and only muddies the edge.
            overImage && 'shadow-(--shadow-card) group-hover:shadow-(--shadow-lift)'
          )}
        >
          {image}

          {overImage ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-scrim via-scrim/55 via-45% to-transparent"
            />
          ) : null}

          {overImage ? caption : null}

          {/* Revealed on hover, but always present for keyboard users —
              focus-within keeps it visible while tabbed to. */}
          {!isRow ? (
            <div className="absolute right-2.5 top-2.5 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              <FavoriteButton slug={entry.slug} name={entry.name} variant="overlay" />
            </div>
          ) : null}
        </div>

        {overImage ? null : caption}
      </Link>
    </motion.article>
  );
}
