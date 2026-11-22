import { addDays, diffDays, mod, type ISODate } from './dates';

/**
 * Schichtzyklus: 5-Tage-Block, der sich wiederholt.
 *  1 = Tagschicht 07–19 · 2 = frei bis 19 Uhr, dann Nacht · 3 = nach Nachtschicht
 *  4 = frei · 5 = frei
 */
export type CycleDay = 1 | 2 | 3 | 4 | 5;

export const CYCLE_DAY_INFO: Record<CycleDay, { label: string; work: string; capacity: DayCapacity }> = {
  1: { label: 'Tagschicht', work: 'Tagschicht 07–19 Uhr', capacity: 'minimal' },
  2: { label: 'Vor Nachtschicht', work: 'Frei bis 19 Uhr, dann Nachtschicht', capacity: 'light' },
  3: { label: 'Nach Nachtschicht', work: 'Ausschlafen, Rest frei', capacity: 'recovery' },
  4: { label: 'Frei', work: 'Ganzer Tag frei', capacity: 'full' },
  5: { label: 'Frei', work: 'Ganzer Tag frei', capacity: 'full' },
};

export type DayCapacity = 'minimal' | 'light' | 'recovery' | 'full';

/** Ab `from` ist der Rhythmus um `days` Tage verschoben (+ = später, − = früher). */
export interface ShiftAdjustment {
  id: string;
  from: ISODate;
  days: number;
  note?: string;
}

export interface CalendarDay {
  date: ISODate;
  cycleNo: number; // Zyklus 1 = der Zyklus, in dem der Plan startet
  cycleDay: CycleDay;
  blocked: boolean; // Zusatzschicht o. ä.: kein Training möglich
}

/** Zyklustag für ein Datum, gegeben den Anker (ein Datum mit Tag 1) und Verschiebungen. */
export function cycleDayFor(date: ISODate, anchor: ISODate, adjustments: ShiftAdjustment[] = []): CycleDay {
  const offset = adjustments.filter((a) => a.from <= date).reduce((s, a) => s + a.days, 0);
  return (mod(diffDays(anchor, date) - offset, 5) + 1) as CycleDay;
}

/**
 * Baut den Kalender vom Planstart bis einschließlich Renntag.
 * Ein neuer Zyklus beginnt mit jeder Tagschicht (Tag 1). Durch Verschiebungen
 * wiederholte Tage (z. B. 4, 5, 4, 5) bleiben im selben Zyklus und werden zu
 * zusätzlichen freien Tagen – der Plan rückt nach, statt Einheiten zu doppeln.
 */
export function buildCalendar(
  planStart: ISODate,
  raceDate: ISODate,
  anchor: ISODate,
  adjustments: ShiftAdjustment[] = [],
  blockedDates: ISODate[] = [],
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const blocked = new Set(blockedDates);
  const n = diffDays(planStart, raceDate);
  let cycleNo = 1;
  let prev: CycleDay | null = null;
  for (let i = 0; i <= n; i++) {
    const date = addDays(planStart, i);
    const cycleDay = cycleDayFor(date, anchor, adjustments);
    if (prev !== null && cycleDay === 1 && prev !== 1) cycleNo++;
    days.push({ date, cycleNo, cycleDay, blocked: blocked.has(date) });
    prev = cycleDay;
  }
  return days;
}

export interface CalendarCycle {
  cycleNo: number;
  days: CalendarDay[];
  startDate: ISODate;
}

export function groupCycles(cal: CalendarDay[]): CalendarCycle[] {
  const out: CalendarCycle[] = [];
  for (const d of cal) {
    let c = out[out.length - 1];
    if (!c || c.cycleNo !== d.cycleNo) {
      c = { cycleNo: d.cycleNo, days: [], startDate: d.date };
      out.push(c);
    }
    c.days.push(d);
  }
  return out;
}

export function findDay(cal: CalendarDay[], date: ISODate): CalendarDay | undefined {
  return cal.find((d) => d.date === date);
}
