import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import { cn } from '@/lib/cn';
import { resolveCountry } from '@shared/countries';

/**
 * Interactive world map.
 *
 * Rendered directly from d3-geo + topojson rather than a React map library:
 * `react-simple-maps` peer-depends on React <=18 and is unmaintained, and
 * drawing the paths ourselves gives full control over the styling and
 * transitions the design calls for.
 *
 * Country shading is a quantised choropleth — five steps rather than a
 * continuous ramp, so adjacent values stay visually distinguishable.
 */

const WIDTH = 960;
const HEIGHT = 500;

interface TopoJson {
  type: 'Topology';
  objects: { countries: unknown };
  arcs: unknown;
  transform?: unknown;
}

export function WorldMap({
  topology,
  counts,
  selected,
  onSelect,
}: {
  topology: TopoJson;
  counts: Map<string, number>;
  selected: string | null;
  onSelect: (iso3: string | null, name: string) => void;
}) {
  const { paths, max } = useMemo(() => {
    const collection = feature(
      topology as never,
      topology.objects.countries as never
    ) as unknown as FeatureCollection<Geometry, { name?: string }>;

    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], collection);
    const pathGen = geoPath(projection);

    const built = collection.features.map((f, index) => {
      const name = f.properties?.name ?? '';
      // Natural Earth uses its own country names, so resolve them through the
      // same alias table the seed pipeline uses rather than an ISO-numeric map.
      const resolved = resolveCountry(name);
      const iso3 = resolved?.iso3;
      return {
        key: `${iso3 ?? 'x'}-${index}`,
        d: pathGen(f) ?? '',
        name,
        iso3,
        count: iso3 ? (counts.get(iso3) ?? 0) : 0,
      };
    });

    return { paths: built, max: Math.max(1, ...built.map((p) => p.count)) };
  }, [topology, counts]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label="World map of equipment origin countries. Use the list below for a keyboard-accessible equivalent."
    >
      <g>
        {paths.map((path) => {
          const intensity = path.count === 0 ? 0 : Math.ceil((path.count / max) * 5);
          const isSelected = Boolean(path.iso3) && path.iso3 === selected;

          return (
            <path
              key={path.key}
              d={path.d}
              className={cn(
                'transition-all duration-300 ease-(--ease-out-expo)',
                path.count > 0 ? 'cursor-pointer' : 'cursor-default'
              )}
              fill={
                isSelected
                  ? 'var(--color-accent-bright)'
                  : intensity === 0
                    ? // Landmasses without data still need to read as land
                      // against the card behind them, or the map looks empty.
                      'var(--color-raised)'
                    : `color-mix(in oklab, var(--color-accent) ${20 + intensity * 16}%, var(--color-raised))`
              }
              stroke={isSelected ? 'var(--color-fg)' : 'var(--color-line-strong)'}
              strokeWidth={isSelected ? 1.2 : 0.4}
              onClick={() => path.iso3 && path.count > 0 && onSelect(path.iso3, path.name)}
            >
              {path.count > 0 ? (
                <title>{`${path.name}: ${path.count} ${path.count === 1 ? 'entry' : 'entries'}`}</title>
              ) : null}
            </path>
          );
        })}
      </g>
    </svg>
  );
}
