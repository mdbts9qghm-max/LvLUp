import { describe, expect, it } from 'vitest';
import { computeStreak } from './streak';
import type { Session } from './types';

let id = 0;
const s = (date: string, status: Session['status'], extra: Partial<Session> = {}): Session => ({
  id: ++id, date, cycleNo: 1, cycleDay: 4, phase: 'grundlage', order: 0, kind: 'easy', type: 'Lauf', title: 'x',
  durationMin: 30, instruction: '', why: '', xp: 30, optional: false, status, ...extra,
});

describe('Streak', () => {
  it('zählt erledigte geplante Einheiten, Ruhetage brechen nichts', () => {
    const r = computeStreak([s('2026-12-01', 'done'), s('2026-12-02', 'open', { type: 'Ruhe', kind: 'rest' }), s('2026-12-03', 'done')], '2026-12-03');
    expect(r.current).toBe(2);
  });
  it('Krankheit (pausiert) und Zusatzschicht frieren ein', () => {
    const r = computeStreak([s('2026-12-01', 'done'), s('2026-12-02', 'paused'), s('2026-12-03', 'missed', { missReason: 'zusatzschicht' }), s('2026-12-04', 'done')], '2026-12-04');
    expect(r.current).toBe(2);
  });
  it('verpasst aus sonstigem Grund bricht den Streak', () => {
    const r = computeStreak([s('2026-12-01', 'done'), s('2026-12-02', 'done'), s('2026-12-03', 'missed', { missReason: 'sonstiges' }), s('2026-12-04', 'done')], '2026-12-04');
    expect(r).toEqual({ current: 1, best: 2 });
  });
  it('nicht eingetragene Einheiten: 2 Tage Zeit zum Nachtragen', () => {
    const list = [s('2026-12-01', 'done'), s('2026-12-02', 'open')];
    expect(computeStreak(list, '2026-12-03').current).toBe(1);
    expect(computeStreak(list, '2026-12-05').current).toBe(0);
  });
  it('optionale Einheiten zählen nicht', () => {
    expect(computeStreak([s('2026-12-01', 'open', { optional: true })], '2026-12-10').current).toBe(0);
    expect(computeStreak([s('2026-12-01', 'done'), s('2026-12-01', 'open', { optional: true, order: 1 })], '2026-12-10').current).toBe(1);
  });
});
