import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { DATA_LABEL, PILL_ACTIVE, PILL_BASE, PILL_IDLE } from './styles';

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

// ── Filter pill ───────────────────────────────────────────────

/**
 * The toggle used by every filter row: sort orders, decades, countries.
 *
 * Existed as four byte-identical copies before this. `aria-pressed` rather than
 * a visual-only active state — these are toggle buttons, and without it a
 * screen reader announces four identical unlabelled buttons and no indication
 * of which one is in force.
 */
export function FilterPill({
  active = false,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(PILL_BASE, active ? PILL_ACTIVE : PILL_IDLE, className)}
    >
      {children}
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────

/**
 * What a list shows when it has nothing to show.
 *
 * Was written out three times — Saved, Category, Compare — with three
 * different paddings and two different type scales. The action slot is
 * deliberate: an empty state with no way out is a dead end, and all three
 * originals had one.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-(--radius-card) bg-card px-6 py-16 text-center',
        className
      )}
    >
      {icon ? <div className="mb-5 text-fg-tertiary">{icon}</div> : null}
      <p className="text-h3 text-fg">{title}</p>
      {description ? (
        <p className="mt-2 max-w-[42ch] text-caption text-fg-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────

/**
 * A single figure with its label. The figure leads at display scale and the
 * label sits under it in mono — the reading order of an instrument panel
 * rather than a sentence.
 *
 * `value` is a string, not a number, so the caller owns formatting (thousands
 * separators, a `+` suffix, a year span). Locale formatting belongs at the
 * call site where the meaning is known.
 */
export function Stat({
  value,
  label,
  className,
}: {
  value: ReactNode;
  label: string;
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="tnum text-h1 text-fg">{value}</span>
      <span className={cn(DATA_LABEL, 'text-fg-secondary')}>{label}</span>
    </div>
  );
}

// ── Rule ──────────────────────────────────────────────────────

/**
 * A hairline. Presentational by definition, so it is aria-hidden and never an
 * <hr> — an <hr> is a semantic thematic break and screen readers announce it,
 * which is wrong for a rule that exists to carry the technical language.
 */
export function Rule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('h-px w-full bg-line', className)} />;
}

// ── Section heading ───────────────────────────────────────────

/**
 * `index` sets a mono numeral above the heading — the ledger device that keeps
 * nine homepage sections from reading as nine identical baseline rows.
 */
export function SectionHeading({
  overline,
  title,
  action,
  index,
  className,
}: {
  overline?: string | undefined;
  title: string;
  action?: ReactNode;
  index?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn('flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2', className)}>
      <div>
        {index ? <span className={cn(DATA_LABEL, 'mb-3 block')}>{index}</span> : null}
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
