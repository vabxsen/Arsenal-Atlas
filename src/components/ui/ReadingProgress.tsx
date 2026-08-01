import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/**
 * Reading-progress bar for long article pages.
 *
 * Driven by `useScroll` -> `scaleX` so it never touches layout. Presentational
 * only: hidden from the accessibility tree, because a screen reader already
 * reports document position and a second running commentary is noise.
 */
export function ReadingProgress() {
  const prefersReduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();

  // A spring smooths the jitter of fast scroll wheels. Under reduced motion
  // the raw value is used so the bar tracks exactly and never overshoots.
  const smoothed = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left bg-accent-bright no-print"
      style={{ scaleX: prefersReduced ? scrollYProgress : smoothed }}
    />
  );
}
