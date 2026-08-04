import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { DATA_LABEL } from '@/components/ui/styles';
import { categoryCounts } from '@/lib/aggregates';
import type { ListingEntry } from '@/lib/data';
import { groupedCategories } from '@shared/taxonomy';

/**
 * Section 03 — the taxonomy as a printed ledger.
 *
 * Nine groups as full-width hairline-separated rows: a mono index numeral, the
 * group name, and its categories flowing as inline links with real counts.
 *
 * Deliberately the only section on the page with no photography. A run of
 * image sections needs somewhere for the eye to rest, and the taxonomy is the
 * one piece of content here that is genuinely a list rather than a collection
 * of objects — setting it as a table of contents says so.
 *
 * The counts are real, from `categoryCounts`. Previously this rendered 44
 * category names with no indication that one holds 26 entries and another 8.
 */
export function CategoryIndex({ entries }: { entries: ListingEntry[] }) {
  const counts = categoryCounts(entries);
  const groups = groupedCategories();

  return (
    <div className="relative mt-section">
      <div
        aria-hidden="true"
        className="field-grid pointer-events-none absolute inset-x-0 top-0 h-[30rem]"
      />

      <Container className="relative">
        <Reveal>
          <SectionHeading index="02" overline="By Type" title="The Complete Index" />
        </Reveal>

        <Reveal className="mt-10">
          <dl className="border-t border-line">
            {groups.map(({ group, categories }, index) => (
              <div
                key={group}
                className="grid gap-x-8 gap-y-3 border-b border-line py-7 md:grid-cols-[3rem_14rem_1fr]"
              >
                <dt className={`${DATA_LABEL} md:pt-1.5`}>
                  {String(index + 1).padStart(2, '0')}
                </dt>
                <dd className="text-h3 text-fg md:col-start-2">{group}</dd>
                <dd className="md:col-start-3">
                  {/* Flowed inline rather than stacked: nine stacked lists is
                      nine columns of ragged text, where a paragraph of links
                      reads as one object and packs four times as densely. */}
                  <p className="text-caption leading-[2.1] text-fg-tertiary">
                    {categories.map((category, i) => (
                      <span key={category.slug}>
                        {i > 0 ? <span aria-hidden="true"> · </span> : null}
                        <Link
                          to={`/category/${category.slug}`}
                          className="text-fg-secondary transition-colors duration-200 hover:text-fg"
                        >
                          {category.name}
                        </Link>
                        <span className="tnum ml-1.5 text-fg-tertiary">
                          {counts.get(category.slug) ?? 0}
                        </span>
                      </span>
                    ))}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </div>
  );
}
