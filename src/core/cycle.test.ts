import { describe, expect, it } from 'vitest';
import { buildCalendar, cycleDayFor, groupCycles } from './cycle';
import { addDays, diffDays } from './dates';

describe('Zyklusberechnung', () => {
  it('rechnet Zyklustage ab dem Anker, auch rückwärts', () => {
    expect(cycleDayFor('2026-11-23', '2026-11-23')).toBe(1);
    expect(cycleDayFor('2026-11-27', '2026-11-23')).toBe(5);
    expect(cycleDayFor('2026-11-28', '2026-11-23')).toBe(1);
    expect(cycleDayFor('2026-11-22', '2026-11-23')).toBe(5);
    expect(cycleDayFor('2026-11-19', '2026-11-23')).toBe(2);
  });

  it('ist robust über die Zeitumstellung (März)', () => {
    expect(diffDays('2027-03-27', '2027-03-29')).toBe(2);
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29');
    expect(cycleDayFor('2027-03-29', '2026-11-23')).toBe(((126 % 5) + 1) as number);
  });

  it('erzeugt ~29 Zyklen vom Planstart bis zum Renntag', () => {
    const cal = buildCalendar('2026-11-23', '2027-04-17', '2026-11-23');
    expect(cal).toHaveLength(146);
    expect(cal[0]).toMatchObject({ cycleNo: 1, cycleDay: 1 });
    const cycles = groupCycles(cal);
    expect(cycles.length).toBe(30); // 29 volle Zyklen + Renntag beginnt Zyklus 30
    expect(cal[cal.length - 1]).toMatchObject({ date: '2027-04-17', cycleNo: 30, cycleDay: 1 });
  });

  it('beginnt mit Teilzyklus, wenn der Planstart nicht auf Tag 1 fällt', () => {
    const cal = buildCalendar('2026-11-23', '2026-12-10', '2026-11-21'); // 23.11. = Tag 3
    expect(cal[0]).toMatchObject({ cycleNo: 1, cycleDay: 3 });
    expect(cal[3]).toMatchObject({ date: '2026-11-26', cycleNo: 2, cycleDay: 1 });
  });

  it('verschiebt den Rhythmus ab einem Datum (Schichttausch +2 Tage)', () => {
    const adj = [{ id: 'a', from: '2026-12-01', days: 2 }];
    // ohne Verschiebung: 1.12. = Tag 4 (Anker 23.11.)
    expect(cycleDayFor('2026-12-01', '2026-11-23')).toBe(4);
    expect(cycleDayFor('2026-12-01', '2026-11-23', adj)).toBe(2);
    const cal = buildCalendar('2026-11-23', '2026-12-10', '2026-11-23', adj);
    const days = cal.map((d) => d.cycleDay).join('');
    // 23.–30.11.: 1234512 3 | ab 1.12.: 2 3 4 5 1 …  → Tage 2,3 werden wiederholt, Zyklus wird länger
    expect(days.startsWith('12345123' + '2345')).toBe(true);
    const c2 = groupCycles(cal)[1];
    expect(c2.days.length).toBe(7);
  });

  it('markiert Zusatzschichten als blockiert', () => {
    const cal = buildCalendar('2026-11-23', '2026-12-01', '2026-11-23', [], ['2026-11-27']);
    expect(cal.find((d) => d.date === '2026-11-27')?.blocked).toBe(true);
  });
});
