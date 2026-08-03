import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Design-system primitives.
 *
 * Every interactive element here meets the 44px minimum target and keeps a
 * visible focus ring — on these surfaces the browser default is effectively
 * invisible, so removing it would strand keyboard users.
 *
 * Used by every page *and* by the admin surface, so a change here propagates
 * everywhere. `Card` in particular is no longer the default container: most
 * content is meant to sit directly on the page with space around it, and a
 * filled surface is reserved for the few places something genuinely needs to
 * be lifted off the background.
 */

// ── Button ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] ' +
  'font-medium transition-all duration-200 ease-(--ease-out-expo) cursor-pointer ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-fg text-deep hover:opacity-90',
  // Filled rather than outlined. An outline on a dark page reads as a wire
  // frame; a low-contrast fill reads as a surface, which is what it is.
  secondary: 'bg-elevated text-fg hover:bg-raised',
  ghost: 'text-fg-secondary hover:text-fg hover:bg-elevated',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
});

export function ButtonLink({
  to,
  variant = 'primary',
  className,
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}

// ── Surface ───────────────────────────────────────────────────

/**
 * A lifted surface. Unbordered by design — see the note on `--color-line`.
 *
 * Reach for this only when something must read as separate from the page
 * (a dialog, a callout, an editor panel). Grids, sections and list rows
 * should sit on the background and be separated by space.
 */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-(--radius-card) bg-card', className)} {...props}>
      {children}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────

export function Chip({
  children,
  className,
  as: Tag = 'span',
}: {
  children: ReactNode;
  className?: string;
  as?: 'span' | 'li';
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center rounded-full bg-elevated px-3 py-1',
        'text-caption text-fg-secondary',
        className
      )}
    >
      {children}
    </Tag>
  );
}

// ── Section heading ───────────────────────────────────────────

export function SectionHeading({
  overline,
  title,
  action,
  className,
}: {
  overline?: string | undefined;
  title: string;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2', className)}>
      <div>
        {overline ? (
          <p className="mb-2 text-overline uppercase text-fg-tertiary">{overline}</p>
        ) : null}
        <h2 className="text-h2 text-fg">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

/**
 * Loading placeholder. Pulses via opacity only so it costs no layout work,
 * and the CSS reduced-motion rule stills it automatically.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-(--radius-card) bg-card', className)}
      aria-hidden="true"
    />
  );
}

// ── Page container ────────────────────────────────────────────

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-(--container-page) px-6', className)}>{children}</div>;
}
