import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { DATA_LABEL } from '@/components/ui/styles';
import { corpusStats } from '@/lib/aggregates';
import { DURATION, EASE_OUT_EXPO } from '@/lib/motion';
import type { ListingEntry } from '@/lib/data';

/**
 * The four figures under the hero copy.
 *
 * Every number is computed from the listing at runtime rather than written
 * down. That is the whole design of this strip: a hero stat is the most
 * tempting place in a product to round upwards, and a figure that cannot be
 * checked against the thing it describes is worth less than no figure. 482
 * entries is a smaller number than most sites would print here and it is the
 * true one, which is the claim the page is actually making.
 *
 * It also cannot go stale — reseed with more entries and the strip follows.
 */
export function HeroStats({ entries }: { entries: ListingEntry[] | undefined }) {
  if (!entries || entries.length === 0) return null;
  const stats = corpusStats(entries);

  return (
    <dl className="flex flex-wrap justify-center gap-x-10 gap-y-6 text-center sm:gap-x-14">
      <Figure value={stats.entries} label="Entries" />
      <Figure value={stats.countries} label="Nations of origin" />
      <Figure value={stats.categories} label="Categories" />
      <Figure value={stats.years} label="Years of service" />
    </dl>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <CountUp to={value} />
        <span className={`${DATA_LABEL} mt-2 block`}>{label}</span>
      </dd>
    </div>
  );
}

/**
 * Counts up once, when scrolled into view.
 *
 * Renders the final value into the DOM immediately and only overwrites it
 * while animating. That ordering matters for two reasons: axe audits the page
 * after a 2.2s settle in a headless browser with no GPU, and the accessible
 * name of a stat that is still counting would otherwise be "0". Under reduced
 * motion the animation never runs at all and the number is simply correct from
 * the first paint.
 */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const [display, setDisplay] = useState(to);

  useEffect(() => {
    if (prefersReduced || !inView) return;
    // No setDisplay(0) before this: `animate` emits its first frame at the
    // start value, so the reset happens inside the animation rather than as a
    // synchronous setState in the effect body (which cascades a render).
    const controls = animate(0, to, {
      duration: DURATION.cinematic,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, prefersReduced, to]);

  return (
    <span ref={ref} className="tnum block text-h1 text-fg">
      {display.toLocaleString('en-US')}
    </span>
  );
}
