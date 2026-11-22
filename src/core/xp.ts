import type { SessionType } from './types';

/** XP, die man braucht, um von `level` auf `level + 1` zu kommen. LV 1 → 200, LV 3 → 400. */
export function xpToNext(level: number): number {
  return 100 + 100 * level;
}

export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}

export interface LevelInfo {
  level: number;
  into: number; // XP im aktuellen Level
  needed: number; // XP bis zum nächsten Level (gesamt für dieses Level)
  total: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level), total: Math.max(0, Math.floor(totalXp)) };
}

const TITLES: [number, string][] = [
  [1, 'Anwärter'],
  [2, 'Wanderer'],
  [3, 'Trailläufer'],
  [4, 'Pfadsucher'],
  [5, 'Hügelstürmer'],
  [6, 'Waldläufer'],
  [7, 'Höhenjäger'],
  [8, 'Gratwanderer'],
  [9, 'Bergläufer'],
  [10, 'Gipfelstürmer'],
  [11, 'Nebelwanderer'],
  [12, 'Pfadhüter'],
  [13, 'Ultraläufer'],
  [14, 'Bergseele'],
  [15, 'Legende vom Engelmar'],
];

export function titleForLevel(level: number): string {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}

const XP_PER_MIN: Record<SessionType, number> = {
  Lauf: 1.0,
  Höhenmeter: 1.3,
  Kraft: 1.0,
  Calisthenics: 1.1,
  Mobility: 0.6,
  Ruhe: 0.5,
};

export function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

/** XP-Wert einer Einheit nach Typ und Dauer. */
export function xpFor(type: SessionType, durationMin: number): number {
  return Math.max(10, round5(durationMin * XP_PER_MIN[type]));
}

export const XP_BOSS_BONUS = 150;
export const XP_SKILL_UNLOCK = 100;
/** Ersetzt man eine Einheit wegen roter Energie durch Erholung, gibt es die halben XP. */
export const SWAP_XP_FACTOR = 0.5;

export function awardedXp(plannedXp: number, swapped: boolean): number {
  return swapped ? Math.max(10, round5(plannedXp * SWAP_XP_FACTOR)) : plannedXp;
}
