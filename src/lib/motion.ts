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

/*
 * Halved. At 0.06 a twelve-tile grid took three quarters of a second to finish
 * arriving, and the eye tracked the sweep instead of the content — the tell of
 * a page that animates because it can. Content should settle, not perform.
 */
export const STAGGER = 0.03;

export const springSoft: Transition = { type: 'spring', stiffness: 90, damping: 20, mass: 0.9 };
export const springSnappy: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 };

const ease = { duration: DURATION.base, ease: EASE_OUT_EXPO } satisfies Transition;
const easeOut = { duration: DURATION.base * 0.65, ease: EASE_IN_EXPO } satisfies Transition;

// ── Core variants ─────────────────────────────────────────────

export const fadeUp: Variants = {
  /* 24px of travel read as a slide; 10 reads as a settle. */
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: ease },
  exit: { opacity: 0, y: -6, transition: easeOut },
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
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: DURATION.cinematic, ease: EASE_OUT_EXPO },
  },
};

/**
 * A rule drawing itself in — the timeline scale, a section divider.
 *
 * Requires `transform-origin` on the element, and it must be set in
 * `className` rather than as a motion prop: under reduced motion this variant
 * is swapped for an opacity-only mirror that never touches transform, and an
 * origin passed through `style` would then be describing an axis nothing uses.
 */
export const drawIn: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: DURATION.cinematic, ease: EASE_OUT_EXPO },
  },
};

/**
 * Wipes content in behind a moving edge instead of fading it.
 *
 * `clip-path` is composited and never triggers layout, so this is safe on
 * headings and images alike — but it does create a stacking context, so it
 * cannot wrap something that needs to escape its bounds (a dropdown, a
 * sticky child).
 */
export const revealMask: Variants = {
  hidden: { clipPath: 'inset(0 100% 0 0)' },
  visible: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * The house hover transition.
 *
 * Six components wrote their transition out by hand, between them using five
 * different durations — 0.2, 0.3, 0.32, 0.35, 0.4 — against a scale that
 * offers `fast` 0.24 and `base` 0.4. Each looked deliberate on its own, which
 * is exactly why the drift survived review: nobody compares a dropdown in one
 * file against a lightbox in another.
 *
 * Two speeds now. Hover and layout feedback run at `base`; anything that
 * opens over the page — popover, dialog, lightbox — runs at `fast`, because a
 * surface the user just asked for should already be there.
 */
export const TRANSITION_HOVER: Transition = { duration: DURATION.base, ease: EASE_OUT_EXPO };

// ── Reduced motion ────────────────────────────────────────────

/**
 * Opacity-only mirrors. Structure matches the variants above exactly.
 *
 * Every variant exported from this file needs an entry here, or
 * `resolveVariants` silently falls through to `fadeUp` — which for something
 * like `drawIn` means a rule that was meant to draw itself in instead pops to
 * full width while fading, i.e. the exact motion the preference asked to avoid.
 */
const reduced: Record<string, Variants> = {
  fadeUp: { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } },
  heroReveal: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  drawIn: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  revealMask: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
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

/**
 * Motion props that should disappear entirely when they do not apply.
 *
 * `whileHover={reduced ? undefined : {...}}` looks equivalent to omitting the
 * prop and is not: `exactOptionalPropertyTypes` distinguishes a property that
 * is absent from one that is present and undefined, and Framer Motion's props
 * are declared optional in the first sense. Spreading the result of this
 * helper omits the key, which is both what the types require and what was
 * always meant.
 *
 *   <motion.div {...motionWhen(!prefersReduced, { whileHover: { y: -6 } })} />
 */
export function motionWhen<T extends object>(enabled: boolean, props: T): T | Record<string, never> {
  return enabled ? props : {};
}
