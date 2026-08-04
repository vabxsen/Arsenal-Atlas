import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container } from '@/components/ui/primitives';
import { DATA_LABEL, DATA_VALUE } from '@/components/ui/styles';
import type { ListingEntry } from '@/lib/data';
import { sizedImage, wikimediaSrcSet } from '@shared/images';

/**
 * Section 09 — one editorial plate, closing the page.
 *
 * `randomDaily` used to fill four tiles here, which made the last thing on the
 * homepage a fourth identical grid. One wide plate at 21:9 closes on a single
 * object instead, and it is the only place on the page that shows a line of
 * the description — the rest of the page is captions, so prose here reads as
 * an ending rather than as more of the same.
 *
 * The date is printed because the selection is deterministic per day: saying
 * so turns "some random entry" into something worth returning for.
 */
/**
 * Ends the blurb somewhere a human would.
 *
 * `listing.json` slices descriptions at 180 characters to keep the payload
 * down, which lands mid-word — the AN/PVS-7 arrives ending "Most newer PVS-".
 * That is invisible everywhere else on the site because no other surface shows
 * the description, and unmissable here, where it is the only prose on the
 * page. Prefer the last complete sentence; fall back to the last whole word.
 */
function excerpt(description: string): string {
  const sentenceEnd = description.lastIndexOf('. ');
  if (sentenceEnd > 80) return description.slice(0, sentenceEnd + 1);

  const wordEnd = description.lastIndexOf(' ');
  return wordEnd > 80 ? `${description.slice(0, wordEnd).replace(/[,;:-]$/, '')}…` : description;
}

export function DailyDispatch({ entry }: { entry: ListingEntry | undefined }) {
  if (!entry) return null;

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Container className="mt-section">
      <Reveal>
        {/* An <article> with its own <h2>: this is a section of one item, so
            the entry name IS the heading here rather than an h3 beneath one.
            The corner ticks mark it as a plate. */}
        <article className="on-dark corner-ticks group relative isolate overflow-hidden rounded-(--radius-card) p-px">
          <Link to={`/equipment/${entry.slug}`} className="block">
            <div className="relative aspect-4/5 overflow-hidden rounded-(--radius-card) bg-base sm:aspect-21/9">
              {entry.hero ? (
                <img
                  src={sizedImage(entry.hero, 1920, entry.heroWidth)}
                  srcSet={wikimediaSrcSet(entry.hero, entry.heroWidth)}
                  sizes="(min-width: 1024px) 78rem, 96vw"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-[1.03]"
                />
              ) : null}

              {/*
                Heavier than the eye alone would ask for. This card carries the
                only body prose on the page over a photograph, and
                verify:contrast measured the blurb at 4.36:1 against the 4.5
                floor once it learned to scroll this far. Body text on an image
                needs a scrim built for the worst pixel in the frame, not the
                average one.
              */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-scrim via-scrim/88 via-52% to-scrim/25"
              />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
                <p className={`${DATA_LABEL} text-fg-secondary`}>Dispatch · {today}</p>

                <h2 className="mt-4 max-w-[20ch] text-h1 text-fg">{entry.name}</h2>

                <p className="mt-4 max-w-[62ch] text-body text-fg-secondary">
                  {excerpt(entry.description)}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[entry.role, entry.countries[0]?.name, entry.manufacturer, entry.spec?.value]
                    .filter(Boolean)
                    .map((fact) => (
                      <span key={fact} className={DATA_VALUE}>
                        {fact}
                      </span>
                    ))}
                </div>

                <span className="mt-7 inline-flex items-center gap-2 text-caption text-fg transition-colors">
                  Read the entry
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform duration-300 ease-(--ease-out-expo) group-hover:translate-x-1"
                  />
                </span>
              </div>
            </div>
          </Link>
        </article>
      </Reveal>
    </Container>
  );
}
