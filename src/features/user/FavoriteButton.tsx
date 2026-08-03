import { motion, useReducedMotion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import { motionWhen } from '@/lib/motion';
import { useFavorites } from './collections';

/**
 * Bookmark toggle.
 *
 * State is conveyed by icon fill *and* the accessible name, never by colour
 * alone. `aria-pressed` makes it a toggle rather than an action, so screen
 * readers announce the current state instead of just the label.
 */
export function FavoriteButton({
  slug,
  name,
  className,
  variant = 'solid',
}: {
  slug: string;
  name: string;
  className?: string;
  /** `overlay` sits on top of imagery and needs its own backdrop. */
  variant?: 'solid' | 'overlay';
}) {
  const { isFavorite, toggle } = useFavorites();
  const prefersReduced = useReducedMotion() ?? false;
  const active = isFavorite(slug);

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        // Cards wrap the whole tile in a link; without this the toggle
        // navigates instead of saving.
        event.preventDefault();
        event.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from saved` : `Save ${name}`}
      {...motionWhen(!prefersReduced, { whileTap: { scale: 0.88 } })}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-200',
        variant === 'overlay'
          ? 'bg-deep/60 backdrop-blur-md hover:bg-deep/80'
          : 'bg-elevated hover:bg-raised',
        active ? 'text-accent-bright' : 'text-fg-secondary hover:text-fg',
        className
      )}
    >
      <Bookmark size={18} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </motion.button>
  );
}
