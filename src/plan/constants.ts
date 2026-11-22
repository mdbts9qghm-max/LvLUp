import type { PhaseId } from '../core/types';

/** Lockeres Dauerlauftempo in min/km (konservative Annahme, siehe docs/trainingsplan.md). */
export const EASY_PACE_MIN_PER_KM = 6.5;
/** Zuschlag für Höhenmeter: 1 Minute pro 15 hm (Laufband-Steigung/Powerhiking). */
export const CLIMB_M_PER_MIN = 15;
/** Höhenmeter pro Stunde auf dem Laufband (10–15 %) bzw. Stairmaster im Gehen. */
export const VERT_M_PER_HOUR = 500;

/** Maximale Steigerung des langen Laufs pro Aufbauzyklus. */
export const GROWTH_PER_CYCLE = 0.1;
/** Mindestschritt, damit es bei kleinen Distanzen vorangeht. */
export const MIN_GROWTH_KM = 1;
/** Entlastungszyklus nach so vielen Aufbauzyklen. */
export const BUILDS_BEFORE_DELOAD = 3;
/** Umfang im Entlastungszyklus relativ zur Kapazität. */
export const DELOAD_FACTOR = 0.7;

export const PHASE_CAPS: Record<PhaseId, { longKm: number; longMaxMin: number; vertSessionM: number; vertLongM: number }> = {
  wiedereinstieg: { longKm: 10, longMaxMin: 75, vertSessionM: 0, vertLongM: 0 },
  grundlage: { longKm: 20, longMaxMin: 150, vertSessionM: 150, vertLongM: 100 },
  aufbau: { longKm: 30, longMaxMin: 240, vertSessionM: 900, vertLongM: 1000 },
  peak: { longKm: 38, longMaxMin: 300, vertSessionM: 1100, vertLongM: 1500 },
  taper: { longKm: 20, longMaxMin: 150, vertSessionM: 400, vertLongM: 600 },
};

/** Faktoren für die zwei Wiedereinstiegs-Zyklen zu Planbeginn (nach der Erkältung). */
export const INITIAL_REENTRY = [0.6, 0.8];

/** Taper: alle Zyklen, die in den letzten 11 Tagen vor dem Rennen beginnen. */
export const TAPER_DAYS = 11;
export const PEAK_CYCLES = 3;

/** Maxtest in jedem n-ten Zyklus. */
export const MAXTEST_EVERY = 4;

export const PHASE_INFO: Record<PhaseId, { name: string; world: number; worldName: string }> = {
  wiedereinstieg: { name: 'Wiedereinstieg', world: 1, worldName: 'FLACHLAND' },
  grundlage: { name: 'Grundlage', world: 2, worldName: 'HÜGELLAND' },
  aufbau: { name: 'Höhe & Aufbau', world: 3, worldName: 'HOCHWALD' },
  peak: { name: 'Peak', world: 4, worldName: 'GRATPFAD' },
  taper: { name: 'Taper', world: 5, worldName: 'RUHELAGER' },
};
