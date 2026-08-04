/**
 * Geometry for the five card variants.
 *
 * Separate from EquipmentCard.tsx because `react-refresh/only-export-components`
 * is fatal under `--max-warnings 0`: a lookup table exported beside a component
 * fails the build. Same split as lib/motion.ts against Reveal.tsx.
 *
 * The variants exist to break the uniform grid. Four homepage sections used to
 * render the identical four-column tile, which is the single loudest reason
 * the page read as a template — the eye learns the shape once and then stops
 * reading. Mixed aspect ratios and mixed densities are the cure.
 */

export type CardVariant =
  /** The workhorse tile: 16:10 photograph, caption beneath. Grids and rails. */
  | 'default'
  /** The lead of an editorial block: 3:2, title set over the image. */
  | 'feature'
  /** Square thumb, tight metadata. Horizontal carousels. */
  | 'compact'
  /** Landscape thumb beside stacked text. Sidebars beside a feature. */
  | 'row'
  /** One wide plate, 21:9, with room for prose. The daily dispatch. */
  | 'editorial';

/**
 * The image box. `fill` images need this on the *parent*, which is what
 * reserves layout before the photograph decodes — the whole CLS story.
 */
export const CARD_ASPECT: Record<CardVariant, string> = {
  default: 'aspect-16/10',
  feature: 'aspect-3/2',
  compact: 'aspect-square',
  row: 'aspect-4/3',
  editorial: 'aspect-21/9',
};

/**
 * Responsive `sizes`. Wrong values here cost real bytes: Commons only serves
 * the 330/500/960/1280/1920 ladder, so an over-large hint jumps a whole bucket.
 */
export const CARD_SIZES: Record<CardVariant, string> = {
  default: '(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 90vw',
  feature: '(min-width: 1024px) 46rem, 92vw',
  compact: '(min-width: 640px) 15rem, 45vw',
  row: '(min-width: 1024px) 12rem, 30vw',
  editorial: '(min-width: 1024px) 72rem, 96vw',
};

/**
 * Layout of the article wrapper. `row` is the only one that is not a stack.
 */
export const CARD_FRAME: Record<CardVariant, string> = {
  default: 'group relative',
  feature: 'group relative',
  compact: 'group relative',
  row: 'group relative',
  editorial: 'group relative',
};

/**
 * Where the caption sits relative to the picture.
 *
 * `feature` and `editorial` set their type *over* the photograph, so they carry
 * `.on-dark` and a scrim at the call site — text on an image must stay light in
 * both themes, and its contrast is measured by verify:contrast rather than
 * assumed.
 */
export const CARD_CAPTION: Record<CardVariant, string> = {
  // A floor, not a height. Names run one or two lines and metadata one or two,
  // so without it a row of cards sits on a ragged baseline. Reserved up front,
  // so it is alignment rather than a shift.
  default: 'pt-4 min-h-[4.75rem]',
  feature: 'absolute inset-x-0 bottom-0 p-6 sm:p-8',
  compact: 'pt-3',
  row: 'min-w-0 flex-1',
  editorial: 'absolute inset-x-0 bottom-0 p-6 sm:p-10',
};

/** Title scale per variant. */
export const CARD_TITLE: Record<CardVariant, string> = {
  default: 'text-h3',
  feature: 'text-h2',
  compact: 'text-[0.9375rem] font-medium leading-snug',
  row: 'text-[0.9375rem] font-medium leading-snug',
  editorial: 'text-h2',
};
