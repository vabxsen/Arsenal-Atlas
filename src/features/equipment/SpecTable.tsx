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
    <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
      {groups.map((group) => (
        <section key={group.group}>
          {/* No panel, no fill. A specification list is already a strongly
              structured thing — the group name and a rule under it separate it
              from the next one, and a box around that only adds an edge to
              read past. The one hairline per row is the exception the
              --color-line note allows: these rows genuinely abut. */}
          <h3 className="text-h3 text-fg">{group.group}</h3>
          <dl className="mt-4">
            {group.items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-t border-line py-3.5"
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
