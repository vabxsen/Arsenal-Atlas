/**
 * Class strings for the liquid-glass button.
 *
 * Separate file, no components — `react-refresh/only-export-components` is a
 * warning and `--max-warnings 0` makes it fatal, so a style constant beside a
 * component fails the build. Same split as `styles.ts` and `cardStyles.ts`.
 */

export type LiquidSize = 'sm' | 'lg' | 'xl' | 'xxl';

export const LIQUID_BASE =
  'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 ' +
  'whitespace-nowrap rounded-full text-[0.9375rem] font-medium transition-transform ' +
  'duration-300 ease-(--ease-out-expo) hover:scale-105 active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50';

export const LIQUID_SIZES: Record<LiquidSize, string> = {
  sm: 'h-9 gap-1.5 px-5 text-caption',
  lg: 'h-11 px-7',
  xl: 'h-12 px-9',
  xxl: 'h-14 px-11',
};

/**
 * The bevel. Eight inset shadows, straight from the original — this is the
 * layer doing the actual work, and it renders in every browser.
 *
 * Only the dark set is kept. The original ships a light-mode stack built from
 * black insets, but this button sits on a shader that is black in both themes,
 * so the light variant would never be correct here.
 */
export const LIQUID_GLASS =
  'absolute left-0 top-0 z-0 size-full rounded-full transition-all ' +
  'shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),' +
  'inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),' +
  'inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),' +
  'inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),' +
  'inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),' +
  'inset_0_0_6px_6px_rgba(255,255,255,0.12),' +
  'inset_0_0_2px_2px_rgba(255,255,255,0.06),' +
  '0_0_12px_rgba(0,0,0,0.15)]';
