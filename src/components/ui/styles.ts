/**
 * Shared class strings for the design system.
 *
 * This file exports no components, and that is a hard constraint rather than a
 * preference: `react-refresh/only-export-components` is configured as a warning
 * and `eslint --max-warnings 0` makes every warning fatal, so a style constant
 * living beside a component fails the build. Same reason `lib/motion.ts` is
 * separate from `components/motion/Reveal.tsx`.
 *
 * Everything here was duplicated in the wild before it was collected. The pill
 * in particular existed as four byte-identical copies (CategoryPage's sort row,
 * both of TimelinePage's decade rows, CountriesPage's country list), which is
 * how the same control ends up drifting into four slightly different controls.
 */

/**
 * The toggle pill: sort orders, decade filters, country selectors.
 *
 * min-h-11 is the 44px target floor and is not negotiable — these are the
 * densest interactive rows in the product and the easiest place to fall under
 * it by eyeballing padding.
 */
export const PILL_BASE =
  'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-caption ' +
  'transition-colors duration-200 ease-(--ease-out-expo) cursor-pointer';

/** Selected. Carries a visible fill so the state survives a greyscale print. */
export const PILL_ACTIVE = 'border-line-glow bg-elevated text-fg';

export const PILL_IDLE = 'border-line text-fg-secondary hover:border-line-strong hover:text-fg';

/**
 * Floating surface for popovers and menus.
 *
 * `bg-elevated` rather than `bg-card`: a menu opens *over* cards, and at
 * --color-card it disappears into whatever it is covering.
 */
export const SURFACE_MENU =
  'rounded-(--radius-sheet) bg-elevated shadow-(--shadow-sheet) ring-1 ring-line';

/**
 * Monospace metadata. Pairs with `tnum`; see --text-data.
 *
 * DATA_LABEL is for things that are genuinely labels — section numerals, stat
 * captions, column heads — and uppercases them.
 *
 * DATA_VALUE is for anything containing a measurement, and deliberately does
 * NOT uppercase, because unit case is semantic: `54 t` is tonnes and `54 T` is
 * tesla, `km` is not `KM`, and a design that shouts its units is quietly
 * misreporting them. It also keeps proper nouns readable — "Krauss-Maffei
 * Wegmann" rather than "KRAUSS-MAFFEI WEGMANN".
 */
export const DATA_LABEL = 'tnum font-mono text-data uppercase text-fg-tertiary';

export const DATA_VALUE = 'tnum font-mono text-data text-fg-tertiary';
