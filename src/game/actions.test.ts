import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSettings, useTestDb } from '../db/db';
import * as A from './actions';
import { computeProgress } from './progress';

let n = 0;
async function setup() {
  const db = useTestDb(`test-${++n}`);
  await A.completeOnboarding({
    heroName: 'Test',
    avatar: { hair: 'kurz', hairColor: 'braun', beard: 'kein', skin: 'hell' },
    equipped: { outfit: 'outfit-standard', shoes: 'shoes-trail' },
    anchor: '2026-11-23',
    planStart: '2026-11-23',
    raceDate: '2027-04-17',
    initialLongRunKm: 10,
    aufbauStart: '2027-01-17',
    maxes: { pullups: 5, dips: 8, pushups: 10 },
    today: '2026-11-22',
  });
  return db;
}

describe('Spielaktionen (Integration)', () => {
  beforeEach(() => undefined);

  it('Onboarding erzeugt den kompletten Plan', async () => {
    const db = await setup();
    expect(await db.sessions.count()).toBeGreaterThan(150);
    expect((await getSettings())?.onboarded).toBe(true);
    expect(await db.sessions.where('kind').equals('race').count()).toBe(1);
  });

  it('Einheit abhaken gibt XP und besiegt Bosse', async () => {
    const db = await setup();
    const s = (await db.sessions.where('date').equals('2026-11-24').toArray())[0];
    const r = await A.completeSession(s.id!, { durationMin: 30, rpe: 3 });
    expect(r.xpGained).toBe(s.xp);
    const long = (await db.sessions.where('kind').equals('long').toArray())[0];
    const r2 = await A.completeSession(long.id!, { distanceKm: 16 });
    expect(r2.bosses).toContain('b15');
    expect(r2.gear.map((g) => g.id)).toContain('body-vest');
    const p = computeProgress(await db.sessions.toArray(), [], [], ['b15'], '2026-11-30');
    expect(p.xp).toBe(r.xpGained + r2.xpGained);
  });

  it('Krank-Modus: pausiert, kein XP-Verlust, Wiedereinstieg und Neuberechnung', async () => {
    const db = await setup();
    const first = (await db.sessions.where('date').equals('2026-11-24').toArray())[0];
    await A.completeSession(first.id!, {});
    await A.startSick('2027-01-20');
    const diff = await A.endSick('2027-01-30');
    const paused = await db.sessions.where('status').equals('paused').count();
    expect(paused).toBeGreaterThan(0);
    expect(diff.messages.join(' ')).toMatch(/10 Tag/);
    const after = await db.sessions.where('date').aboveOrEqual('2027-01-30').toArray();
    expect(after.some((s) => s.reentry)).toBe(true);
    expect(after.find((s) => s.kind === 'race')?.date).toBe('2027-04-17');
    const done = await db.sessions.where('status').equals('done').count();
    expect(done).toBe(1);
    expect((await getSettings())?.sick).toBeNull();
  });

  it('verpasster langer Lauf löst Neuberechnung aus', async () => {
    const db = await setup();
    const long = (await db.sessions.where('kind').equals('long').toArray()).find((s) => s.cycleNo === 8)!;
    const diff = await A.markMissed(long.id!, 'sonstiges');
    expect(diff).not.toBeNull();
    const next = (await db.sessions.where('kind').equals('long').toArray()).find((s) => s.cycleNo === 9)!;
    expect(next.distanceKm!).toBeLessThanOrEqual(long.distanceKm! + 0.5);
  });

  it('Zusatzschicht blockiert den Tag und verlegt Einheiten', async () => {
    const db = await setup();
    const diff = await A.addExtraShift('2026-12-17', '2026-12-10');
    const day = await db.sessions.where('date').equals('2026-12-17').toArray();
    expect(day.every((s) => s.type === 'Ruhe')).toBe(true);
    expect(diff).toBeDefined();
  });

  it('Backup: Export und Import ergeben denselben Stand', async () => {
    const db = await setup();
    const backup = await A.exportBackup();
    const json = JSON.parse(JSON.stringify(backup));
    const count = await db.sessions.count();
    await db.sessions.clear();
    await A.importBackup(json);
    expect(await db.sessions.count()).toBe(count);
    expect(A.validateBackup({ foo: 1 })).toBe(false);
  });

  it('Skill freischalten nur in Reihenfolge', async () => {
    await setup();
    expect(await A.unlockSkill('mu-pull8', '2026-12-01')).toBeNull();
    const r = await A.unlockSkill('mu-hang', '2026-12-01');
    expect(r?.xpGained).toBe(100);
  });
});
