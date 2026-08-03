import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';
import {
  fadeUp,
  motionWhen,
  resolveVariants,
  revealViewport,
  staggerParent,
  STAGGER,
} from '@/lib/motion';

interface RevealProps {
  children: ReactNode;
  /** Rendered element. Use a semantic tag — `section`, `li`, `article`. */
  as?: ElementType;
  className?: string;
  variants?: Variants;
  /** Key into the reduced-motion mirror table. */
  variantKey?: string;
  delay?: number;
}

/**
 * Scroll-triggered reveal. Fires once, slightly before the element enters
 * view, and degrades to a plain fade under `prefers-reduced-motion`.
 */
export function Reveal({
  children,
  as = 'div',
  className,
  variants = fadeUp,
  variantKey = 'fadeUp',
  delay = 0,
}: RevealProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      variants={resolveVariants(variants, prefersReduced, variantKey)}
      {...motionWhen(Boolean(delay), { transition: { delay } })}
    >
      {children}
    </MotionTag>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}

/**
 * Staggered container. Direct children should be `<RevealItem>` so they
 * inherit the cascade rather than each scheduling their own delay.
 */
export function RevealGroup({
  children,
  as = 'div',
  className,
  stagger = STAGGER,
  delayChildren = 0,
}: RevealGroupProps) {
  const prefersReduced = useReducedMotion() ?? false;
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      // Collapsing the stagger to 0 keeps the parent/child contract intact
      // while removing the sequential motion reduced-motion users opted out of.
      variants={staggerParent(prefersReduced ? 0 : stagger, delayChildren)}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  as = 'div',
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  const prefersReduced = useReducedMotion() ?? false;
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag className={className} variants={resolveVariants(fadeUp, prefersReduced, 'fadeUp')}>
      {children}
    </MotionTag>
  );
}
