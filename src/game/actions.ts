/**
 * Alle schreibenden Aktionen. Verbindet Datenbank mit Plan- und Spiel-Logik.
 */
import { bossesDefeatedByMaxtest, bossesDefeatedBySession, bossesDefeatedBySkill } from '../core/bosses';
import { buildCalendar, type ShiftAdjustment } from '../core/cycle';
import { addDays, diffDays, type ISODate } from '../core/dates';
import { newlyUnlocked, type GearItem } from '../core/gear';
import type { MissReason, Session, SessionLog } from '../core/types';
import type { RecoveryEntry } from '../core/whoop';
import { awardedXp, levelFromXp } from '../core/xp';
import { db, getSettings, saveSettings, type MaxtestEntry, type Settings } from '../db/db';
import { generatePlan, INITIAL_STATE, summarize } from '../plan/generator';
import { applyDetraining, deriveStartState, describeDiff, reentryForPause, type PlanDiff } from '../plan/reschedule';
import { canUnlock } from '../plan/skills';
import { totalXp } from './progress';

/** Erhöhen, wenn sich die Plan-Vorlagen ändern: Bestehende Pläne werden dann ab heute neu erzeugt. */
export const PLAN_VERSION = 2;

async function requireSettings(): Promise<Settings> {
  const s = await getSettings();
  if (!s) throw new Error('Keine Einstellungen – Onboarding fehlt.');
  return s;
}

function calendarFor(s: Settings) {
  return buildCalendar(s.planStart, s.raceDate, s.anchor, s.shiftAdjustments, s.blockedDates);
}

// ---------------------------------------------------------------- Plan erzeugen / neu berechnen

export interface RegenOptions {
  title: string;
  detrainFactor?: number;
  reentry?: number[];
  messages?: string[];
}

export async function regenerate(requestedFrom: ISODate, opts: RegenOptions): Promise<PlanDiff> {
  const s = await requireSettings();
  const cal = calendarFor(s);
  let from = requestedFrom < s.planStart ? s.planStart : requestedFrom;
  if (from > s.raceDate) from = s.raceDate;
  // Tage mit bereits erledigten/abgeschlossenen Einheiten nicht überplanen
  for (let guard = 0; guard < 3; guard++) {
    const closed = await db.sessions.where('date').equals(from).filter((x) => x.status !== 'open').count();
    if (closed === 0 || from >= s.raceDate) break;
    from = addDays(from, 1);
  }
  const fromDay = cal.find((d) => d.date === from);
  const firstCycleNo = fromDay?.cycleNo ?? 1;

  const [allSessions, cycles] = await Promise.all([db.sessions.toArray(), db.cycles.toArray()]);
  let start = deriveStartState(cycles, allSessions, firstCycleNo, INITIAL_STATE(s.initialLongRunKm));
  if (opts.detrainFactor !== undefined) start = applyDetraining(start, opts.detrainFactor);

  const out = generatePlan({
    calendar: cal,
    fromDate: from,
    raceDate: s.raceDate,
    aufbauStart: s.aufbauStart,
    startState: start,
    reentryFactors: opts.reentry,
  });

  const oldFuture = allSessions.filter((x) => x.date >= from && x.status === 'open');
  const diff = describeDiff(summarize(oldFuture), summarize(out.sessions), out.dropped, opts.messages);

  await db.transaction('rw', db.sessions, db.cycles, db.planEvents, async () => {
    await db.sessions.bulkDelete(oldFuture.map((x) => x.id!));
    await db.sessions.bulkAdd(out.sessions);
    await db.cycles.where('cycleNo').aboveOrEqual(firstCycleNo).delete();
    await db.cycles.bulkPut(out.cycles);
    await db.planEvents.add({ date: from, at: new Date().toISOString(), title: opts.title, diff: oldFuture.length ? diff : undefined });
  });
  return diff;
}

export interface OnboardingInput {
  heroName: string;
  avatar: Settings['avatar'];
  equipped: Settings['equipped'];
  anchor: ISODate;
  planStart: ISODate;
  raceDate: ISODate;
  initialLongRunKm: number;
  aufbauStart: ISODate;
  maxes: { pullups: number; dips: number; pushups: number; flTuckSec?: number; weightKg?: number };
  today: ISODate;
}

export async function completeOnboarding(i: OnboardingInput): Promise<void> {
  await db.transaction('rw', [db.kv, db.sessions, db.cycles, db.maxtests, db.planEvents], async () => {
    await db.sessions.clear();
    await db.cycles.clear();
    await db.planEvents.clear();
    await saveSettings({
      heroName: i.heroName,
      avatar: i.avatar,
      equipped: i.equipped,
      anchor: i.anchor,
      planStart: i.planStart,
      raceDate: i.raceDate,
      initialLongRunKm: i.initialLongRunKm,
      aufbauStart: i.aufbauStart,
      disclaimerAccepted: true,
    });
    await db.maxtests.add({ date: i.today, ...i.maxes });
  });
  await regenerate(i.planStart, { title: 'Plan erstellt' });
  await saveSettings({ onboarded: true, planVersion: PLAN_VERSION });
}

/** Bringt einen gespeicherten Plan auf die aktuelle Vorlagen-Version. Erledigtes bleibt unangetastet. */
export async function migratePlan(today: ISODate): Promise<boolean> {
  const s = await getSettings();
  if (!s?.onboarded || (s.planVersion ?? 1) >= PLAN_VERSION) return false;
  await regenerate(today, { title: 'Plan aktualisiert: Krafteinheiten zusammengefasst, max. 2 Einheiten pro Tag' });
  await saveSettings({ planVersion: PLAN_VERSION });
  return true;
}

// ---------------------------------------------------------------- Belohnungen

export interface Reward {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  bosses: string[];
  gear: GearItem[];
}

async function snapshot() {
  const [sessions, skills, bosses] = await Promise.all([db.sessions.toArray(), db.skills.toArray(), db.bosses.toArray()]);
  const xp = totalXp(sessions, skills.length, bosses.length);
  return { xp, level: levelFromXp(xp).level, defeated: new Set(bosses.map((b) => b.bossId)) };
}

async function rewardSince(before: Awaited<ReturnType<typeof snapshot>>, newBosses: string[]): Promise<Reward> {
  const after = await snapshot();
  return {
    xpGained: after.xp - before.xp,
    levelBefore: before.level,
    levelAfter: after.level,
    bosses: newBosses,
    gear: newlyUnlocked(before.level, after.level, before.defeated, after.defeated),
  };
}

async function defeat(ids: string[], date: ISODate) {
  for (const id of ids) await db.bosses.put({ bossId: id, date });
}

// ---------------------------------------------------------------- Einheiten

export async function completeSession(id: number, log: SessionLog, opts: { swapped?: boolean } = {}): Promise<Reward> {
  const before = await snapshot();
  const sess = await db.sessions.get(id);
  if (!sess) throw new Error('Einheit nicht gefunden');
  const updated: Session = {
    ...sess,
    status: 'done',
    swapped: opts.swapped || undefined,
    log,
    xpAwarded: awardedXp(sess.xp, !!opts.swapped),
    completedAt: new Date().toISOString(),
  };
  const bossIds = opts.swapped ? [] : bossesDefeatedBySession(updated, before.defeated);
  await db.transaction('rw', db.sessions, db.bosses, async () => {
    await db.sessions.put(updated);
    await defeat(bossIds, sess.date);
  });
  return rewardSince(before, bossIds);
}

/** Rückgängig machen (z. B. versehentlich abgehakt). XP werden wieder abgezogen. */
export async function reopenSession(id: number): Promise<void> {
  const sess = await db.sessions.get(id);
  if (!sess) return;
  await db.sessions.put({ ...sess, status: 'open', log: undefined, xpAwarded: undefined, completedAt: undefined, swapped: undefined, missReason: undefined });
}

const KEY_KINDS = new Set(['long', 'vert-steady', 'vert-intervals']);

export async function markMissed(id: number, reason: MissReason): Promise<PlanDiff | null> {
  const sess = await db.sessions.get(id);
  if (!sess) return null;
  await db.sessions.put({ ...sess, status: 'missed', missReason: reason });
  if (KEY_KINDS.has(sess.kind)) {
    return regenerate(addDays(sess.date, 1), {
      title: `Verpasst: ${sess.title}`,
      messages: ['Der Plan steigert nicht weiter, solange die Schlüsseleinheit fehlt, und baut von deinem letzten erledigten Stand aus weiter auf.'],
    });
  }
  return null;
}

// ---------------------------------------------------------------- Krank-Modus

export async function startSick(date: ISODate, note?: string): Promise<void> {
  await saveSettings({ sick: { since: date, note } });
}

export async function endSick(today: ISODate): Promise<PlanDiff> {
  const s = await requireSettings();
  if (!s.sick) throw new Error('Nicht krank');
  const since = s.sick.since;
  const pauseDays = Math.max(0, diffDays(since, today));
  const open = await db.sessions.where('date').between(since, today, true, false).filter((x) => x.status === 'open').toArray();
  await db.sessions.bulkPut(open.map((x) => ({ ...x, status: 'paused' as const })));
  await saveSettings({ sick: null, sickHistory: [...s.sickHistory, { from: since, to: today }] });
  const rule = reentryForPause(pauseDays);
  return regenerate(today, {
    title: `Wieder gesund nach ${pauseDays} Tag(en)`,
    detrainFactor: rule.factor,
    reentry: rule.cycles,
    messages: [`Pause: ${pauseDays} Tag(e). ${rule.label}`, 'Kein XP-Verlust, dein Streak war eingefroren.'],
  });
}

// ---------------------------------------------------------------- Schicht-Änderungen

export async function addExtraShift(date: ISODate, today: ISODate): Promise<PlanDiff> {
  const s = await requireSettings();
  if (!s.blockedDates.includes(date)) await saveSettings({ blockedDates: [...s.blockedDates, date].sort() });
  const open = await db.sessions.where('date').equals(date).filter((x) => x.status === 'open').toArray();
  // Bereits verstrichene Einheiten an dem Tag als "verpasst (Zusatzschicht)" markieren
  if (date < today) await db.sessions.bulkPut(open.map((x) => ({ ...x, status: 'missed' as const, missReason: 'zusatzschicht' as const })));
  return regenerate(date < today ? today : date, { title: `Zusatzschicht am ${date}` });
}

export async function removeExtraShift(date: ISODate, today: ISODate): Promise<PlanDiff> {
  const s = await requireSettings();
  await saveSettings({ blockedDates: s.blockedDates.filter((d) => d !== date) });
  return regenerate(date < today ? today : date, { title: `Zusatzschicht am ${date} entfernt` });
}

export async function addShiftAdjustment(from: ISODate, days: number, today: ISODate, note?: string): Promise<PlanDiff> {
  const s = await requireSettings();
  const adj: ShiftAdjustment = { id: `${Date.now()}`, from, days, note };
  await saveSettings({ shiftAdjustments: [...s.shiftAdjustments, adj] });
  return regenerate(from < today ? today : from, {
    title: `Zyklus ab ${from} um ${days > 0 ? '+' : ''}${days} Tag(e) verschoben`,
  });
}

export async function removeShiftAdjustment(id: string, today: ISODate): Promise<PlanDiff> {
  const s = await requireSettings();
  const adj = s.shiftAdjustments.find((a) => a.id === id);
  await saveSettings({ shiftAdjustments: s.shiftAdjustments.filter((a) => a.id !== id) });
  const from = adj && adj.from > today ? adj.from : today;
  return regenerate(from, { title: 'Zyklus-Verschiebung entfernt' });
}

// ---------------------------------------------------------------- Erholung, Maxtests, Skills

export async function saveRecovery(e: RecoveryEntry): Promise<void> {
  const prev = await db.recovery.get(e.date);
  await db.recovery.put({ ...prev, ...e });
}

export async function importRecovery(entries: RecoveryEntry[]): Promise<number> {
  await db.transaction('rw', db.recovery, async () => {
    for (const e of entries) {
      const prev = await db.recovery.get(e.date);
      await db.recovery.put({ ...prev, ...e });
    }
  });
  return entries.length;
}

export async function saveMaxtest(entry: MaxtestEntry, sessionId?: number): Promise<Reward> {
  const before = await snapshot();
  const bossIds = bossesDefeatedByMaxtest(entry, before.defeated);
  await db.transaction('rw', db.maxtests, db.bosses, db.sessions, async () => {
    await db.maxtests.add(entry);
    await defeat(bossIds, entry.date);
    if (sessionId !== undefined) {
      const sess = await db.sessions.get(sessionId);
      if (sess)
        await db.sessions.put({
          ...sess,
          status: 'done',
          xpAwarded: sess.xp,
          completedAt: new Date().toISOString(),
          log: { note: `Klimmzüge ${entry.pullups ?? '–'} · Dips ${entry.dips ?? '–'} · Liegestütze ${entry.pushups ?? '–'} · Tuck FL ${entry.flTuckSec ?? '–'} s` },
        });
    }
  });
  return rewardSince(before, bossIds);
}

export async function unlockSkill(nodeId: string, date: ISODate): Promise<Reward | null> {
  const unlocked = new Set((await db.skills.toArray()).map((x) => x.nodeId));
  if (!canUnlock(nodeId, unlocked)) return null;
  const before = await snapshot();
  const bossIds = bossesDefeatedBySkill(nodeId, before.defeated);
  await db.transaction('rw', db.skills, db.bosses, async () => {
    await db.skills.put({ nodeId, date });
    await defeat(bossIds, date);
  });
  return rewardSince(before, bossIds);
}

export async function relockSkill(nodeId: string): Promise<void> {
  await db.skills.delete(nodeId);
}

// ---------------------------------------------------------------- Backup

export interface BackupFile {
  app: 'soul-quest';
  version: 1;
  exportedAt: string;
  data: {
    settings: Settings | undefined;
    sessions: Session[];
    cycles: unknown[];
    recovery: unknown[];
    maxtests: unknown[];
    skills: unknown[];
    bosses: unknown[];
    planEvents: unknown[];
  };
}

export async function exportBackup(): Promise<BackupFile> {
  const [settings, sessions, cycles, recovery, maxtests, skills, bosses, planEvents] = await Promise.all([
    getSettings(),
    db.sessions.toArray(),
    db.cycles.toArray(),
    db.recovery.toArray(),
    db.maxtests.toArray(),
    db.skills.toArray(),
    db.bosses.toArray(),
    db.planEvents.toArray(),
  ]);
  return { app: 'soul-quest', version: 1, exportedAt: new Date().toISOString(), data: { settings, sessions, cycles, recovery, maxtests, skills, bosses, planEvents } };
}

export function validateBackup(x: unknown): x is BackupFile {
  const b = x as BackupFile;
  return !!b && b.app === 'soul-quest' && b.version === 1 && !!b.data && Array.isArray(b.data.sessions);
}

export async function importBackup(file: BackupFile): Promise<void> {
  if (!validateBackup(file)) throw new Error('Das ist keine gültige Soul-Quest-Sicherung.');
  const d = file.data;
  await db.transaction('rw', [db.kv, db.sessions, db.cycles, db.recovery, db.maxtests, db.skills, db.bosses, db.planEvents], async () => {
    await Promise.all([db.kv.clear(), db.sessions.clear(), db.cycles.clear(), db.recovery.clear(), db.maxtests.clear(), db.skills.clear(), db.bosses.clear(), db.planEvents.clear()]);
    if (d.settings) await db.kv.put(d.settings);
    await db.sessions.bulkAdd(d.sessions);
    await db.cycles.bulkAdd(d.cycles as never[]);
    await db.recovery.bulkAdd(d.recovery as never[]);
    await db.maxtests.bulkAdd(d.maxtests as never[]);
    await db.skills.bulkAdd(d.skills as never[]);
    await db.bosses.bulkAdd(d.bosses as never[]);
    await db.planEvents.bulkAdd(d.planEvents as never[]);
  });
}

export async function markBackupDone(): Promise<void> {
  await saveSettings({ lastBackupAt: new Date().toISOString() });
}

export async function resetAll(): Promise<void> {
  await db.delete();
  await db.open();
}
