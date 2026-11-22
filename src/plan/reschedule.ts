/**
 * Neuberechnung: Wiedereinstieg nach Krankheit, verpasste Einheiten, Schichtverschiebungen.
 * Reine Funktionen; die Datenbank-Seite steckt in game/actions.ts.
 */
import type { CycleRecord, LoadState, Session } from '../core/types';
import type { PlanSummary, DroppedSession } from './generator';
import { fmtKm } from './templates';

export interface ReentryRule {
  factor: number; // Abschlag auf die Kapazität (Trainingsverlust)
  cycles: number[]; // Lastfaktoren der Wiedereinstiegs-Zyklen
  label: string;
}

/** Wiedereinstieg abhängig von der Pausendauer (Tage). */
export function reentryForPause(pauseDays: number): ReentryRule {
  if (pauseDays <= 2) return { factor: 1, cycles: [], label: 'Kurze Pause: Plan läuft normal weiter.' };
  if (pauseDays <= 6) return { factor: 0.9, cycles: [0.75], label: '1 Zyklus Wiedereinstieg mit ca. 75 % Last.' };
  if (pauseDays <= 13) return { factor: 0.8, cycles: [0.6, 0.85], label: '2 Zyklen Wiedereinstieg (60 % → 85 % Last).' };
  if (pauseDays <= 27) return { factor: 0.7, cycles: [0.6, 0.8], label: '2 Zyklen Wiedereinstieg (60 % → 80 % Last), Kapazität −30 %.' };
  return { factor: 0.6, cycles: [0.5, 0.65, 0.8], label: '3 Zyklen Wiedereinstieg (50 % → 80 % Last), Kapazität −40 %.' };
}

/**
 * Startzustand für eine Neuberechnung ab Zyklus `firstCycleNo`.
 * Wurde der letzte lange Lauf verpasst/pausiert, wird nicht weiter gesteigert:
 * wir nehmen den Zustand des davorliegenden Zyklus (max. 2 Zyklen zurück).
 * Nicht eingetragene Einheiten zählen als erledigt – Vergessen wird nicht bestraft.
 */
export function deriveStartState(
  cycles: CycleRecord[],
  sessions: Session[],
  firstCycleNo: number,
  initial: LoadState,
): LoadState {
  const prev = cycles.filter((c) => c.cycleNo < firstCycleNo).sort((a, b) => b.cycleNo - a.cycleNo);
  if (prev.length === 0) return { ...initial };
  for (let i = 0; i < Math.min(3, prev.length); i++) {
    const c = prev[i];
    const lr = sessions.find((s) => s.cycleNo === c.cycleNo && s.kind === 'long');
    const failed = lr && (lr.status === 'missed' || lr.status === 'paused');
    if (!failed || i === 2) {
      // Der Entlastungszähler läuft vom jüngsten Zyklus weiter
      return { ...c.state, buildsSinceDeload: prev[0].state.buildsSinceDeload };
    }
  }
  return { ...prev[prev.length - 1].state };
}

export function applyDetraining(state: LoadState, factor: number): LoadState {
  if (factor >= 1) return { ...state };
  return {
    longRunKm: Math.max(5, state.longRunKm * factor),
    vertSessionM: state.vertSessionM * factor,
    vertLongM: state.vertLongM * factor,
    buildsSinceDeload: 0,
  };
}

export interface PlanDiff {
  before: PlanSummary;
  after: PlanSummary;
  dropped: DroppedSession[];
  messages: string[];
  tight: boolean; // Ziel wird eng
}

const TIGHT_LONG_KM = 28;

export function describeDiff(before: PlanSummary, after: PlanSummary, dropped: DroppedSession[], extra: string[] = []): PlanDiff {
  const messages = [...extra];
  if (Math.abs(before.peakLongKm - after.peakLongKm) >= 0.5) {
    messages.push(`Längster Lauf im Plan: vorher ${fmtKm(before.peakLongKm)} km → jetzt ${fmtKm(after.peakLongKm)} km.`);
  }
  const dKm = after.totalKm - before.totalKm;
  if (Math.abs(dKm) >= 5) messages.push(`Restliches Laufvolumen: ${before.totalKm} km → ${after.totalKm} km (${dKm > 0 ? '+' : ''}${dKm} km).`);
  const dHm = after.totalHm - before.totalHm;
  if (Math.abs(dHm) >= 200) messages.push(`Restliche Höhenmeter: ${before.totalHm} hm → ${after.totalHm} hm.`);
  if (dropped.length) messages.push(`${dropped.length} Einheit(en) gestrichen bzw. verdrängt (Details unten).`);
  const tight = after.peakLongKm > 0 && after.peakLongKm < TIGHT_LONG_KM;
  if (tight) {
    messages.push(
      `Ehrlich gesagt: Mit ${fmtKm(after.peakLongKm)} km als längstem Lauf wird es eng. Das Ziel "gesund finishen" ist trotzdem machbar, wenn du im Rennen konsequent alle Anstiege gehst, früh isst und das Tempo der ersten 20 km bewusst niedrig hältst.`,
    );
  }
  if (messages.length === 0) messages.push('Keine nennenswerten Änderungen am restlichen Plan.');
  return { before, after, dropped, messages, tight };
}
