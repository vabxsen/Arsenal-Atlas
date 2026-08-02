/**
 * The curated corpus.
 *
 * Each entry is keyed by its English Wikipedia title. Common names are fine —
 * the pipeline resolves redirects, so "F-16 Fighting Falcon" reaches
 * "General Dynamics F-16 Fighting Falcon". Wikidata QIDs are resolved from
 * the article rather than hardcoded, so this list stays readable and there
 * is no second identifier to keep in sync.
 *
 * Curated rather than bulk-imported: every item here has a substantial
 * article, a usable lead image, and a real infobox. Sweeping Wikidata for
 * everything classed as a weapon yields thousands of stubs with no imagery,
 * which would make the product look broken rather than comprehensive.
 */

export interface CatalogEntry {
  /** English Wikipedia title (redirects allowed). */
  readonly title: string;
  /** Category slug from shared/taxonomy.ts. */
  readonly category: string;
  /** Surfaces on the homepage rails. */
  readonly featured?: boolean;
  /** Joins this entry to a family tree in FAMILIES below. */
  readonly family?: string;
}

const e = (
  title: string,
  category: string,
  extra: { featured?: boolean; family?: string } = {}
): CatalogEntry => ({ title, category, ...extra });

export const CATALOG: readonly CatalogEntry[] = [
  // ── Assault rifles ────────────────────────────────────────
  e('AK-47', 'assault-rifles', { featured: true, family: 'kalashnikov' }),
  e('AKM', 'assault-rifles', { family: 'kalashnikov' }),
  e('AK-74', 'assault-rifles', { family: 'kalashnikov' }),
  e('AK-12', 'assault-rifles', { family: 'kalashnikov' }),
  e('AK-101', 'assault-rifles', { family: 'kalashnikov' }),
  e('AN-94', 'assault-rifles'),
  e('M16 rifle', 'assault-rifles', { featured: true, family: 'ar15' }),
  e('ArmaLite AR-15', 'assault-rifles', { family: 'ar15' }),
  e('StG 44', 'assault-rifles', { featured: true }),
  e('Heckler & Koch G36', 'assault-rifles'),
  e('Heckler & Koch HK416', 'assault-rifles', { family: 'ar15' }),
  e('SIG SG 550', 'assault-rifles'),
  e('Steyr AUG', 'assault-rifles'),
  e('FAMAS', 'assault-rifles'),
  e('IMI Galil', 'assault-rifles'),
  e('QBZ-95', 'assault-rifles'),
  e('INSAS', 'assault-rifles'),
  e('IWI Tavor', 'assault-rifles'),
  e('FN SCAR', 'assault-rifles'),
  e('SIG MCX', 'assault-rifles'),
  e('Beretta ARX160', 'assault-rifles'),
  e('CZ 805 BREN', 'assault-rifles'),
  e('Howa Type 89', 'assault-rifles'),
  e('Daewoo Precision Industries K2', 'assault-rifles'),
  e('Zastava M70 (assault rifle)', 'assault-rifles'),
  e('Vz. 58', 'assault-rifles'),

  // ── Battle rifles ─────────────────────────────────────────
  e('FN FAL', 'battle-rifles', { featured: true }),
  e('Heckler & Koch G3', 'battle-rifles'),
  e('M14 rifle', 'battle-rifles'),
  e('SIG SG 510', 'battle-rifles'),
  e('Beretta BM 59', 'battle-rifles'),
  e('Howa Type 64', 'battle-rifles'),

  // ── Carbines ──────────────────────────────────────────────
  e('M4 carbine', 'carbines', { featured: true, family: 'ar15' }),
  e('AKS-74U', 'carbines', { family: 'kalashnikov' }),
  e('M1 carbine', 'carbines'),

  // ── Submachine guns ───────────────────────────────────────
  e('MP 40', 'submachine-guns', { featured: true }),
  e('Thompson submachine gun', 'submachine-guns'),
  e('Uzi', 'submachine-guns', { featured: true }),
  e('Heckler & Koch MP5', 'submachine-guns', { featured: true }),
  e('PPSh-41', 'submachine-guns'),
  e('Sten', 'submachine-guns'),
  e('MAC-10', 'submachine-guns'),
  e('Sterling submachine gun', 'submachine-guns'),
  e('Beretta M12', 'submachine-guns'),
  e('Škorpion vz. 61', 'submachine-guns'),
  e('KRISS Vector', 'submachine-guns'),
  e('PP-19 Bizon', 'submachine-guns'),

  // ── Shotguns ──────────────────────────────────────────────
  e('Remington Model 870', 'shotguns'),
  e('Mossberg 500', 'shotguns'),
  e('Benelli M4', 'shotguns'),
  e('Franchi SPAS-12', 'shotguns'),
  e('Saiga-12', 'shotguns'),
  e('Atchisson Assault Shotgun', 'shotguns'),
  e('Winchester Model 1897', 'shotguns'),

  // ── Sniper rifles ─────────────────────────────────────────
  e('SVD (rifle)', 'sniper-rifles', { featured: true }),
  e('Barrett M82', 'sniper-rifles', { featured: true }),
  e('M24 Sniper Weapon System', 'sniper-rifles'),
  e('Accuracy International Arctic Warfare', 'sniper-rifles'),
  e('M40 rifle', 'sniper-rifles'),
  e('CheyTac Intervention', 'sniper-rifles'),
  e('Heckler & Koch PSG1', 'sniper-rifles'),
  e('McMillan Tac-50', 'sniper-rifles'),
  e('Sako TRG', 'sniper-rifles'),
  e('M110 Semi-Automatic Sniper System', 'sniper-rifles'),
  e('Steyr SSG 69', 'sniper-rifles'),

  // ── Machine guns ──────────────────────────────────────────
  e('M2 Browning', 'machine-guns', { featured: true }),
  e('M60 machine gun', 'machine-guns'),
  e('PK machine gun', 'machine-guns'),
  e('MG 42', 'machine-guns', { featured: true }),
  e('FN Minimi', 'machine-guns'),
  e('M240 machine gun', 'machine-guns'),
  e('DShK', 'machine-guns'),
  e('RPD machine gun', 'machine-guns'),
  e('RPK', 'machine-guns', { family: 'kalashnikov' }),
  e('Lewis gun', 'machine-guns'),
  e('Maxim gun', 'machine-guns', { featured: true }),
  e('Vickers machine gun', 'machine-guns'),
  e('MG 34', 'machine-guns'),
  e('M1918 Browning Automatic Rifle', 'machine-guns'),
  e('M134 Minigun', 'machine-guns'),
  e('NSV machine gun', 'machine-guns'),
  e('Kord machine gun', 'machine-guns'),

  // ── Pistols ───────────────────────────────────────────────
  e('M1911 pistol', 'pistols', { featured: true }),
  e('Glock', 'pistols', { featured: true }),
  e('Beretta M9', 'pistols'),
  e('Makarov pistol', 'pistols'),
  e('Walther P38', 'pistols'),
  e('Luger pistol', 'pistols'),
  e('SIG Sauer P226', 'pistols'),
  e('CZ 75', 'pistols'),
  e('Heckler & Koch USP', 'pistols'),
  e('Browning Hi-Power', 'pistols'),
  e('TT pistol', 'pistols'),
  e('SIG Sauer P320', 'pistols'),
  e('Walther PPK', 'pistols'),
  e('IMI Desert Eagle', 'pistols'),
  e('FN Five-seven', 'pistols'),
  e('QSZ-92', 'pistols'),

  // ── Revolvers ─────────────────────────────────────────────
  e('Colt Single Action Army', 'revolvers', { featured: true }),
  e('Smith & Wesson Model 29', 'revolvers'),
  e('Colt Python', 'revolvers'),
  e('Nagant M1895', 'revolvers'),
  e('Webley Revolver', 'revolvers'),
  e('Smith & Wesson Model 10', 'revolvers'),

  // ── PDWs ──────────────────────────────────────────────────
  e('FN P90', 'pdws', { featured: true }),
  e('Heckler & Koch MP7', 'pdws'),
  e('PP-2000', 'pdws'),
  e('SR-2 Veresk', 'pdws'),

  // ── Grenades ──────────────────────────────────────────────
  e('Mk 2 grenade', 'grenades'),
  e('M67 grenade', 'grenades'),
  e('F1 grenade (Russia)', 'grenades'),
  e('Model 24 grenade', 'grenades'),
  e('RGD-5', 'grenades'),
  e('M18 smoke grenade', 'grenades'),

  // ── Rocket launchers ──────────────────────────────────────
  e('RPG-7', 'rocket-launchers', { featured: true }),
  e('M72 LAW', 'rocket-launchers'),
  e('Panzerfaust', 'rocket-launchers'),
  e('Bazooka', 'rocket-launchers'),
  e('AT4', 'rocket-launchers'),
  e('Carl Gustaf 8.4 cm recoilless rifle', 'rocket-launchers'),
  e('RPG-29', 'rocket-launchers'),
  e('Shoulder-launched Multipurpose Assault Weapon', 'rocket-launchers'),
  e('Panzerschreck', 'rocket-launchers'),

  // ── ATGMs ─────────────────────────────────────────────────
  e('FGM-148 Javelin', 'atgms', { featured: true }),
  e('BGM-71 TOW', 'atgms'),
  e('9M133 Kornet', 'atgms'),
  e('MILAN', 'atgms'),
  e('9M14 Malyutka', 'atgms'),
  e('Spike (missile)', 'atgms'),
  e('HJ-8', 'atgms'),
  e('NLAW', 'atgms'),

  // ── MANPADS ───────────────────────────────────────────────
  e('FIM-92 Stinger', 'manpads', { featured: true }),
  e('9K32 Strela-2', 'manpads'),
  e('9K38 Igla', 'manpads'),
  e('Starstreak', 'manpads'),
  e('Mistral (missile)', 'manpads'),

  // ── Mortars ───────────────────────────────────────────────
  e('M120 mortar', 'mortars'),
  e('M224 mortar', 'mortars'),
  e('M252 mortar', 'mortars'),
  e('2B14 Podnos', 'mortars'),
  e('Brandt Mle 27/31', 'mortars'),

  // ── Howitzers ─────────────────────────────────────────────
  e('M777 howitzer', 'howitzers', { featured: true }),
  e('M109 howitzer', 'howitzers'),
  e('2S19 Msta', 'howitzers'),
  e('Panzerhaubitze 2000', 'howitzers'),
  e('M198 howitzer', 'howitzers'),
  e('122 mm howitzer 2A18 (D-30)', 'howitzers'),
  e('CAESAR self-propelled howitzer', 'howitzers'),
  e('K9 Thunder', 'howitzers'),
  e('M101 howitzer', 'howitzers'),

  // ── Artillery ─────────────────────────────────────────────
  e('BM-21 Grad', 'artillery'),
  e('M142 HIMARS', 'artillery', { featured: true }),
  e('M270 Multiple Launch Rocket System', 'artillery'),
  e('Katyusha rocket launcher', 'artillery'),
  e('TOS-1', 'artillery'),
  e('Schwerer Gustav', 'artillery', { featured: true }),
  e('Paris Gun', 'artillery'),

  // ── Naval guns ────────────────────────────────────────────
  e('5-inch/54-caliber Mark 45 gun', 'naval-guns'),
  e('Otobreda 76 mm', 'naval-guns'),
  e('Phalanx CIWS', 'naval-guns', { featured: true }),
  e('AK-630', 'naval-guns'),
  e('BL 15-inch Mk I naval gun', 'naval-guns'),

  // ── Anti-air ──────────────────────────────────────────────
  e('MIM-104 Patriot', 'anti-air', { featured: true }),
  e('S-400 missile system', 'anti-air', { featured: true }),
  e('S-300 missile system', 'anti-air'),
  e('Iron Dome', 'anti-air'),
  e('NASAMS', 'anti-air'),
  e('Pantsir missile system', 'anti-air'),
  e('ZSU-23-4 Shilka', 'anti-air'),
  e('MIM-23 Hawk', 'anti-air'),
  e('Terminal High Altitude Area Defense', 'anti-air'),

  // ── Missiles ──────────────────────────────────────────────
  e('AIM-120 AMRAAM', 'missiles'),
  e('AIM-9 Sidewinder', 'missiles', { featured: true }),
  e('AGM-114 Hellfire', 'missiles'),
  e('R-77 (missile)', 'missiles'),
  e('BrahMos', 'missiles'),
  e('Exocet', 'missiles'),
  e('Harpoon (missile)', 'missiles'),
  e('AIM-54 Phoenix', 'missiles'),
  e('Meteor (missile)', 'missiles'),

  // ── Cruise missiles ───────────────────────────────────────
  e('Tomahawk (missile)', 'cruise-missiles', { featured: true }),
  e('AGM-86 ALCM', 'cruise-missiles'),
  e('3M-54 Kalibr', 'cruise-missiles'),
  e('Storm Shadow', 'cruise-missiles'),
  e('Taurus KEPD 350', 'cruise-missiles'),

  // ── Ballistic missiles ────────────────────────────────────
  e('LGM-30 Minuteman', 'ballistic-missiles', { featured: true }),
  e('R-36 (missile)', 'ballistic-missiles'),
  e('UGM-133 Trident II', 'ballistic-missiles'),
  e('RS-28 Sarmat', 'ballistic-missiles'),
  e('DF-21', 'ballistic-missiles'),
  e('9K720 Iskander', 'ballistic-missiles'),
  e('V-2 rocket', 'ballistic-missiles', { featured: true }),
  e('Scud', 'ballistic-missiles'),
  e('LGM-118 Peacekeeper', 'ballistic-missiles'),
  e('Agni-V', 'ballistic-missiles'),

  // ── Tanks ─────────────────────────────────────────────────
  e('M1 Abrams', 'tanks', { featured: true, family: 'abrams' }),
  e('T-34', 'tanks', { featured: true }),
  e('T-72', 'tanks', { family: 'soviet-mbt' }),
  e('T-90', 'tanks', { family: 'soviet-mbt' }),
  e('T-64', 'tanks', { family: 'soviet-mbt' }),
  e('T-55', 'tanks', { family: 'soviet-mbt' }),
  e('T-62', 'tanks', { family: 'soviet-mbt' }),
  e('T-14 Armata', 'tanks', { family: 'soviet-mbt' }),
  e('Leopard 2', 'tanks', { featured: true }),
  e('Challenger 2', 'tanks'),
  e('Merkava', 'tanks'),
  e('Tiger I', 'tanks', { featured: true }),
  e('Panther tank', 'tanks'),
  e('M4 Sherman', 'tanks', { featured: true }),
  e('Type 99 tank', 'tanks'),
  e('K2 Black Panther', 'tanks'),
  e('Leclerc tank', 'tanks'),
  e('Centurion (tank)', 'tanks'),
  e('M60 tank', 'tanks'),
  e('Churchill tank', 'tanks'),
  e('Type 10', 'tanks'),
  e('Ariete', 'tanks'),

  // ── IFVs ──────────────────────────────────────────────────
  e('M2 Bradley', 'ifvs', { featured: true }),
  e('BMP-1', 'ifvs'),
  e('BMP-2', 'ifvs'),
  e('BMP-3', 'ifvs'),
  e('Warrior tracked armoured vehicle', 'ifvs'),
  e('Combat Vehicle 90', 'ifvs'),
  e('Puma (IFV)', 'ifvs'),
  e('Marder (IFV)', 'ifvs'),

  // ── APCs ──────────────────────────────────────────────────
  e('M113 armored personnel carrier', 'apcs', { featured: true }),
  e('BTR-80', 'apcs'),
  e('Stryker', 'apcs'),
  e('Boxer (armoured fighting vehicle)', 'apcs'),
  e('FV432', 'apcs'),
  e('BTR-60', 'apcs'),

  // ── Aircraft (support / recon / transport) ────────────────
  e('Lockheed C-130 Hercules', 'aircraft', { featured: true }),
  e('Boeing C-17 Globemaster III', 'aircraft'),
  e('Antonov An-124 Ruslan', 'aircraft'),
  e('Boeing KC-135 Stratotanker', 'aircraft'),
  e('Lockheed U-2', 'aircraft', { featured: true }),
  e('Boeing E-3 Sentry', 'aircraft'),
  e('Lockheed SR-71 Blackbird', 'aircraft', { featured: true }),

  // ── Fighters ──────────────────────────────────────────────
  e('F-16 Fighting Falcon', 'fighters', { featured: true }),
  e('F-15 Eagle', 'fighters', { featured: true }),
  e('F-22 Raptor', 'fighters', { featured: true }),
  e('Lockheed Martin F-35 Lightning II', 'fighters', { featured: true }),
  e('Sukhoi Su-27', 'fighters'),
  e('Mikoyan MiG-29', 'fighters'),
  e('Sukhoi Su-57', 'fighters'),
  e('Dassault Rafale', 'fighters'),
  e('Eurofighter Typhoon', 'fighters'),
  e('Saab JAS 39 Gripen', 'fighters'),
  e('McDonnell Douglas F/A-18 Hornet', 'fighters'),
  e('Grumman F-14 Tomcat', 'fighters', { featured: true }),
  e('Chengdu J-20', 'fighters'),
  e('Mikoyan-Gurevich MiG-21', 'fighters'),
  e('Supermarine Spitfire', 'fighters', { featured: true }),
  e('North American P-51 Mustang', 'fighters', { featured: true }),
  e('Messerschmitt Bf 109', 'fighters'),
  e('Mitsubishi A6M Zero', 'fighters'),
  e('McDonnell Douglas F-4 Phantom II', 'fighters'),
  e('Sukhoi Su-35', 'fighters'),
  e('Lockheed F-117 Nighthawk', 'fighters', { featured: true }),
  e('Fairchild Republic A-10 Thunderbolt II', 'fighters', { featured: true }),

  // ── Bombers ───────────────────────────────────────────────
  e('Boeing B-52 Stratofortress', 'bombers', { featured: true }),
  e('Northrop Grumman B-2 Spirit', 'bombers', { featured: true }),
  e('Rockwell B-1 Lancer', 'bombers'),
  e('Tupolev Tu-95', 'bombers'),
  e('Tupolev Tu-160', 'bombers'),
  e('Avro Lancaster', 'bombers'),
  e('Boeing B-17 Flying Fortress', 'bombers', { featured: true }),
  e('Boeing B-29 Superfortress', 'bombers'),
  e('Xian H-6', 'bombers'),
  e('Northrop Grumman B-21 Raider', 'bombers'),

  // ── Helicopters ───────────────────────────────────────────
  e('Boeing AH-64 Apache', 'helicopters', { featured: true }),
  e('Bell UH-1 Iroquois', 'helicopters', { featured: true }),
  e('Mil Mi-24', 'helicopters', { featured: true }),
  e('Sikorsky UH-60 Black Hawk', 'helicopters'),
  e('Boeing CH-47 Chinook', 'helicopters'),
  e('Kamov Ka-52', 'helicopters'),
  e('Bell AH-1 Cobra', 'helicopters'),
  e('Eurocopter Tiger', 'helicopters'),
  e('Mil Mi-8', 'helicopters'),
  e('Sikorsky CH-53E Super Stallion', 'helicopters'),
  e('Bell Boeing V-22 Osprey', 'helicopters'),

  // ── Drones ────────────────────────────────────────────────
  e('General Atomics MQ-1 Predator', 'drones', { featured: true }),
  e('General Atomics MQ-9 Reaper', 'drones', { featured: true }),
  e('Bayraktar TB2', 'drones', { featured: true }),
  e('Northrop Grumman RQ-4 Global Hawk', 'drones'),
  e('Northrop Grumman X-47B', 'drones'),
  e('HESA Shahed 136', 'drones'),
  e('AeroVironment Switchblade', 'drones'),

  // ── Warships ──────────────────────────────────────────────
  e('Iowa-class battleship', 'warships', { featured: true }),
  e('Japanese battleship Yamato', 'warships', { featured: true }),
  e('HMS Dreadnought (1906)', 'warships'),
  e('German battleship Bismarck', 'warships', { featured: true }),
  e('Ticonderoga-class cruiser', 'warships'),
  e('Kirov-class battlecruiser', 'warships'),

  // ── Aircraft carriers ─────────────────────────────────────
  e('USS Nimitz (CVN-68)', 'aircraft-carriers', { featured: true }),
  e('USS Gerald R. Ford (CVN-78)', 'aircraft-carriers', { featured: true }),
  e('Russian aircraft carrier Admiral Kuznetsov', 'aircraft-carriers'),
  e('Queen Elizabeth-class aircraft carrier', 'aircraft-carriers'),
  e('Chinese aircraft carrier Liaoning', 'aircraft-carriers'),
  e('USS Enterprise (CVN-65)', 'aircraft-carriers'),
  e('French aircraft carrier Charles de Gaulle', 'aircraft-carriers'),

  // ── Destroyers ────────────────────────────────────────────
  e('Arleigh Burke-class destroyer', 'destroyers', { featured: true }),
  e('Zumwalt-class destroyer', 'destroyers', { featured: true }),
  e('Type 45 destroyer', 'destroyers'),
  e('Type 055 destroyer', 'destroyers'),
  e('Kongō-class destroyer', 'destroyers'),
  e('Udaloy-class destroyer', 'destroyers'),

  // ── Frigates ──────────────────────────────────────────────
  e('Oliver Hazard Perry-class frigate', 'frigates'),
  e('Type 23 frigate', 'frigates'),
  e('FREMM multipurpose frigate', 'frigates'),
  e('Admiral Gorshkov-class frigate', 'frigates'),
  e('Type 054A frigate', 'frigates'),

  // ── Submarines ────────────────────────────────────────────
  e('Ohio-class submarine', 'submarines', { featured: true }),
  e('Virginia-class submarine', 'submarines', { featured: true }),
  e('Los Angeles-class submarine', 'submarines'),
  e('Typhoon-class submarine', 'submarines', { featured: true }),
  e('Astute-class submarine', 'submarines'),
  e('Type 212 submarine', 'submarines'),
  e('Borei-class submarine', 'submarines'),
  e('U-boat', 'submarines'),
  e('Seawolf-class submarine', 'submarines'),
  e('Akula-class submarine', 'submarines'),

  // ── Ammunition ────────────────────────────────────────────
  e('5.56×45mm NATO', 'ammunition', { featured: true }),
  e('7.62×51mm NATO', 'ammunition', { featured: true }),
  e('7.62×39mm', 'ammunition', { featured: true }),
  e('9×19mm Parabellum', 'ammunition', { featured: true }),
  e('.50 BMG', 'ammunition', { featured: true }),
  e('.45 ACP', 'ammunition'),
  e('5.45×39mm', 'ammunition'),
  e('.308 Winchester', 'ammunition'),
  e('12.7×108mm', 'ammunition'),
  e('.338 Lapua Magnum', 'ammunition'),
  e('7.62×54mmR', 'ammunition'),
  e('5.7×28mm', 'ammunition'),
  e('.300 Winchester Magnum', 'ammunition'),
  e('40 mm grenade', 'ammunition'),
  e('30×173mm', 'ammunition'),

  // ── Soldier systems ───────────────────────────────────────
  e('MOLLE', 'equipment'),
  e('Entrenching tool', 'equipment'),
  e('Gas mask', 'equipment'),
  e('Ghillie suit', 'equipment'),

  e('Advanced Combat Optical Gunsight', 'optics', { featured: true }),
  e('EOTech', 'optics'),
  e('PSO-1', 'optics'),
  e('Aimpoint AB', 'optics'),
  e('Telescopic sight', 'optics'),

  e('Interceptor body armor', 'body-armor', { featured: true }),
  e('Improved Outer Tactical Vest', 'body-armor'),
  e('Bulletproof vest', 'body-armor'),
  e('Dragon Skin (body armor)', 'body-armor'),

  e('Advanced Combat Helmet', 'helmets', { featured: true }),
  e('Personnel Armor System for Ground Troops', 'helmets'),
  e('Stahlhelm', 'helmets', { featured: true }),
  e('M1 helmet', 'helmets'),
  e('Brodie helmet', 'helmets'),

  e('AN/PVS-14', 'night-vision', { featured: true }),
  e('AN/PVS-7', 'night-vision'),
  e('Night-vision device', 'night-vision'),
  e('Thermal weapon sight', 'night-vision'),

  // ── Historical ────────────────────────────────────────────
  e('Lee–Enfield', 'historical', { featured: true }),
  e('Karabiner 98k', 'historical', { featured: true }),
  e('M1 Garand', 'historical', { featured: true }),
  e('Mosin–Nagant', 'historical', { featured: true }),
  e('Gatling gun', 'historical', { featured: true }),
  e('Brown Bess', 'historical'),
  e('M1903 Springfield', 'historical'),
  e('Arisaka', 'historical'),
  e('Martini–Henry', 'historical'),
  e('Trebuchet', 'historical'),
  e('Ballista', 'historical'),
  e('English longbow', 'historical'),
  e('Crossbow', 'historical'),

  // ── Experimental ──────────────────────────────────────────
  e('Heckler & Koch G11', 'experimental', { featured: true }),
  e('XM29 OICW', 'experimental'),
  e('Metal Storm', 'experimental'),
  e('CornerShot', 'experimental'),
  e('Gyrojet', 'experimental'),
  e('XM25 CDTE', 'experimental'),
  e('Northrop YF-23', 'experimental', { featured: true }),
  e('Avro Canada CF-105 Arrow', 'experimental'),
  e('Landkreuzer P. 1000 Ratte', 'experimental'),
  e('StG 45(M)', 'experimental'),

  // ── Firearms (general) ────────────────────────────────────
  //
  // The umbrella small-arms category, filling the same role `aircraft`,
  // `missiles`, and `warships` play in their groups: the pieces that belong to
  // the family but not to any of its narrower subcategories. Grenade
  // launchers, anti-materiel rifles, and underwater weapons — "service pistols
  // to crew-served weapons", per the blurb in shared/taxonomy.ts.
  e('M79 grenade launcher', 'firearms', { featured: true }),
  e('M203 grenade launcher', 'firearms'),
  e('Mk 19 grenade launcher', 'firearms'),
  e('Milkor MGL', 'firearms'),
  e('GP-25', 'firearms'),
  e('NTW-20', 'firearms'),
  e('Steyr IWS 2000', 'firearms'),
  e('APS underwater rifle', 'firearms'),
  e('SPP-1 underwater pistol', 'firearms'),
  e('Gepárd anti-materiel rifle', 'firearms'),

  // ── Carbines ──────────────────────────────────────────────
  e('CAR-15', 'carbines', { family: 'ar15' }),
  e('SKS', 'carbines'),
  e('Heckler & Koch HK53', 'carbines'),
  e('Ruger Mini-14', 'carbines'),
  e('Beretta Cx4 Storm', 'carbines'),
  e('Type 56 carbine', 'carbines'),

  // ── PDWs ──────────────────────────────────────────────────
  e('Steyr TMP', 'pdws'),
  e('Brügger & Thomet MP9', 'pdws'),
  e('SIG MPX', 'pdws'),
  e('QCW-05', 'pdws'),
  e('Heckler & Koch MP5K', 'pdws'),

  // ── Battle rifles ─────────────────────────────────────────
  e('AR-10', 'battle-rifles'),
  e('Springfield Armory M1A', 'battle-rifles'),
  e('Vz. 52 rifle', 'battle-rifles'),

  // ── Revolvers ─────────────────────────────────────────────
  e('Ruger GP100', 'revolvers'),
  e('Smith & Wesson Model 686', 'revolvers'),
  e('Colt Detective Special', 'revolvers'),

  // ── Grenades ──────────────────────────────────────────────
  e('M84 stun grenade', 'grenades'),
  e('M26 grenade', 'grenades'),
  e('RGO hand grenade', 'grenades'),

  // ── MANPADS ───────────────────────────────────────────────
  e('FIM-43 Redeye', 'manpads'),
  e('RBS 70', 'manpads'),
  e('9K333 Verba', 'manpads'),
  e('Blowpipe (missile)', 'manpads'),
  e('Type 91 surface-to-air missile', 'manpads'),

  // ── Mortars ───────────────────────────────────────────────
  e('L16 81mm mortar', 'mortars'),
  e('Stokes mortar', 'mortars'),
  e('M2 mortar', 'mortars'),
  e('8 cm Granatwerfer 34', 'mortars'),
  e('2S12 Sani', 'mortars'),

  // ── Naval guns ────────────────────────────────────────────
  e('Goalkeeper CIWS', 'naval-guns'),
  e('Mk 110 57 mm gun', 'naval-guns'),
  e('Oerlikon 20 mm cannon', 'naval-guns'),
  e('Bofors 40 mm Automatic Gun L/70', 'naval-guns'),
  e('16"/50 caliber Mark 7 gun', 'naval-guns'),

  // ── Cruise missiles ───────────────────────────────────────
  e('AGM-158 JASSM', 'cruise-missiles'),
  e('Kh-55', 'cruise-missiles'),
  e('Kh-35', 'cruise-missiles'),
  e('Naval Strike Missile', 'cruise-missiles'),
  e('AGM-84 Harpoon', 'cruise-missiles'),

  // ── APCs ──────────────────────────────────────────────────
  e('M3 half-track', 'apcs'),
  e('Type 96 armoured personnel carrier', 'apcs'),
  e('Pandur I', 'apcs'),

  // ── Warships ──────────────────────────────────────────────
  e('Slava-class cruiser', 'warships'),
  e('HMS Hood', 'warships'),
  e('USS Missouri (BB-63)', 'warships'),

  // ── Frigates ──────────────────────────────────────────────
  e('Type 26 frigate', 'frigates'),
  e('Sachsen-class frigate', 'frigates'),
  e('Iver Huitfeldt-class frigate', 'frigates'),
  e('Anzac-class frigate', 'frigates'),
  e('La Fayette-class frigate', 'frigates'),

  // ── Soldier systems ───────────────────────────────────────
  e('Bayonet', 'equipment'),
  e('Ka-Bar', 'equipment'),
  e('Dog tag', 'equipment'),
  e('Mess kit', 'equipment'),
  e('Canteen (bottle)', 'equipment'),

  e('Modular Tactical Vest', 'body-armor'),
  e('Small Arms Protective Insert', 'body-armor'),
  e('Plate carrier', 'body-armor'),
  e('Ratnik (program)', 'body-armor'),
  e('Ballistic shield', 'body-armor'),

  e('Image intensifier', 'night-vision'),
  e('Forward-looking infrared', 'night-vision'),
  e('AN/PAS-13', 'night-vision'),
  e('Starlight scope', 'night-vision'),
  e('AN/PVS-31', 'night-vision'),

  e('Red dot sight', 'optics'),
  e('Holographic weapon sight', 'optics'),
  e('Reflector sight', 'optics'),
  e('Iron sights', 'optics'),
  e('Trijicon', 'optics'),

  e('Combat helmet', 'helmets'),
  e('Adrian helmet', 'helmets'),
  e('SSh-40', 'helmets'),
  e('Enhanced Combat Helmet (United States)', 'helmets'),
  e('Mk 6 helmet', 'helmets'),

  // ── Destroyers ────────────────────────────────────────────
  e('Fletcher-class destroyer', 'destroyers'),
  e('Sovremenny-class destroyer', 'destroyers'),
  e('Sejong the Great-class destroyer', 'destroyers'),

  // ── Shotguns ──────────────────────────────────────────────
  e('Ithaca 37', 'shotguns'),
  e('KS-23', 'shotguns'),

  // ── Artillery ─────────────────────────────────────────────
  e('BM-30 Smerch', 'artillery'),
  e('Type 63 multiple rocket launcher', 'artillery'),

  // ── Aircraft (support / recon / transport) ────────────────
  e('Lockheed AC-130', 'aircraft', { featured: true }),
  e('Airbus A400M Atlas', 'aircraft'),
  e('Lockheed P-3 Orion', 'aircraft'),

  // ── Drones ────────────────────────────────────────────────
  e('Elbit Hermes 900', 'drones'),
  e('IAI Heron', 'drones'),

  // ── Aircraft carriers ─────────────────────────────────────
  e('Japanese aircraft carrier Akagi', 'aircraft-carriers'),
  e('USS Lexington (CV-2)', 'aircraft-carriers'),
] as const;

/**
 * Evolution trees. `parent: null` marks a root.
 * Node slugs must match the slugs the pipeline derives from catalog titles.
 */
export interface FamilyDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodes: readonly { slug: string; name: string; year?: number; parent: string | null }[];
}

export const FAMILIES: readonly FamilyDef[] = [
  {
    id: 'kalashnikov',
    name: 'Kalashnikov Lineage',
    description:
      'Seventy-five years of iteration on Mikhail Kalashnikov’s original gas-operated, ' +
      'long-stroke piston design — the most-produced family of firearms in history.',
    nodes: [
      { slug: 'ak-47', name: 'AK-47', year: 1949, parent: null },
      { slug: 'akm', name: 'AKM', year: 1959, parent: 'ak-47' },
      { slug: 'rpk', name: 'RPK', year: 1961, parent: 'akm' },
      { slug: 'ak-74', name: 'AK-74', year: 1974, parent: 'akm' },
      { slug: 'aks-74u', name: 'AKS-74U', year: 1979, parent: 'ak-74' },
      { slug: 'ak-101', name: 'AK-101', year: 1994, parent: 'ak-74' },
      { slug: 'ak-12', name: 'AK-12', year: 2018, parent: 'ak-74' },
    ],
  },
  {
    id: 'ar15',
    name: 'AR-15 Lineage',
    description:
      'Eugene Stoner’s direct-impingement rifle and the Western service weapons that ' +
      'descend from it.',
    nodes: [
      { slug: 'armalite-ar-15', name: 'ArmaLite AR-15', year: 1956, parent: null },
      { slug: 'm16-rifle', name: 'M16', year: 1964, parent: 'armalite-ar-15' },
      { slug: 'm4-carbine', name: 'M4 Carbine', year: 1994, parent: 'm16-rifle' },
      { slug: 'heckler-koch-hk416', name: 'HK416', year: 2004, parent: 'm4-carbine' },
    ],
  },
  {
    id: 'soviet-mbt',
    name: 'Soviet Main Battle Tanks',
    description:
      'The post-war Soviet and Russian main battle tank line, from the T-54/55 through ' +
      'the unmanned-turret Armata.',
    nodes: [
      { slug: 't-55', name: 'T-55', year: 1958, parent: null },
      { slug: 't-62', name: 'T-62', year: 1961, parent: 't-55' },
      { slug: 't-64', name: 'T-64', year: 1966, parent: 't-62' },
      { slug: 't-72', name: 'T-72', year: 1973, parent: 't-64' },
      { slug: 't-90', name: 'T-90', year: 1992, parent: 't-72' },
      { slug: 't-14-armata', name: 'T-14 Armata', year: 2015, parent: 't-90' },
    ],
  },
];
