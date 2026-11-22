/** Freischaltbare Ausrüstung. Wird am Avatar als Layer sichtbar. */
export type GearSlot = 'head' | 'body' | 'hands' | 'outfit' | 'legs' | 'shoes';

export interface GearItem {
  id: string;
  slot: GearSlot;
  name: string;
  desc: string;
  unlock: { start: true } | { level: number } | { boss: string };
}

export const GEAR: GearItem[] = [
  { id: 'outfit-standard', slot: 'outfit', name: 'Laufshirt Nachtblau', desc: 'Dunkelblau mit rostorangem Streifen.', unlock: { start: true } },
  { id: 'outfit-stein', slot: 'outfit', name: 'Laufshirt Steingrau', desc: 'Schlicht, grau, zeitlos.', unlock: { start: true } },
  { id: 'outfit-wald', slot: 'outfit', name: 'Laufshirt Waldgrün', desc: 'Für die Wälder des Engelmar.', unlock: { start: true } },
  { id: 'shoes-trail', slot: 'shoes', name: 'Trailschuhe', desc: 'Rostorange, griffiges Profil.', unlock: { start: true } },
  { id: 'head-band', slot: 'head', name: 'Schweißband', desc: 'Hält den Blick frei.', unlock: { level: 2 } },
  { id: 'head-cap', slot: 'head', name: 'Laufkappe', desc: 'Schutz vor Sonne und Regen.', unlock: { level: 4 } },
  { id: 'legs-compression', slot: 'legs', name: 'Kompressionsstrümpfe', desc: 'Für lange Tage auf dem Trail.', unlock: { level: 6 } },
  { id: 'outfit-nacht', slot: 'outfit', name: 'Nachtschicht-Shirt', desc: 'Schwarz-violett, für Läufe im Dunkeln.', unlock: { level: 8 } },
  { id: 'shoes-grat', slot: 'shoes', name: 'Gratläufer', desc: 'Dunkle Bergschuhe mit goldenen Akzenten.', unlock: { level: 10 } },
  { id: 'body-vest', slot: 'body', name: 'Laufweste', desc: 'Trinkflaschen vorn, Platz für Pflichtausrüstung.', unlock: { boss: 'b15' } },
  { id: 'hands-poles', slot: 'hands', name: 'Trailstöcke', desc: 'Für die steilen Anstiege.', unlock: { boss: 'b1000' } },
  { id: 'head-lamp', slot: 'head', name: 'Stirnlampe', desc: 'Für frühe Starts und lange Tage.', unlock: { boss: 'bhm' } },
  { id: 'outfit-gipfel', slot: 'outfit', name: 'Gipfelwächter-Shirt', desc: 'Tannengrün mit goldenem Streifen.', unlock: { boss: 'b30' } },
  { id: 'hands-chalk', slot: 'hands', name: 'Kreide', desc: 'Weiße Hände, fester Griff.', unlock: { boss: 'bpull10' } },
  { id: 'outfit-tank', slot: 'outfit', name: 'Ärmelloses Shirt', desc: 'Für den Wächter der Stange.', unlock: { boss: 'bmu' } },
  { id: 'hands-wraps', slot: 'hands', name: 'Handgelenk-Bandagen', desc: 'Stabile Handgelenke im Front Lever.', unlock: { boss: 'bfl' } },
  { id: 'shoes-titan', slot: 'shoes', name: 'Titan-Schuhe', desc: 'Bonus für 40 km.', unlock: { boss: 'b40' } },
  { id: 'outfit-finisher', slot: 'outfit', name: 'Finisher-Shirt', desc: 'Soul Trail 2027. Verdient.', unlock: { boss: 'final' } },
];

export function isGearUnlocked(item: GearItem, level: number, defeated: Set<string>): boolean {
  if ('start' in item.unlock) return true;
  if ('level' in item.unlock) return level >= item.unlock.level;
  return defeated.has(item.unlock.boss);
}

export function unlockText(item: GearItem, bossName: (id: string) => string): string {
  if ('start' in item.unlock) return 'Startausrüstung';
  if ('level' in item.unlock) return `Ab Level ${item.unlock.level}`;
  return `Boss: ${bossName(item.unlock.boss)}`;
}

/** Ausrüstung, die zwischen zwei Zuständen neu freigeschaltet wurde. */
export function newlyUnlocked(prevLevel: number, level: number, prevDefeated: Set<string>, defeated: Set<string>): GearItem[] {
  return GEAR.filter((g) => !isGearUnlocked(g, prevLevel, prevDefeated) && isGearUnlocked(g, level, defeated));
}
