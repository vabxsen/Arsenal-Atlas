import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Design-system primitives.
 *
 * Every interactive element here meets the 44px minimum target and keeps a
 * visible focus ring — on these surfaces the browser default is effectively
 * invisible, so removing it would strand keyboard users.
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
  primary: 'bg-fg text-deep hover:bg-white',
  secondary: 'border border-line-strong bg-card text-fg hover:bg-elevated hover:border-line-glow',
  ghost: 'text-fg-secondary hover:text-fg hover:bg-card',
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

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)',
        className
      )}
      {...props}
    >
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
        'inline-flex items-center rounded-full border border-line bg-base px-3 py-1',
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
  overline?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div>
        {overline ? (
          <p className="text-overline uppercase text-fg-tertiary">{overline}</p>
        ) : null}
        <h2 className="mt-2 text-h2 text-fg">{title}</h2>
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
