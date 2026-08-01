import type { EquipmentKind } from '../../shared/taxonomy.ts';

/**
 * Maps raw infobox parameter names onto the grouped specification model.
 *
 * Wikipedia's infobox families are inconsistent by design — `Infobox weapon`
 * writes "3.47 kg" into `weight`, while `Aircraft specs` writes a bare "49"
 * into `length ft` with the unit encoded in the key. `unitFromKey` handles
 * that second case so both end up as proper `{ value, numeric, unit }` items.
 */

export interface FieldDef {
  readonly label: string;
  /** Candidate infobox keys, highest priority first. */
  readonly keys: readonly string[];
  /** Appended when the raw value is a bare number. */
  readonly unit?: string;
  /** Derive the unit from the matched key's trailing token ("length ft" -> ft). */
  readonly unitFromKey?: boolean;
}

export interface GroupDef {
  readonly group: string;
  readonly fields: readonly FieldDef[];
}

const f = (label: string, keys: string[], extra: Partial<FieldDef> = {}): FieldDef => ({
  label,
  keys,
  ...extra,
});

const PRODUCTION: GroupDef = {
  group: 'Production',
  fields: [
    f('Designer', ['designer']),
    f('Designed', ['design_date', 'designdate']),
    f('Manufacturer', ['manufacturer', 'builder']),
    f('Produced', ['production_date', 'produced', 'production']),
    f('Number Built', ['number', 'number_built']),
    f('Unit Cost', ['unit_cost', 'unitcost']),
  ],
};

const SERVICE: GroupDef = {
  group: 'Service',
  fields: [
    f('Origin', ['origin', 'national_origin', 'place_of_origin']),
    f('In Service', ['service', 'used_by_date', 'in_service']),
    f('Introduced', ['introduction', 'introduced']),
    f('Retired', ['retired']),
    f('Status', ['status']),
  ],
};

const FIREARM: GroupDef[] = [
  {
    group: 'Cartridge & Action',
    fields: [
      f('Cartridge', ['cartridge', 'caliber', 'calibre']),
      f('Action', ['action']),
      f('Rate of Fire', ['rate', 'rate_of_fire']),
      f('Muzzle Velocity', ['velocity', 'muzzle_velocity']),
      f('Feed System', ['feed', 'feed_system']),
      f('Sights', ['sights']),
    ],
  },
  {
    group: 'Dimensions',
    fields: [
      f('Weight', ['weight']),
      f('Length', ['length']),
      f('Barrel Length', ['part_length', 'barrel_length']),
      f('Width', ['width']),
      f('Height', ['height']),
    ],
  },
  {
    group: 'Performance',
    fields: [
      f('Effective Range', ['range', 'effective_range']),
      f('Maximum Range', ['max_range', 'maximum_range']),
    ],
  },
  PRODUCTION,
  SERVICE,
];

const VEHICLE: GroupDef[] = [
  {
    group: 'Armament',
    fields: [
      f('Main Armament', ['primary_armament', 'main_armament', 'armament']),
      f('Secondary Armament', ['secondary_armament']),
    ],
  },
  {
    group: 'Protection',
    fields: [f('Armour', ['armour', 'armor']), f('Active Protection', ['aps'])],
  },
  {
    group: 'Mobility',
    fields: [
      f('Engine', ['engine']),
      f('Engine Power', ['engine_power']),
      f('Power/Weight', ['pw_ratio', 'power_weight']),
      f('Transmission', ['transmission']),
      f('Suspension', ['suspension']),
      f('Speed', ['speed', 'max_speed']),
      f('Operational Range', ['vehicle_range', 'range']),
      f('Fuel Capacity', ['fuel_capacity']),
    ],
  },
  {
    group: 'Dimensions',
    fields: [
      f('Weight', ['weight']),
      f('Length', ['length']),
      f('Width', ['width']),
      f('Height', ['height']),
      f('Crew', ['crew']),
    ],
  },
  PRODUCTION,
  SERVICE,
];

const AIRCRAFT: GroupDef[] = [
  {
    group: 'Dimensions',
    fields: [
      f('Length', ['length ft', 'length m', 'length'], { unitFromKey: true }),
      f('Wingspan', ['span ft', 'span m', 'wingspan'], { unitFromKey: true }),
      f('Height', ['height ft', 'height m', 'height'], { unitFromKey: true }),
      f('Wing Area', ['wing area sqft', 'wing area sqm'], { unitFromKey: true }),
      f('Aspect Ratio', ['aspect ratio']),
    ],
  },
  {
    group: 'Weights',
    fields: [
      f('Empty Weight', ['empty weight lb', 'empty weight kg'], { unitFromKey: true }),
      f('Gross Weight', ['gross weight lb', 'gross weight kg'], { unitFromKey: true }),
      f('Max Takeoff Weight', ['max takeoff weight lb', 'max takeoff weight kg'], {
        unitFromKey: true,
      }),
      f('Fuel Capacity', ['fuel capacity']),
    ],
  },
  {
    group: 'Powerplant',
    fields: [
      f('Engine', ['eng1 name', 'engine']),
      f('Engine Count', ['eng1 number']),
      f('Thrust', ['eng1 lbf', 'eng1 kn'], { unitFromKey: true }),
      f('Thrust (Afterburner)', ['eng1 lbf-ab', 'eng1 kn-ab'], { unitFromKey: true }),
      f('Power', ['eng1 hp', 'eng1 shp', 'eng1 kw'], { unitFromKey: true }),
    ],
  },
  {
    group: 'Performance',
    fields: [
      f('Maximum Speed', ['max speed mph', 'max speed kmh', 'max speed kts'], {
        unitFromKey: true,
      }),
      f('Maximum Speed (Mach)', ['max speed mach'], { unit: 'Mach' }),
      f('Cruise Speed', ['cruise speed kts', 'cruise speed mph'], { unitFromKey: true }),
      f('Combat Range', ['combat range nmi', 'combat range km'], { unitFromKey: true }),
      f('Ferry Range', ['ferry range nmi', 'ferry range km'], { unitFromKey: true }),
      f('Service Ceiling', ['ceiling ft', 'ceiling m'], { unitFromKey: true }),
      f('Rate of Climb', ['climb rate ftmin', 'climb rate ms'], { unitFromKey: true }),
      f('g Limits', ['g limits']),
    ],
  },
  {
    group: 'General',
    fields: [
      f('Type', ['type']),
      f('Crew', ['crew']),
      f('First Flight', ['first_flight']),
      f('Armament', ['armament', 'guns', 'missiles']),
      f('Primary User', ['primary_user']),
    ],
  },
  PRODUCTION,
  SERVICE,
];

const NAVAL: GroupDef[] = [
  {
    group: 'Displacement & Dimensions',
    fields: [
      f('Displacement', ['displacement']),
      f('Length', ['length']),
      f('Beam', ['beam']),
      f('Draft', ['draft', 'draught']),
    ],
  },
  {
    group: 'Propulsion',
    fields: [
      f('Propulsion', ['propulsion']),
      f('Speed', ['speed']),
      f('Range', ['range']),
      f('Endurance', ['endurance']),
    ],
  },
  {
    group: 'Complement',
    fields: [f('Complement', ['complement', 'crew']), f('Troops', ['troops'])],
  },
  {
    group: 'Systems',
    fields: [
      f('Armament', ['armament']),
      f('Armour', ['armour', 'armor']),
      f('Sensors', ['sensors', 'sensors and processing systems']),
      f('Electronic Warfare', ['ew', 'electronic warfare & decoys']),
      f('Aircraft Carried', ['aircraft', 'aircraft carried']),
      f('Aviation Facilities', ['aviation facilities']),
    ],
  },
  {
    group: 'Service',
    fields: [
      f('Class', ['class', 'ship class']),
      f('Namesake', ['namesake']),
      f('Builder', ['builder']),
      f('Laid Down', ['laid_down']),
      f('Launched', ['launched']),
      f('Commissioned', ['commissioned']),
      f('Decommissioned', ['decommissioned']),
      f('Status', ['status']),
      f('Home Port', ['homeport']),
    ],
  },
];

const MISSILE: GroupDef[] = [
  {
    group: 'Warhead',
    fields: [
      f('Warhead', ['warhead']),
      f('Warhead Weight', ['warhead_weight']),
      f('Yield', ['yield']),
      f('Detonation Mechanism', ['detonation']),
    ],
  },
  {
    group: 'Propulsion & Guidance',
    fields: [
      f('Engine', ['engine']),
      f('Propellant', ['propellant']),
      f('Guidance', ['guidance', 'guidance_system']),
      f('Steering', ['steering', 'steering_system']),
      f('Launch Platform', ['launch_platform']),
      f('Accuracy', ['accuracy']),
    ],
  },
  {
    group: 'Dimensions',
    fields: [
      f('Weight', ['weight']),
      f('Length', ['length']),
      f('Diameter', ['diameter']),
      f('Wingspan', ['wingspan']),
    ],
  },
  {
    group: 'Performance',
    fields: [
      f('Operational Range', ['vehicle_range', 'range']),
      f('Speed', ['speed']),
      f('Flight Ceiling', ['ceiling', 'flight_ceiling']),
      f('Flight Altitude', ['altitude']),
    ],
  },
  PRODUCTION,
  SERVICE,
];

const AMMUNITION: GroupDef[] = [
  {
    group: 'Cartridge',
    fields: [
      f('Type', ['type']),
      f('Case Type', ['case_type']),
      f('Bullet Diameter', ['bullet', 'bullet_diameter']),
      f('Neck Diameter', ['neck']),
      f('Shoulder Diameter', ['shoulder']),
      f('Base Diameter', ['base']),
      f('Rim Diameter', ['rim_dia']),
      f('Case Length', ['case_length']),
      f('Overall Length', ['length']),
      f('Rifling Twist', ['rifling']),
      f('Primer Type', ['primer']),
      f('Max Pressure', ['max_pressure']),
    ],
  },
  {
    group: 'Ballistics',
    fields: [
      f('Bullet Weight', ['bw1']),
      f('Muzzle Velocity', ['vel1']),
      f('Muzzle Energy', ['en1']),
      f('Test Barrel Length', ['balsrc', 'test_barrel_length']),
    ],
  },
  {
    group: 'Development',
    fields: [
      f('Designer', ['designer']),
      f('Designed', ['design_date']),
      f('Parent Case', ['parent']),
      f('Manufacturer', ['manufacturer']),
      f('Produced', ['production_date']),
      f('Origin', ['origin', 'place_of_origin']),
    ],
  },
];

const GEAR: GroupDef[] = [
  {
    group: 'Specification',
    fields: [
      f('Type', ['type']),
      f('Weight', ['weight']),
      f('Length', ['length']),
      f('Material', ['material']),
      f('Protection', ['protection']),
      f('Magnification', ['magnification']),
      f('Field of View', ['fov', 'field_of_view']),
    ],
  },
  PRODUCTION,
  SERVICE,
];

export const SPEC_MAP: Record<EquipmentKind, readonly GroupDef[]> = {
  firearm: FIREARM,
  ordnance: FIREARM,
  vehicle: VEHICLE,
  aircraft: AIRCRAFT,
  naval: NAVAL,
  missile: MISSILE,
  ammunition: AMMUNITION,
  gear: GEAR,
};

/**
 * Infobox keys carrying relational data rather than specifications.
 * Read separately into operators / conflicts / variants.
 */
export const RELATION_KEYS = {
  operators: ['used_by', 'users', 'operators', 'primary_user', 'more_users'],
  conflicts: ['wars', 'conflicts', 'battles'],
  variants: ['variants', 'variant'],
  developedFrom: ['developed_from', 'parent'],
  developedInto: ['developed_into'],
} as const;

/** Trailing token of a key like "length ft" -> "ft". Normalised for display. */
export function unitFromKey(key: string): string | undefined {
  const token = key.trim().split(/\s+/).pop();
  if (!token) return undefined;
  const map: Record<string, string> = {
    ft: 'ft',
    m: 'm',
    km: 'km',
    kg: 'kg',
    lb: 'lb',
    kts: 'kn',
    kmh: 'km/h',
    mph: 'mph',
    nmi: 'nmi',
    sqft: 'sq ft',
    sqm: 'm²',
    lbf: 'lbf',
    kn: 'kN',
    hp: 'hp',
    shp: 'shp',
    kw: 'kW',
    mach: 'Mach',
    ftmin: 'ft/min',
    ms: 'm/s',
    'lbf-ab': 'lbf',
    'kn-ab': 'kN',
  };
  return map[token.toLowerCase()];
}
