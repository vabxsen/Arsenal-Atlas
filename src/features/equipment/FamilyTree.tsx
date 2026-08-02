import { Link } from 'react-router-dom';
import { Reveal } from '@/components/motion/Reveal';
import { Container, SectionHeading } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import type { Family, FamilyNode } from '@shared/schema';

/**
 * Evolution tree for an equipment family (AK-47 → AKM → AK-74 → AK-12).
 *
 * Rendered from the flat parent/child edge list into depth-ordered rows. A
 * true graph layout is overkill here: these lineages are shallow and mostly
 * linear, and rows read more clearly than a node graph at mobile widths.
 */
export function FamilyTree({ family, currentSlug }: { family: Family; currentSlug: string }) {
  const byParent = new Map<string | null, FamilyNode[]>();
  for (const node of family.nodes) {
    const siblings = byParent.get(node.parent);
    if (siblings) siblings.push(node);
    else byParent.set(node.parent, [node]);
  }

  // Breadth-first walk so each generation lands on its own row.
  const generations: FamilyNode[][] = [];
  let current = byParent.get(null) ?? [];
  const guard = family.nodes.length + 1;

  for (let depth = 0; current.length > 0 && depth < guard; depth++) {
    generations.push(current);
    current = current.flatMap((node) => byParent.get(node.slug) ?? []);
  }

  if (generations.length === 0) return null;

  return (
    <Container className="mt-section">
      <Reveal>
        <SectionHeading overline="Lineage" title={family.name} />
        <p className="mt-4 max-w-[62ch] text-body text-fg-secondary">{family.description}</p>
      </Reveal>

      <Reveal className="mt-10">
        <ol className="space-y-3">
          {generations.map((generation, depth) => (
            <li key={depth}>
              <ul className="flex flex-wrap items-center gap-3">
                {generation.map((node) => {
                  const isCurrent = node.slug === currentSlug;
                  return (
                    <li key={node.slug} style={{ marginLeft: `${depth * 0.75}rem` }}>
                      <Link
                        to={`/equipment/${node.slug}`}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={cn(
                          'inline-flex min-h-11 items-center gap-3 rounded-full border px-5 transition-all duration-300 ease-(--ease-out-expo)',
                          isCurrent
                            ? 'border-line-glow bg-elevated text-fg'
                            : 'border-line bg-card text-fg-secondary hover:border-line-strong hover:text-fg'
                        )}
                      >
                        <span className="text-[0.9375rem]">{node.name}</span>
                        {node.year ? (
                          <span className="tnum text-caption text-fg-tertiary">{node.year}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {depth < generations.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="ml-6 block h-4 w-px bg-line-strong"
                  style={{ marginLeft: `${depth * 0.75 + 1.5}rem` }}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Reveal>
    </Container>
  );
}
