import { describe, expect, it } from 'vitest';
import { buildCalendar } from '../core/cycle';
import type { Session } from '../core/types';
import { defaultAufbauStart, generatePlan, INITIAL_STATE, summarize } from './generator';
import { applyDetraining, deriveStartState, describeDiff, reentryForPause } from './reschedule';

const RACE = '2027-04-17';
const cal = buildCalendar('2026-11-23', RACE, '2026-11-23');
const aufbau = defaultAufbauStart(cal, RACE);
const base = generatePlan({ calendar: cal, fromDate: '2026-11-23', raceDate: RACE, aufbauStart: aufbau, startState: INITIAL_STATE(10) });

describe('Neuberechnung', () => {
  it('Wiedereinstieg hängt von der Pausendauer ab', () => {
    expect(reentryForPause(1).cycles).toHaveLength(0);
    expect(reentryForPause(5).cycles).toHaveLength(1);
    expect(reentryForPause(10).cycles).toHaveLength(2);
    expect(reentryForPause(40).cycles).toHaveLength(3);
    expect(reentryForPause(40).factor).toBeLessThan(reentryForPause(10).factor);
  });

  it('nach 10 Tagen Krankheit: reduzierte Last, Wiedereinstieg, Plan bis zum Renntag neu', () => {
    const from = '2027-02-01';
    const firstCycle = cal.find((d) => d.date === from)!.cycleNo;
    const start = deriveStartState(base.cycles, base.sessions, firstCycle, INITIAL_STATE(10));
    const rule = reentryForPause(10);
    const out = generatePlan({
      calendar: cal,
      fromDate: from,
      raceDate: RACE,
      aufbauStart: aufbau,
      startState: applyDetraining(start, rule.factor),
      reentryFactors: rule.cycles,
    });
    expect(out.sessions[0].date).toBe(from);
    expect(out.cycles[0].mode).toBe('reentry');
    expect(out.cycles[1].mode).toBe('reentry');
    expect(out.sessions.some((s) => s.reentry)).toBe(true);
    expect(out.sessions.find((s) => s.kind === 'race')?.date).toBe(RACE);
    const oldFuture = base.sessions.filter((s) => s.date >= from);
    const before = summarize(oldFuture);
    const after = summarize(out.sessions);
    expect(after.totalKm).toBeLessThan(before.totalKm);
    const diff = describeDiff(before, after, out.dropped);
    expect(diff.messages.length).toBeGreaterThan(0);
  });

  it('nach langer Krankheit im Peak meldet die App ehrlich, dass es eng wird', () => {
    const from = '2027-03-25';
    const firstCycle = cal.find((d) => d.date === from)!.cycleNo;
    const start = deriveStartState(base.cycles, base.sessions, firstCycle, INITIAL_STATE(10));
    const rule = reentryForPause(30);
    const out = generatePlan({ calendar: cal, fromDate: from, raceDate: RACE, aufbauStart: aufbau, startState: applyDetraining(start, rule.factor), reentryFactors: rule.cycles });
    const before = summarize(base.sessions);
    const diff = describeDiff(before, summarize(out.sessions), out.dropped);
    expect(diff.tight).toBe(true);
    expect(diff.messages.join(' ')).toMatch(/eng/);
  });

  it('verpasster langer Lauf: keine weitere Steigerung', () => {
    const c = base.cycles.find((x) => x.cycleNo === 8)!;
    const sessions: Session[] = base.sessions.map((s) => (s.cycleNo === 8 && s.kind === 'long' ? { ...s, status: 'missed' } : s));
    const st = deriveStartState(base.cycles, sessions, 9, INITIAL_STATE(10));
    expect(st.longRunKm).toBeLessThan(c.state.longRunKm);
    const ok = deriveStartState(base.cycles, base.sessions, 9, INITIAL_STATE(10));
    expect(ok.longRunKm).toBe(c.state.longRunKm);
  });

  it('Neuberechnung ohne Änderung ist deterministisch', () => {
    const from = '2027-01-10';
    const firstCycle = cal.find((d) => d.date === from)!.cycleNo;
    const start = deriveStartState(base.cycles, base.sessions, firstCycle, INITIAL_STATE(10));
    const out = generatePlan({ calendar: cal, fromDate: from, raceDate: RACE, aufbauStart: aufbau, startState: start });
    const oldFuture = base.sessions.filter((s) => s.date >= from);
    expect(out.sessions.map((s) => s.title)).toEqual(oldFuture.map((s) => s.title));
  });
});
