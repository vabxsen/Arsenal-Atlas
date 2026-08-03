import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { motionWhen } from '@/lib/motion';
import { sizedImage } from '@shared/images';
import { getCategory } from '@shared/taxonomy';
import type { ListingEntry } from '@/lib/data';
import { FavoriteButton } from '@/features/user/FavoriteButton';
import { SmartImage } from './Image';

/**
 * The workhorse tile used by every rail and grid.
 *
 * Image-first: a rounded photograph with its label set beneath, on the page
 * background. No panel, no outline, no shadow — the picture is the object and
 * the type is a caption for it, which is why a grid of these reads as a
 * gallery rather than as a table of boxes.
 *
 * The image zoom is a transform on a child so it never triggers layout, and it
 * is gated on reduced-motion.
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
      {...motionWhen(!prefersReduced, { whileHover: { y: -4 } })}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/equipment/${entry.slug}`} className="block">
        <div className="relative aspect-16/10 overflow-hidden rounded-(--radius-card) bg-base">
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
          {/* Revealed on hover, but always present for keyboard users —
              focus-within keeps it visible while tabbed to. */}
          <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <FavoriteButton slug={entry.slug} name={entry.name} variant="overlay" />
          </div>
        </div>

        {/* Caption block: name, then one quiet line of provenance. The
            description was dropped — at three lines per tile across a
            twelve-tile grid it turned a gallery into a wall of prose, and it
            is the first thing on the detail page anyway. */}
        <div className="pt-4">
          <Heading className="text-h3 text-fg">{entry.name}</Heading>
          <p className="tnum mt-1 text-caption text-fg-tertiary">
            {category?.name ?? entry.category}
            {country ? ` · ${country}` : ''}
            {entry.serviceStart ? ` · ${entry.serviceStart}` : ''}
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
