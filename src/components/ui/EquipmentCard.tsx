import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { sizedImage } from '@shared/images';
import { getCategory } from '@shared/taxonomy';
import type { ListingEntry } from '@/lib/data';
import { FavoriteButton } from '@/features/user/FavoriteButton';
import { SmartImage } from './Image';

/**
 * The workhorse card used by every rail and grid.
 *
 * The lift-on-hover is a transform so it never triggers layout, and the image
 * zoom lives on a child so the card's own border stays crisp. Both are gated
 * on reduced-motion.
 */
export function EquipmentCard({
  entry,
  className,
  priority = false,
  sizes = '(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw',
  headingLevel = 3,
}: {
  entry: ListingEntry;
  className?: string;
  priority?: boolean;
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

  return (
    <motion.article
      className={cn('group relative', className)}
      whileHover={prefersReduced ? undefined : { y: -6 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/equipment/${entry.slug}`}
        className="block overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card) transition-colors duration-300 group-hover:border-line-strong"
      >
        <div className="relative aspect-16/10 overflow-hidden bg-base">
          {entry.hero ? (
            <SmartImage
              src={sizedImage(entry.hero, 960, entry.heroWidth)}
              alt={entry.name}
              fill
              priority={priority}
              sizes={sizes}
              intrinsicWidth={entry.heroWidth}
              // Cropped, not letterboxed — unlike the hero. Tried the
              // aspect-aware fit here and it was worse: at card size a 3:1
              // rifle becomes a thin band adrift in dead space and a portrait
              // shot becomes a narrow strip, so a grid of mixed ratios reads
              // ragged. A filled, uniform rectangle is what makes a grid scan.
              className={cn(
                'transition-transform duration-700 ease-(--ease-out-expo)',
                !prefersReduced && 'group-hover:scale-105'
              )}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-fg-tertiary">
              <span className="text-caption">No image</span>
            </div>
          )}
          {/* A short scrim at the foot of the image, so the card's border and
              the photograph meet softly rather than as a hard seam. */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-card/80 to-transparent" />

          {/* Revealed on hover, but always present for keyboard users —
              focus-within keeps it visible while tabbed to. */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <FavoriteButton slug={entry.slug} name={entry.name} variant="overlay" />
          </div>
        </div>

        <div className="p-5">
          <p className="text-overline uppercase text-fg-tertiary">
            {category?.name ?? entry.category}
          </p>
          <Heading className="mt-2 text-h3 text-fg">{entry.name}</Heading>
          <p className="mt-2 line-clamp-2 text-caption text-fg-secondary">{entry.description}</p>

          {(country ?? entry.serviceStart) ? (
            <p className="tnum mt-3 text-caption text-fg-tertiary">
              {country}
              {country && entry.serviceStart ? ' · ' : ''}
              {entry.serviceStart}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.article>
  );
}
