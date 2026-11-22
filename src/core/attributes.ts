/** Die fünf Attribute des Helden. Jedes wächst aus echten Trainingsdaten. */
import type { Session } from './types';

export type AttrId = 'ausdauer' | 'klettern' | 'kraft' | 'technik' | 'willenskraft';

export interface AttrInfo {
  id: AttrId;
  name: string;
  color: string;
  source: string;
}

export const ATTRS: AttrInfo[] = [
  { id: 'ausdauer', name: 'Ausdauer', color: '#4FA36A', source: 'Gelaufene Kilometer und Zeit auf den Beinen' },
  { id: 'klettern', name: 'Klettern', color: '#9C8FC4', source: 'Gesammelte Höhenmeter' },
  { id: 'kraft', name: 'Kraft', color: '#D9783A', source: 'Krafteinheiten und Maxtest-Werte' },
  { id: 'technik', name: 'Technik', color: '#6FA3C8', source: 'Freigeschaltete Skill-Stufen und Skill-Training' },
  { id: 'willenskraft', name: 'Willenskraft', color: '#E9A23B', source: 'Konstanz: erledigte Einheiten und bester Streak' },
];

/** Punkte pro Level-Schritt (Level = 1 + floor(sqrt(Punkte / k))). */
const K: Record<AttrId, number> = { ausdauer: 6, klettern: 2, kraft: 4, technik: 3, willenskraft: 3 };

export interface AttrInput {
  sessions: Session[];
  latestMax?: { pullups?: number; dips?: number; pushups?: number; flTuckSec?: number };
  skillsUnlocked: number;
  bestStreak: number;
}

export function attributePoints(i: AttrInput): Record<AttrId, number> {
  let km = 0;
  let hm = 0;
  let minutesRun = 0;
  let strength = 0;
  let skill = 0;
  let done = 0;
  for (const s of i.sessions) {
    if (s.status !== 'done') continue;
    done++;
    const dist = s.log?.distanceKm ?? s.distanceKm ?? 0;
    const elev = s.log?.elevationM ?? s.elevationM ?? 0;
    const dur = s.log?.durationMin ?? s.durationMin;
    if (s.type === 'Lauf' || s.type === 'Höhenmeter') {
      km += s.swapped ? 0 : dist;
      minutesRun += s.swapped ? 0 : dur;
    }
    hm += s.swapped ? 0 : elev;
    if (s.type === 'Kraft' || s.kind === 'cali-main' || s.kind === 'cali-maint') strength++;
    if (s.type === 'Calisthenics') skill++;
  }
  const m = i.latestMax ?? {};
  return {
    ausdauer: km + minutesRun / 30,
    klettern: hm / 100,
    kraft: strength * 2 + (m.pullups ?? 0) * 2 + (m.dips ?? 0) + (m.pushups ?? 0) / 2,
    technik: i.skillsUnlocked * 8 + skill + (m.flTuckSec ?? 0) / 2,
    willenskraft: done + i.bestStreak * 2,
  };
}

export interface AttrLevel {
  level: number;
  progress: number; // 0..1 bis zum nächsten Level
  points: number;
}

export function attrLevel(id: AttrId, points: number): AttrLevel {
  const k = K[id];
  const level = 1 + Math.floor(Math.sqrt(Math.max(0, points) / k));
  const cur = k * (level - 1) ** 2;
  const next = k * level ** 2;
  return { level, progress: (points - cur) / (next - cur), points };
}
