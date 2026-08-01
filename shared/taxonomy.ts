/**
 * The category taxonomy for Arsenal Atlas.
 *
 * Adding a new category is a one-line addition to CATEGORIES plus (if the
 * category needs specs no existing kind covers) a new `EquipmentKind`.
 * Nothing else in the app is category-aware — grids, filters, breadcrumbs,
 * and the country explorer all derive from this file.
 */

/** Broad families that determine which specification groups apply. */
export const EQUIPMENT_KINDS = [
  'firearm',
  'ordnance',
  'missile',
  'vehicle',
  'aircraft',
  'naval',
  'ammunition',
  'gear',
] as const;

export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export interface CategoryDef {
  /** URL segment. Stable — changing one breaks links. */
  readonly slug: string;
  readonly name: string;
  /** Which spec groups and detail-page modules to render. */
  readonly kind: EquipmentKind;
  /** Display grouping in nav and the category index. */
  readonly group: CategoryGroup;
  readonly blurb: string;
}

export const CATEGORY_GROUPS = [
  'Small Arms',
  'Support & Ordnance',
  'Missiles',
  'Armour',
  'Aviation',
  'Naval',
  'Munitions',
  'Soldier Systems',
  'Special Collections',
] as const;

export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

export const CATEGORIES: readonly CategoryDef[] = [
  // ── Small Arms ──────────────────────────────────────────────
  {
    slug: 'firearms',
    name: 'Firearms',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'The complete small-arms record, from service pistols to crew-served weapons.',
  },
  {
    slug: 'assault-rifles',
    name: 'Assault Rifles',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Selective-fire rifles chambered for intermediate cartridges.',
  },
  {
    slug: 'battle-rifles',
    name: 'Battle Rifles',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Full-power service rifles of the early Cold War and after.',
  },
  {
    slug: 'carbines',
    name: 'Carbines',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Shortened rifles built for mobility, vehicle crews, and close country.',
  },
  {
    slug: 'submachine-guns',
    name: 'Submachine Guns',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Pistol-calibre automatic weapons for close-quarters work.',
  },
  {
    slug: 'shotguns',
    name: 'Shotguns',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Combat and breaching shotguns in military service.',
  },
  {
    slug: 'sniper-rifles',
    name: 'Sniper Rifles',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Precision and anti-materiel rifles built for the long shot.',
  },
  {
    slug: 'machine-guns',
    name: 'Machine Guns',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Light, medium, general-purpose, and heavy sustained-fire weapons.',
  },
  {
    slug: 'pistols',
    name: 'Pistols',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Self-loading sidearms issued the world over.',
  },
  {
    slug: 'revolvers',
    name: 'Revolvers',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Cylinder-fed handguns from service issue to the modern day.',
  },
  {
    slug: 'pdws',
    name: 'Personal Defence Weapons',
    kind: 'firearm',
    group: 'Small Arms',
    blurb: 'Compact armour-defeating weapons for rear-echelon and vehicle crews.',
  },

  // ── Support & Ordnance ──────────────────────────────────────
  {
    slug: 'grenades',
    name: 'Grenades',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'Hand and rifle grenades across fragmentation, blast, and signalling roles.',
  },
  {
    slug: 'rocket-launchers',
    name: 'Rocket Launchers',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'Shoulder-fired unguided rockets and recoilless weapons.',
  },
  {
    slug: 'atgms',
    name: 'Anti-Tank Guided Missiles',
    kind: 'missile',
    group: 'Support & Ordnance',
    blurb: 'Guided weapons built to defeat armour.',
  },
  {
    slug: 'manpads',
    name: 'MANPADS',
    kind: 'missile',
    group: 'Support & Ordnance',
    blurb: 'Man-portable surface-to-air missile systems.',
  },
  {
    slug: 'mortars',
    name: 'Mortars',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'High-angle indirect fire from company to battalion level.',
  },
  {
    slug: 'howitzers',
    name: 'Howitzers',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'Towed and self-propelled indirect-fire artillery.',
  },
  {
    slug: 'artillery',
    name: 'Artillery',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'Guns, rocket artillery, and long-range fire support systems.',
  },
  {
    slug: 'naval-guns',
    name: 'Naval Guns',
    kind: 'ordnance',
    group: 'Support & Ordnance',
    blurb: 'Ship-mounted gunnery from secondary batteries to main armament.',
  },
  {
    slug: 'anti-air',
    name: 'Anti-Air Systems',
    kind: 'missile',
    group: 'Support & Ordnance',
    blurb: 'Ground-based air defence, from gun systems to strategic SAMs.',
  },

  // ── Missiles ────────────────────────────────────────────────
  {
    slug: 'missiles',
    name: 'Missiles',
    kind: 'missile',
    group: 'Missiles',
    blurb: 'Guided munitions across every launch environment.',
  },
  {
    slug: 'cruise-missiles',
    name: 'Cruise Missiles',
    kind: 'missile',
    group: 'Missiles',
    blurb: 'Air-breathing precision strike at operational and strategic range.',
  },
  {
    slug: 'ballistic-missiles',
    name: 'Ballistic Missiles',
    kind: 'missile',
    group: 'Missiles',
    blurb: 'Short-range battlefield systems through intercontinental weapons.',
  },

  // ── Armour ──────────────────────────────────────────────────
  {
    slug: 'tanks',
    name: 'Tanks',
    kind: 'vehicle',
    group: 'Armour',
    blurb: 'Main battle tanks and their forebears.',
  },
  {
    slug: 'ifvs',
    name: 'Infantry Fighting Vehicles',
    kind: 'vehicle',
    group: 'Armour',
    blurb: 'Armoured vehicles that both carry and fight alongside infantry.',
  },
  {
    slug: 'apcs',
    name: 'Armoured Personnel Carriers',
    kind: 'vehicle',
    group: 'Armour',
    blurb: 'Protected mobility for infantry on the modern battlefield.',
  },

  // ── Aviation ────────────────────────────────────────────────
  {
    slug: 'aircraft',
    name: 'Aircraft',
    kind: 'aircraft',
    group: 'Aviation',
    blurb: 'The complete military aviation record.',
  },
  {
    slug: 'fighters',
    name: 'Fighters',
    kind: 'aircraft',
    group: 'Aviation',
    blurb: 'Air superiority and multirole combat aircraft across five generations.',
  },
  {
    slug: 'bombers',
    name: 'Bombers',
    kind: 'aircraft',
    group: 'Aviation',
    blurb: 'Strategic and tactical strike aircraft.',
  },
  {
    slug: 'helicopters',
    name: 'Helicopters',
    kind: 'aircraft',
    group: 'Aviation',
    blurb: 'Attack, transport, and reconnaissance rotorcraft.',
  },
  {
    slug: 'drones',
    name: 'Drones',
    kind: 'aircraft',
    group: 'Aviation',
    blurb: 'Unmanned aerial systems from hand-launched scouts to strategic ISR.',
  },

  // ── Naval ───────────────────────────────────────────────────
  {
    slug: 'warships',
    name: 'Warships',
    kind: 'naval',
    group: 'Naval',
    blurb: 'Surface combatants of every displacement.',
  },
  {
    slug: 'aircraft-carriers',
    name: 'Aircraft Carriers',
    kind: 'naval',
    group: 'Naval',
    blurb: 'Capital ships that project air power from the sea.',
  },
  {
    slug: 'destroyers',
    name: 'Destroyers',
    kind: 'naval',
    group: 'Naval',
    blurb: 'Fast, heavily armed multi-mission surface combatants.',
  },
  {
    slug: 'frigates',
    name: 'Frigates',
    kind: 'naval',
    group: 'Naval',
    blurb: 'Escort and patrol combatants built for endurance.',
  },
  {
    slug: 'submarines',
    name: 'Submarines',
    kind: 'naval',
    group: 'Naval',
    blurb: 'Attack, ballistic-missile, and conventional boats.',
  },

  // ── Munitions ───────────────────────────────────────────────
  {
    slug: 'ammunition',
    name: 'Ammunition',
    kind: 'ammunition',
    group: 'Munitions',
    blurb: 'Cartridges and calibres, with the weapons that chamber them.',
  },

  // ── Soldier Systems ─────────────────────────────────────────
  {
    slug: 'equipment',
    name: 'Military Equipment',
    kind: 'gear',
    group: 'Soldier Systems',
    blurb: 'Field kit, load-bearing systems, and general issue.',
  },
  {
    slug: 'optics',
    name: 'Optics',
    kind: 'gear',
    group: 'Soldier Systems',
    blurb: 'Sights, scopes, and target acquisition systems.',
  },
  {
    slug: 'body-armor',
    name: 'Body Armour',
    kind: 'gear',
    group: 'Soldier Systems',
    blurb: 'Plate carriers, vests, and ballistic protection standards.',
  },
  {
    slug: 'helmets',
    name: 'Helmets',
    kind: 'gear',
    group: 'Soldier Systems',
    blurb: 'Combat helmets from steel shells to modern composites.',
  },
  {
    slug: 'night-vision',
    name: 'Night Vision',
    kind: 'gear',
    group: 'Soldier Systems',
    blurb: 'Image intensification and thermal systems that own the dark.',
  },

  // ── Special Collections ─────────────────────────────────────
  {
    slug: 'historical',
    name: 'Historical Weapons',
    kind: 'firearm',
    group: 'Special Collections',
    blurb: 'Arms that shaped warfare before the modern era.',
  },
  {
    slug: 'experimental',
    name: 'Experimental Weapons',
    kind: 'firearm',
    group: 'Special Collections',
    blurb: 'Prototypes, trials designs, and the roads not taken.',
  },
] as const;

// ── Derived lookups ───────────────────────────────────────────

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);

const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryDef | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function categoriesInGroup(group: CategoryGroup): CategoryDef[] {
  return CATEGORIES.filter((c) => c.group === group);
}

/** Groups in display order, each with its categories. */
export function groupedCategories(): { group: CategoryGroup; categories: CategoryDef[] }[] {
  return CATEGORY_GROUPS.map((group) => ({ group, categories: categoriesInGroup(group) }));
}
