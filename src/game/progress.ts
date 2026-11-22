/** Abgeleiteter Spielstand: XP, Level, Streak, Attribute – rein aus den Daten berechnet. */
import { attrLevel, attributePoints, ATTRS, type AttrId, type AttrLevel } from '../core/attributes';
import { addDays, type ISODate } from '../core/dates';
import { isGearUnlocked, GEAR, type GearItem } from '../core/gear';
import { computeStreak, type StreakInfo } from '../core/streak';
import type { Session } from '../core/types';
import { levelFromXp, XP_BOSS_BONUS, XP_SKILL_UNLOCK, type LevelInfo } from '../core/xp';
import type { MaxtestEntry } from '../db/db';
import type { Maxes } from '../plan/calisthenics';

export function totalXp(sessions: Session[], skillsUnlocked: number, bossesDefeated: number): number {
  const s = sessions.reduce((a, x) => a + (x.status === 'done' ? (x.xpAwarded ?? 0) : 0), 0);
  return s + skillsUnlocked * XP_SKILL_UNLOCK + bossesDefeated * XP_BOSS_BONUS;
}

export function latestMaxes(maxtests: MaxtestEntry[]): Maxes {
  const sorted = [...maxtests].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const m: Maxes = { pullups: 5, dips: 8, pushups: 10, flTuckSec: 0 };
  for (const e of sorted) {
    if (e.pullups !== undefined) m.pullups = e.pullups;
    if (e.dips !== undefined) m.dips = e.dips;
    if (e.pushups !== undefined) m.pushups = e.pushups;
    if (e.flTuckSec !== undefined) m.flTuckSec = e.flTuckSec;
  }
  return m;
}

export interface Progress {
  xp: number;
  level: LevelInfo;
  streak: StreakInfo;
  attrs: Record<AttrId, AttrLevel>;
  maxes: Maxes;
  unlockedGear: GearItem[];
}

export function computeProgress(
  sessions: Session[],
  maxtests: MaxtestEntry[],
  skillIds: string[],
  bossIds: string[],
  today: ISODate,
): Progress {
  const xp = totalXp(sessions, skillIds.length, bossIds.length);
  const level = levelFromXp(xp);
  const streak = computeStreak(sessions, today);
  const maxes = latestMaxes(maxtests);
  const pts = attributePoints({ sessions, latestMax: maxes, skillsUnlocked: skillIds.length, bestStreak: streak.best });
  const attrs = Object.fromEntries(ATTRS.map((a) => [a.id, attrLevel(a.id, pts[a.id])])) as Record<AttrId, AttrLevel>;
  const defeated = new Set(bossIds);
  const unlockedGear = GEAR.filter((g) => isGearUnlocked(g, level.level, defeated));
  return { xp, level, streak, attrs, maxes, unlockedGear };
}

/** Backup-Erinnerung: alle 7 Tage, sobald es echte Daten gibt. */
export function backupDue(lastBackupAt: string | undefined, snoozedAt: string | undefined, createdAt: string, today: ISODate): boolean {
  const last = [lastBackupAt, snoozedAt, createdAt].filter(Boolean).map((x) => x!.slice(0, 10)).sort().pop()!;
  return addDays(last, 7) <= today;
}
