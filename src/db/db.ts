import Dexie, { type Table } from 'dexie';
import type { ShiftAdjustment } from '../core/cycle';
import type { ISODate } from '../core/dates';
import type { GearSlot } from '../core/gear';
import type { CycleRecord, Session } from '../core/types';
import type { RecoveryEntry } from '../core/whoop';
import type { PlanDiff } from '../plan/reschedule';

export interface AvatarConfig {
  hair: string;
  hairColor: string;
  beard: string;
  skin: string;
}

export interface Settings {
  key: 'settings';
  onboarded: boolean;
  disclaimerAccepted: boolean;
  heroName: string;
  avatar: AvatarConfig;
  equipped: Partial<Record<GearSlot, string | null>>;
  planStart: ISODate;
  raceDate: ISODate;
  raceTime: string;
  anchor: ISODate; // ein Datum, an dem Zyklustag 1 ist
  aufbauStart: ISODate;
  initialLongRunKm: number;
  shiftAdjustments: ShiftAdjustment[];
  blockedDates: ISODate[];
  sick: { since: ISODate; note?: string } | null;
  sickHistory: { from: ISODate; to: ISODate }[];
  lastBackupAt?: string;
  backupSnoozedAt?: string;
  createdAt: string;
}

export interface MaxtestEntry {
  id?: number;
  date: ISODate;
  pullups?: number;
  dips?: number;
  pushups?: number;
  flTuckSec?: number;
  weightKg?: number;
}

export interface SkillUnlock {
  nodeId: string;
  date: ISODate;
}

export interface BossDefeat {
  bossId: string;
  date: ISODate;
}

export interface PlanEvent {
  id?: number;
  date: ISODate;
  at: string;
  title: string;
  diff?: PlanDiff;
}

export class SoulQuestDB extends Dexie {
  kv!: Table<Settings, string>;
  sessions!: Table<Session, number>;
  cycles!: Table<CycleRecord, number>;
  recovery!: Table<RecoveryEntry, string>;
  maxtests!: Table<MaxtestEntry, number>;
  skills!: Table<SkillUnlock, string>;
  bosses!: Table<BossDefeat, string>;
  planEvents!: Table<PlanEvent, number>;

  constructor(name = 'soul-quest') {
    super(name);
    this.version(1).stores({
      kv: 'key',
      sessions: '++id, date, cycleNo, status, kind',
      cycles: 'cycleNo',
      recovery: 'date',
      maxtests: '++id, date',
      skills: 'nodeId',
      bosses: 'bossId',
      planEvents: '++id, date',
    });
  }
}

export let db = new SoulQuestDB();

/** Nur für Tests: eigene Datenbank verwenden. */
export function useTestDb(name: string) {
  db = new SoulQuestDB(name);
  return db;
}

export const DEFAULT_SETTINGS: Omit<Settings, 'createdAt'> = {
  key: 'settings',
  onboarded: false,
  disclaimerAccepted: false,
  heroName: 'Held',
  avatar: { hair: 'kurz', hairColor: 'dunkelbraun', beard: 'kein', skin: 'hell' },
  equipped: { outfit: 'outfit-standard', shoes: 'shoes-trail' },
  planStart: '2026-11-23',
  raceDate: '2027-04-17',
  raceTime: '08:30',
  anchor: '2026-11-23',
  aufbauStart: '2027-01-17',
  initialLongRunKm: 10,
  shiftAdjustments: [],
  blockedDates: [],
  sick: null,
  sickHistory: [],
};

export async function getSettings(): Promise<Settings | undefined> {
  return db.kv.get('settings');
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = (await getSettings()) ?? { ...DEFAULT_SETTINGS, createdAt: new Date().toISOString() };
  const next = { ...cur, ...patch, key: 'settings' as const };
  await db.kv.put(next);
  return next;
}
