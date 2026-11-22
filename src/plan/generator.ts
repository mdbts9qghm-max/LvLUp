/**
 * Plan-Generator: erzeugt aus Kalender (Schichtzyklen), Startzustand und Renntag
 * alle Einheiten ab einem Datum. Reine Funktion – testbar, ohne Datenbank.
 */
import { addDays, diffDays, type ISODate } from '../core/dates';
import { CYCLE_DAY_INFO, groupCycles, type CalendarCycle, type CalendarDay, type DayCapacity } from '../core/cycle';
import type { CycleRecord, LoadState, PhaseId, Session } from '../core/types';
import {
  BUILDS_BEFORE_DELOAD,
  CLIMB_M_PER_MIN,
  DELOAD_FACTOR,
  EASY_PACE_MIN_PER_KM,
  GROWTH_PER_CYCLE,
  INITIAL_REENTRY,
  MAXTEST_EVERY,
  MIN_GROWTH_KM,
  PEAK_CYCLES,
  PHASE_CAPS,
  TAPER_DAYS,
} from './constants';
import * as T from './templates';
import type { Draft, Needs } from './templates';

export interface GenerateInput {
  calendar: CalendarDay[]; // kompletter Kalender Planstart..Renntag
  fromDate: ISODate; // ab hier (inklusive) wird geplant
  raceDate: ISODate;
  aufbauStart: ISODate; // Grenze Grundlage → Höhe & Aufbau (fix seit Onboarding)
  startState: LoadState; // Zustand vor dem ersten geplanten Zyklus
  reentryFactors?: number[]; // zusätzlicher Wiedereinstieg (z. B. nach Krankheit)
}

export interface DroppedSession {
  date: ISODate;
  title: string;
  reason: string;
}

export interface GenerateOutput {
  sessions: Session[];
  cycles: CycleRecord[];
  dropped: DroppedSession[];
}

export const INITIAL_STATE = (longRunKm = 10): LoadState => ({
  longRunKm: Math.min(20, Math.max(5, longRunKm)),
  vertSessionM: 0,
  vertLongM: 0,
  buildsSinceDeload: 0,
});

/** Phase je Zyklus. Taper und Peak hängen am Renntag, Wiedereinstieg am Planstart. */
export function assignPhases(cycles: CalendarCycle[], raceDate: ISODate, aufbauStart: ISODate): PhaseId[] {
  const taperFrom = addDays(raceDate, -TAPER_DAYS);
  const phases: PhaseId[] = cycles.map((c) => (c.startDate < aufbauStart ? 'grundlage' : 'aufbau'));
  let firstTaper = cycles.length;
  for (let i = cycles.length - 1; i >= 0; i--) {
    if (cycles[i].startDate >= taperFrom || i === cycles.length - 1) {
      phases[i] = 'taper';
      firstTaper = i;
    } else break;
  }
  for (let i = firstTaper - 1; i >= Math.max(0, firstTaper - PEAK_CYCLES); i--) phases[i] = 'peak';
  for (let i = 0; i < Math.min(2, firstTaper); i++) if (cycles[i].cycleNo <= 2 && phases[i] !== 'peak') phases[i] = 'wiedereinstieg';
  return phases;
}

/** Standard-Grenze Grundlage/Aufbau: ~41 % der Zyklen zwischen Wiedereinstieg und Peak sind Grundlage. */
export function defaultAufbauStart(calendar: CalendarDay[], raceDate: ISODate): ISODate {
  const cycles = groupCycles(calendar);
  const phases = assignPhases(cycles, raceDate, '9999-12-31');
  const middle = cycles.filter((_, i) => phases[i] === 'grundlage');
  if (middle.length === 0) return raceDate;
  const nGrund = Math.round(middle.length * 0.41);
  return middle[Math.min(middle.length - 1, nGrund)].startDate;
}

function longTimeCapKm(phase: PhaseId, hm: number): number {
  const maxMin = PHASE_CAPS[phase].longMaxMin;
  return (maxMin - hm / CLIMB_M_PER_MIN) / EASY_PACE_MIN_PER_KM;
}

function grow(value: number, cap: number, rate = GROWTH_PER_CYCLE, minStep = MIN_GROWTH_KM): number {
  if (value >= cap) return value;
  return Math.min(cap, Math.max(value * (1 + rate), value + minStep));
}

const CAPACITY_OK: Record<Needs, DayCapacity[]> = {
  any: ['minimal', 'light', 'recovery', 'full'],
  light: ['light', 'recovery', 'full'],
  full: ['full'],
};

interface CyclePlan {
  phase: PhaseId;
  mode: CycleRecord['mode'];
  longKm: number;
  longHm: number;
  vertM: number;
  reentryStage?: number;
  stateAfter: LoadState;
}

export function generatePlan(input: GenerateInput): GenerateOutput {
  const { calendar, fromDate, raceDate, aufbauStart } = input;
  const cycles = groupCycles(calendar);
  const phases = assignPhases(cycles, raceDate, aufbauStart);
  const reentry = [...(input.reentryFactors ?? [])];
  let s: LoadState = { ...input.startState };

  const sessions: Session[] = [];
  const records: CycleRecord[] = [];
  const dropped: DroppedSession[] = [];

  const taperIdx = phases.indexOf('taper');
  const taperCount = taperIdx >= 0 ? phases.length - taperIdx : 0;

  for (let ci = 0; ci < cycles.length; ci++) {
    const cycle = cycles[ci];
    const lastDate = cycle.days[cycle.days.length - 1].date;
    if (lastDate < fromDate) continue;
    const phase = phases[ci];
    const nextPhase = phases[ci + 1];

    // ---------- Lastprogression
    let plan: CyclePlan;
    if (phase === 'taper') {
      const isRace = ci === cycles.length - 1;
      const taperPos = ci - taperIdx; // 0, 1, …
      const f = taperCount - 1 > 1 ? [0.6, 0.45][Math.min(1, taperPos)] : 0.5;
      plan = {
        phase,
        mode: isRace ? 'race' : 'taper',
        longKm: T.roundHalf(s.longRunKm * f),
        longHm: T.round50(s.vertLongM * 0.4),
        vertM: 0,
        stateAfter: { ...s },
      };
    } else if (reentry.length > 0 || phase === 'wiedereinstieg') {
      const f = reentry.length > 0 ? reentry.shift()! : INITIAL_REENTRY[Math.min(1, cycle.cycleNo - 1)];
      s = { ...s, buildsSinceDeload: 0 };
      plan = {
        phase,
        mode: 'reentry',
        longKm: T.roundHalf(s.longRunKm * f),
        longHm: T.round50(s.vertLongM * f * 0.5),
        vertM: T.round50(s.vertSessionM * f * 0.6),
        reentryStage: f < 0.7 ? 0 : f < 0.85 ? 1 : 2,
        stateAfter: { ...s },
      };
    } else if (
      phase !== 'peak' &&
      (s.buildsSinceDeload >= BUILDS_BEFORE_DELOAD || (nextPhase === 'peak' && s.buildsSinceDeload >= 2))
    ) {
      s = { ...s, buildsSinceDeload: 0 };
      plan = {
        phase,
        mode: 'deload',
        longKm: T.roundHalf(s.longRunKm * DELOAD_FACTOR),
        longHm: T.round50(s.vertLongM * 0.6),
        vertM: T.round50(s.vertSessionM * 0.6),
        stateAfter: { ...s },
      };
    } else {
      const caps = PHASE_CAPS[phase];
      let vertLong = s.vertLongM;
      let vertSession = s.vertSessionM;
      if (phase === 'aufbau' || phase === 'peak') {
        vertLong = vertLong < 200 ? 200 : grow(vertLong, caps.vertLongM, 0.15, 50);
        vertSession = vertSession < 300 ? 300 : grow(vertSession, caps.vertSessionM, 0.1, 50);
      }
      const capKm = Math.min(caps.longKm, longTimeCapKm(phase, vertLong));
      const L = s.longRunKm >= capKm ? s.longRunKm : grow(s.longRunKm, capKm);
      s = { longRunKm: L, vertLongM: vertLong, vertSessionM: vertSession, buildsSinceDeload: s.buildsSinceDeload + 1 };
      plan = {
        phase,
        mode: 'build',
        // letzter Peak-Zyklus vor dem Taper: etwas kürzer, damit der längste Lauf ~2 Wochen vor dem Rennen liegt
        longKm: T.roundHalf(Math.min(L, longTimeCapKm(phase, vertLong)) * (phase === 'peak' && nextPhase === 'taper' ? 0.8 : 1)),
        longHm: T.round50(vertLong),
        vertM: vertSession,
        stateAfter: { ...s },
      };
    }

    records.push({
      cycleNo: cycle.cycleNo,
      startDate: cycle.startDate,
      phase,
      mode: plan.mode,
      state: plan.stateAfter,
      longRunKm: plan.longKm,
    });

    // ---------- Einheiten des Zyklus
    if (plan.mode !== 'race') {
      const drafts = buildDrafts(plan, cycle.cycleNo);
      placeDrafts(drafts, cycle, fromDate, phase, plan.mode === 'reentry' && phase !== 'wiedereinstieg', sessions, dropped, ci === cycles.length - 1);
    }
    if (phase === 'taper') {
      // Rennwoche: die letzten 6 Tage folgen festen Regeln, unabhängig vom Zyklus
      for (const day of cycle.days) {
        if (day.date < fromDate) continue;
        const toRace = diffDays(day.date, raceDate);
        if (toRace > RACE_WEEK_DAYS) continue;
        for (let k = sessions.length - 1; k >= 0; k--) if (sessions[k].date === day.date) sessions.splice(k, 1);
        sessions.push(toSession(raceWeekDraft(day, toRace, s.longRunKm), day, phase, false));
      }
    }
  }

  markPeakHighlights(sessions);
  sessions.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  return { sessions, cycles: records, dropped };
}

function buildDrafts(plan: CyclePlan, cycleNo: number): Draft[] {
  const { phase, mode, longKm, longHm, vertM } = plan;
  const deload = mode === 'deload';
  const drafts: Draft[] = [T.restDay(1), T.recoveryDay(3)];
  const odd = cycleNo % 2 === 1;
  const isMaxtest = cycleNo % MAXTEST_EVERY === 0 && mode !== 'reentry' && phase !== 'taper';

  if (mode === 'reentry') {
    const st = plan.reentryStage ?? 0;
    drafts.push(T.runWalk(2, 0, Math.max(3, longKm * 0.5), st));
    drafts.push(T.runWalk(4, 0, Math.max(4, longKm * 0.65), st));
    drafts.push(T.caliMain(4, 1, true, true));
    drafts.push(st >= 2 ? T.longRun(5, { km: longKm, hm: longHm, phase, deload: false, backToBack: false, tripSuggestion: false }) : T.runWalk(5, 0, longKm, st, true));
    return drafts;
  }

  switch (phase) {
    case 'grundlage': {
      drafts.push(T.easyRun(2, 0, clamp(longKm * 0.35, 4, 8), phase));
      drafts.push(T.caliSkill(2, 1));
      drafts.push(odd ? T.stridesRun(4, 0, clamp(longKm * 0.45, 5, 9)) : T.hillIntro(4, 0, clamp(longKm * 0.45, 5, 9)));
      drafts.push(isMaxtest ? T.maxtest(4, 1) : T.caliMain(4, 1, deload, !deload));
      drafts.push(T.longRun(5, { km: longKm, hm: longHm, phase, deload, backToBack: false, tripSuggestion: false }));
      break;
    }
    case 'aufbau': {
      if (odd || deload) {
        drafts.push(T.easyRun(2, 0, clamp(longKm * 0.3, 5, 9), phase));
        drafts.push(T.caliSkill(2, 1));
      } else {
        drafts.push(T.legsEccentric(2, 0, Math.floor(cycleNo / 4)));
      }
      drafts.push(T.vertSession(4, vertM, odd ? 'intervals' : 'steady', phase, deload));
      drafts.push(isMaxtest ? T.maxtest(4, 1) : T.caliMain(4, 1, false));
      drafts.push(T.longRun(5, { km: longKm, hm: longHm, phase, deload, backToBack: !deload, tripSuggestion: false }));
      break;
    }
    case 'peak': {
      if (odd) {
        drafts.push(T.easyRun(2, 0, clamp(longKm * 0.25, 6, 9), phase));
        drafts.push(T.caliSkill(2, 1));
      } else {
        drafts.push(T.legsMaint(2, 0));
      }
      drafts.push(T.vertSession(4, vertM, 'steady', phase, false));
      drafts.push(isMaxtest ? T.maxtest(4, 1) : T.caliMaint(4, 1));
      drafts.push(T.longRun(5, { km: longKm, hm: longHm, phase, deload: false, backToBack: true, tripSuggestion: false }));
      break;
    }
    case 'taper': {
      drafts.push(T.easyRun(2, 0, clamp(longKm * 0.4, 5, 7), phase));
      drafts.push(T.taperSharpen(4, 0, 40));
      drafts.push(T.caliMaint(4, 1));
      drafts.push(T.longRun(5, { km: longKm, hm: longHm, phase, deload: false, backToBack: false, tripSuggestion: false }));
      break;
    }
    default:
      break;
  }
  return drafts;
}

const RACE_WEEK_DAYS = 6;
/** Höchstens so viele Einheiten an einem Tag. */
export const MAX_PER_DAY = 2;

function raceWeekDraft(day: CalendarDay, toRace: number, capacityKm: number): Draft {
  if (toRace === 0) return T.raceDay(day.cycleDay);
  if (toRace === 1) return T.racePrep(day.cycleDay);
  if (day.blocked) return T.restDay(day.cycleDay, 'Zusatzschicht – Ruhetag');
  if (day.cycleDay === 1) return T.restDay(1);
  if (day.cycleDay === 3 || toRace === 3 || toRace === 5) return T.recoveryDay(day.cycleDay, day.cycleDay !== 3);
  if (toRace === 2) return T.taperSharpen(day.cycleDay, 0, 20);
  if (toRace === 4) return T.taperSharpen(day.cycleDay, 0, 35);
  // 6 Tage vorher: letzter etwas längerer, lockerer Lauf
  return T.easyRun(day.cycleDay, 0, clamp(capacityKm * 0.3, 7, 11), 'taper');
}

/** Markiert im Peak den längsten Lauf und empfiehlt für die zwei längsten einen Ausflug ins Gelände. */
function markPeakHighlights(sessions: Session[]) {
  const peakLongs = sessions.filter((x) => x.phase === 'peak' && x.kind === 'long').sort((a, b) => b.durationMin - a.durationMin);
  peakLongs.slice(0, 2).forEach((x, i) => {
    if (i === 0) {
      x.title = x.title.replace('Langer Lauf', 'Längster Lauf');
      x.why = 'Dein längster Lauf vor dem Rennen. Zeit auf den Beinen zählt mehr als Tempo. Danach geht es bergab in den Taper.';
    }
    x.instruction +=
      ' Empfehlung: Diesen Lauf wenn möglich in echtem Gelände machen, z. B. Wochenendausflug in den Bayerischen Wald (Sankt Engelmar, Pröller, Hirschenstein).';
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function toSession(dr: Draft, day: CalendarDay, phase: PhaseId, reentry: boolean): Session {
  return {
    date: day.date,
    cycleNo: day.cycleNo,
    cycleDay: day.cycleDay,
    phase,
    reentry: reentry || undefined,
    order: dr.order,
    kind: dr.kind,
    type: dr.type,
    title: dr.title,
    durationMin: dr.durationMin,
    distanceKm: dr.distanceKm,
    elevationM: dr.elevationM,
    instruction: dr.instruction,
    why: dr.why,
    xp: dr.xp,
    optional: dr.optional,
    legs: dr.legs,
    status: 'open',
  };
}

/**
 * Verteilt die Entwürfe eines Zyklus auf die echten Tage.
 * - Natürlicher Tag vorhanden & frei → dort.
 * - Natürlicher Tag liegt in der Vergangenheit → entfällt (kein "Streichen").
 * - Natürlicher Tag blockiert/fehlt → wichtige Einheiten weichen auf einen anderen freien Tag aus
 *   und verdrängen dort weniger wichtige Einheiten. Was nicht passt, wird ehrlich als gestrichen gemeldet.
 */
function placeDrafts(
  drafts: Draft[],
  cycle: CalendarCycle,
  fromDate: ISODate,
  phase: PhaseId,
  reentryFlag: boolean,
  out: Session[],
  dropped: DroppedSession[],
  isLastCycle = false,
) {
  const placed = new Map<ISODate, Draft[]>();
  const usedNatural = new Set<ISODate>();
  const relocated = new Set<Draft>();
  const sorted = [...drafts].sort((a, b) => b.priority - a.priority);
  const firstOfType = (cd: number) => cycle.days.find((x) => x.cycleDay === cd);

  for (const dr of sorted) {
    const natural = firstOfType(dr.day);
    if (natural && natural.date < fromDate) continue; // Vergangenheit
    // Teilzyklus am Planstart (beginnt nach diesem Tag) oder am Renntag (endet davor): einfach entfallen lassen
    if (!natural && (cycle.days[0].cycleDay > dr.day || isLastCycle)) continue;
    const isLoad = (e: Draft) => e.type === 'Lauf' || e.type === 'Höhenmeter' || e.kind.startsWith('legs');
    const occupied = natural && isLoad(dr) && (placed.get(natural.date) ?? []).some((e) => relocated.has(e) && isLoad(e) && e.priority > dr.priority);
    if (natural && !natural.blocked && !occupied) {
      push(placed, natural.date, dr);
      usedNatural.add(natural.date);
      continue;
    }
    const reasonDay = occupied
      ? `Platz für verlegte Schlüsseleinheit`
      : natural
        ? `Zusatzschicht am ${natural.date}`
        : 'Zyklus verkürzt';
    if (!dr.relocatable || dr.optional) {
      if (!dr.optional && dr.kind !== 'rest' && dr.kind !== 'recovery')
        dropped.push({ date: natural?.date ?? cycle.startDate, title: dr.title, reason: reasonDay });
      continue;
    }
    // Ausweichtag suchen: freie Tage zuerst, die noch keine gleich wichtige Einheit haben
    const candidates = cycle.days
      .filter((x) => x.date >= fromDate && !x.blocked && CAPACITY_OK[dr.needs].includes(CYCLE_DAY_INFO[x.cycleDay].capacity))
      .sort((a, b) => rankDay(b, dr) - rankDay(a, dr));
    let target: CalendarDay | undefined;
    for (const c of candidates) {
      const existing = placed.get(c.date) ?? [];
      const conflict = existing.filter(isLoad);
      if (conflict.every((e) => e.priority < dr.priority)) {
        target = c;
        break;
      }
    }
    if (!target) {
      dropped.push({ date: natural?.date ?? cycle.startDate, title: dr.title, reason: reasonDay });
      continue;
    }
    const existing = placed.get(target.date) ?? [];
    const keep: Draft[] = [];
    for (const e of existing) {
      if (isLoad(e) && e.priority < dr.priority) {
        dropped.push({ date: target.date, title: e.title, reason: `verdrängt durch ${dr.title}` });
      } else if (e.kind === 'recovery' || e.kind === 'rest') {
        // Erholungsplatzhalter weicht
      } else keep.push(e);
    }
    const moved = { ...dr, order: dr.kind.startsWith('cali') || dr.kind === 'maxtest' ? 1 : 0 };
    relocated.add(moved);
    keep.push(moved);
    placed.set(target.date, keep);
  }

  for (const day of cycle.days) {
    if (day.date < fromDate) continue;
    let list = placed.get(day.date) ?? [];
    if (day.blocked) {
      list = [T.restDay(day.cycleDay, 'Zusatzschicht – Ruhetag')];
    } else if (list.length === 0) {
      list = [day.cycleDay === 1 ? T.restDay(1) : T.recoveryDay(day.cycleDay, usedNatural.has(day.date) || day.cycleDay !== 3)];
    }
    if (list.length > MAX_PER_DAY) {
      // Obergrenze: höchstens zwei Einheiten pro Tag – Pflicht vor optional, wichtig vor weniger wichtig
      const keep = [...list].sort((a, b) => Number(a.optional) - Number(b.optional) || b.priority - a.priority).slice(0, MAX_PER_DAY);
      for (const e of list) if (!keep.includes(e) && !e.optional) dropped.push({ date: day.date, title: e.title, reason: 'max. 2 Einheiten pro Tag' });
      list = keep;
    }
    list.sort((a, b) => a.order - b.order).forEach((dr, i) => out.push(toSession({ ...dr, order: i }, day, phase, reentryFlag)));
  }
}

function rankDay(day: CalendarDay, dr: Draft): number {
  const cap = CYCLE_DAY_INFO[day.cycleDay].capacity;
  let r = cap === 'full' ? 3 : cap === 'light' ? 2 : cap === 'recovery' ? 1 : 0;
  if (dr.needs !== 'full' && cap === 'full') r = 1.5; // leichte Einheiten nicht auf die Haupttage drängen
  return r;
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

// ---------------------------------------------------------------- Zusammenfassung

export interface PlanSummary {
  peakLongKm: number;
  peakLongHm: number;
  totalKm: number;
  totalHm: number;
  sessions: number;
}

export function summarize(sessions: Session[]): PlanSummary {
  let peakLongKm = 0;
  let peakLongHm = 0;
  let totalKm = 0;
  let totalHm = 0;
  let n = 0;
  for (const s of sessions) {
    if (s.kind === 'race') continue;
    if (!s.optional && s.type !== 'Ruhe') n++;
    if (s.distanceKm && (s.type === 'Lauf' || s.type === 'Höhenmeter')) totalKm += s.distanceKm;
    if (s.elevationM) totalHm += s.elevationM;
    if (s.kind === 'long' && (s.distanceKm ?? 0) > peakLongKm) {
      peakLongKm = s.distanceKm ?? 0;
      peakLongHm = s.elevationM ?? 0;
    }
  }
  return { peakLongKm, peakLongHm, totalKm: Math.round(totalKm), totalHm: Math.round(totalHm), sessions: n };
}
