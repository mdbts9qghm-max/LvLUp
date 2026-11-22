import { describe, expect, it } from 'vitest';
import { buildCalendar } from '../core/cycle';
import { diffDays } from '../core/dates';
import { defaultAufbauStart, generatePlan, INITIAL_STATE, summarize } from './generator';

const RACE = '2027-04-17';
function plan(anchor = '2026-11-23', blocked: string[] = []) {
  const cal = buildCalendar('2026-11-23', RACE, anchor, [], blocked);
  const aufbau = defaultAufbauStart(cal, RACE);
  return { cal, aufbau, out: generatePlan({ calendar: cal, fromDate: '2026-11-23', raceDate: RACE, aufbauStart: aufbau, startState: INITIAL_STATE(10) }) };
}

describe('Plan-Generator', () => {
  it('legt Phasen in der richtigen Reihenfolge an', () => {
    const { out, aufbau } = plan();
    const phases = out.cycles.map((c) => c.phase);
    expect(phases[0]).toBe('wiedereinstieg');
    expect(phases[1]).toBe('wiedereinstieg');
    const order = ['wiedereinstieg', 'grundlage', 'aufbau', 'peak', 'taper'];
    for (let i = 1; i < phases.length; i++) expect(order.indexOf(phases[i])).toBeGreaterThanOrEqual(order.indexOf(phases[i - 1]));
    expect(phases.filter((p) => p === 'peak')).toHaveLength(3);
    expect(aufbau >= '2027-01-05' && aufbau <= '2027-01-25').toBe(true);
  });

  it('steigert den langen Lauf um max. ~10 % pro Zyklus und entlastet regelmäßig', () => {
    const { out } = plan();
    const builds = out.cycles.filter((c) => c.mode === 'build');
    for (let i = 1; i < builds.length; i++) {
      const prev = builds[i - 1].state.longRunKm;
      expect(builds[i].state.longRunKm).toBeLessThanOrEqual(Math.max(prev * 1.1, prev + 1) + 0.01);
    }
    // höchstens 3 Aufbauzyklen in Folge vor einer Entlastung (außer Peak)
    let run = 0;
    for (const c of out.cycles) {
      if (c.mode === 'build' && c.phase !== 'peak') run++;
      else run = 0;
      expect(run).toBeLessThanOrEqual(3);
    }
    expect(out.cycles.some((c) => c.mode === 'deload')).toBe(true);
  });

  it('erreicht im Peak einen langen Lauf von 30–38 km bzw. max. 5 h', () => {
    const { out } = plan();
    const sum = summarize(out.sessions);
    expect(sum.peakLongKm).toBeGreaterThanOrEqual(30);
    expect(sum.peakLongKm).toBeLessThanOrEqual(38);
    const longest = out.sessions.filter((s) => s.kind === 'long').sort((a, b) => b.durationMin - a.durationMin)[0];
    expect(longest.durationMin).toBeLessThanOrEqual(305);
    expect(longest.phase).toBe('peak');
    expect(longest.title).toContain('Längster Lauf');
  });

  it('plant Grundlage von ~10 auf ~20 km', () => {
    const { out } = plan();
    const g = out.cycles.filter((c) => c.phase === 'grundlage' && c.mode === 'build');
    expect(g[0].longRunKm).toBeGreaterThanOrEqual(10);
    expect(g[0].longRunKm).toBeLessThanOrEqual(12);
    expect(g[g.length - 1].longRunKm).toBeGreaterThanOrEqual(17);
    expect(g[g.length - 1].longRunKm).toBeLessThanOrEqual(20);
  });

  it('legt keine schweren Beineinheiten auf den Tag vor dem langen Lauf', () => {
    const { out } = plan();
    for (const s of out.sessions.filter((x) => x.kind === 'legs-eccentric')) {
      const next = out.sessions.filter((x) => diffDays(s.date, x.date) === 1);
      expect(next.some((x) => x.kind === 'long')).toBe(false);
    }
  });

  it('respektiert Tag 1 (Tagschicht) und Tag 2 (nur leicht)', () => {
    const { out } = plan();
    for (const s of out.sessions) {
      if (s.cycleDay === 1 && s.kind !== 'race') expect(s.type).toBe('Ruhe');
      if (s.cycleDay === 2) expect(['long', 'vert-steady', 'vert-intervals']).not.toContain(s.kind);
    }
  });

  it('endet mit dem Final Boss am Renntag und einer ruhigen Rennwoche', () => {
    const { out } = plan();
    const race = out.sessions.find((s) => s.kind === 'race');
    expect(race?.date).toBe(RACE);
    const last6 = out.sessions.filter((s) => diffDays(s.date, RACE) >= 1 && diffDays(s.date, RACE) <= 6);
    expect(last6.every((s) => (s.distanceKm ?? 0) <= 11)).toBe(true);
    const longInTaper = out.sessions.filter((s) => s.kind === 'long' && diffDays(s.date, RACE) <= 6);
    expect(longInTaper).toHaveLength(0);
  });

  it('enthält Maxtests alle 4 Zyklen und Calisthenics im Peak nur als Erhalt', () => {
    const { out } = plan();
    const mt = out.sessions.filter((s) => s.kind === 'maxtest');
    expect(mt.length).toBeGreaterThanOrEqual(5);
    expect(out.sessions.filter((s) => s.phase === 'peak' && s.kind === 'cali-main')).toHaveLength(0);
  });

  it('funktioniert mit beliebigem Anker (Renntag an einem freien Tag)', () => {
    for (const anchor of ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']) {
      const { out } = plan(anchor);
      expect(out.sessions.find((s) => s.kind === 'race')?.date).toBe(RACE);
      expect(summarize(out.sessions).peakLongKm).toBeGreaterThanOrEqual(28);
    }
  });

  it('verlegt den langen Lauf bei Zusatzschicht an Tag 5 auf Tag 4', () => {
    const blocked = '2026-12-17'; // Zyklus 4, Tag 5 (Anker 23.11.)
    const { out } = plan('2026-11-23', [blocked]);
    const c = out.sessions.filter((s) => s.cycleNo === 5);
    const day5 = c.filter((s) => s.date === blocked);
    expect(day5.every((s) => s.type === 'Ruhe')).toBe(true);
    const long = c.find((s) => s.kind === 'long');
    expect(long?.cycleDay).toBe(4);
    expect(out.dropped.length).toBeGreaterThan(0); // die Tag-4-Laufeinheit wurde verdrängt
  });
});
