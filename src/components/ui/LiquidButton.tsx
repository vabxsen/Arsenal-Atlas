import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { LIQUID_BASE, LIQUID_GLASS, LIQUID_SIZES, type LiquidSize } from './liquidStyles';

/**
 * Glass button, adapted from the 21st.dev component.
 *
 * The original leans on `class-variance-authority` for a six-variant table and
 * `@radix-ui/react-slot` for `asChild`. Neither is installed here and neither
 * earns its place for this: the variant table is unused at the one call site,
 * and `asChild` exists to let a button render as a link — which this file does
 * directly with `LiquidButtonLink`, since react-router needs a real `<Link>`
 * rather than a cloned child anyway. Same visual, two fewer dependencies.
 *
 * The glass itself is two stacked layers over the content:
 *   - a shadow stack of eight inset shadows, which is what actually reads as a
 *     bevelled edge, and works everywhere;
 *   - a `backdrop-filter: url(#container-glass)` displacement pass, which is
 *     the refraction. Only Chromium honours an SVG-referenced backdrop-filter;
 *     Safari and Firefox drop it and keep the shadows, so the button degrades
 *     to a flat glass pill rather than to nothing.
 */
export function LiquidButton({
  size = 'xl',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: LiquidSize; children: ReactNode }) {
  return (
    <button className={cn(LIQUID_BASE, LIQUID_SIZES[size], className)} {...props}>
      <GlassLayers />
      <span className="pointer-events-none z-10">{children}</span>
    </button>
  );
}

/** The same surface as a router link. */
export function LiquidButtonLink({
  to,
  size = 'xl',
  className,
  children,
}: {
  to: string;
  size?: LiquidSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn(LIQUID_BASE, LIQUID_SIZES[size], className)}>
      <GlassLayers />
      <span className="pointer-events-none z-10">{children}</span>
    </Link>
  );
}

function GlassLayers() {
  return (
    <>
      <span aria-hidden="true" className={LIQUID_GLASS} />
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 isolate -z-10 size-full overflow-hidden rounded-full"
        style={{ backdropFilter: 'url("#container-glass")' }}
      />
      <GlassFilter />
    </>
  );
}

/**
 * The displacement filter the backdrop references.
 *
 * Rendered inside the button rather than once at the app root, so the button
 * is self-contained — but note that duplicate `id="container-glass"` nodes
 * would collide, which is why there is exactly one call site. If this ever
 * appears twice on a page, hoist this into the app shell.
 */
function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves={1}
            seed={1}
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale={70}
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
