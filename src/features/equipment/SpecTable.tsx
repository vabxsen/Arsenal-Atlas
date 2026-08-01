import type { SpecGroup } from '@shared/schema';

/**
 * Grouped specification tables.
 *
 * Rendered as a definition list rather than a <table>: the data is
 * label/value pairs, not a grid, and <dl> gives screen readers the correct
 * term/description relationship without fabricating column headers.
 */
export function SpecTable({ groups }: { groups: SpecGroup[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.group}
          className="rounded-(--radius-card) border border-line bg-card p-6"
        >
          <h3 className="text-overline uppercase text-fg-tertiary">{group.group}</h3>
          <dl className="mt-5">
            {group.items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-line py-3 first:border-t-0 first:pt-0"
              >
                <dt className="text-caption text-fg-tertiary">{item.label}</dt>
                {/* Tabular figures keep decimal points aligned down the column. */}
                <dd className="tnum text-right text-[0.9375rem] text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
