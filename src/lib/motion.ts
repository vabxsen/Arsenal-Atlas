import type { Transition, Variants } from 'framer-motion';

/**
 * The single motion vocabulary for Arsenal Atlas.
 *
 * Every animated surface imports from here so timing and easing stay
 * globally consistent — the difference between "animated" and "designed".
 *
 * Rules encoded below:
 *   - transform + opacity only (never width/height/top/left)
 *   - exits run ~65% of enter duration, so dismissal feels responsive
 *   - one easing curve, cubic-bezier(0.16, 1, 0.3, 1)
 *   - reduced motion collapses everything to a plain crossfade
 */

/** Matches --ease-out-expo in styles/index.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_EXPO = [0.7, 0, 0.84, 0] as const;

export const DURATION = {
  instant: 0.12,
  fast: 0.24,
  base: 0.4,
  slow: 0.62,
  cinematic: 0.9,
} as const;

export const STAGGER = 0.06;

export const springSoft: Transition = { type: 'spring', stiffness: 90, damping: 20, mass: 0.9 };
export const springSnappy: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 };

const ease = { duration: DURATION.base, ease: EASE_OUT_EXPO } satisfies Transition;
const easeOut = { duration: DURATION.base * 0.65, ease: EASE_IN_EXPO } satisfies Transition;

// ── Core variants ─────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -12, transition: easeOut },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ease },
  exit: { opacity: 0, transition: easeOut },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.98, transition: easeOut },
};

/** Page-level transition used by the router's AnimatePresence. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE_IN_EXPO } },
};

/**
 * Parent for staggered groups. Children must use `fadeUp`/`scaleIn` and
 * inherit — do not set an explicit `transition.delay` on them.
 */
export const staggerParent = (stagger: number = STAGGER, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren } },
  exit: { transition: { staggerChildren: stagger * 0.4, staggerDirection: -1 } },
});

/** Hero copy: slower and more deliberate than body content. */
export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.cinematic, ease: EASE_OUT_EXPO },
  },
};

// ── Reduced motion ────────────────────────────────────────────

/** Opacity-only mirrors. Structure matches the variants above exactly. */
const reduced: Record<string, Variants> = {
  fadeUp: { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } },
  heroReveal: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
};

/**
 * Resolve a variant against the user's motion preference.
 * Call through `useMotionVariants()` rather than using this directly.
 */
export function resolveVariants(variants: Variants, prefersReduced: boolean, key?: string): Variants {
  if (!prefersReduced) return variants;
  if (key && reduced[key]) return reduced[key];
  return reduced.fadeUp as Variants;
}

/** Standard viewport config for scroll-reveal — fires once, slightly early. */
export const revealViewport = { once: true, margin: '-80px 0px -80px 0px' } as const;
