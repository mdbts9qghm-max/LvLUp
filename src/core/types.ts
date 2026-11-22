import type { CycleDay } from './cycle';
import type { ISODate } from './dates';

export type SessionType = 'Lauf' | 'Höhenmeter' | 'Kraft' | 'Calisthenics' | 'Mobility' | 'Ruhe';

export type PhaseId = 'wiedereinstieg' | 'grundlage' | 'aufbau' | 'peak' | 'taper';

export type SessionKind =
  | 'rest'
  | 'recovery'
  | 'runwalk'
  | 'easy'
  | 'strides'
  | 'hillintro'
  | 'long'
  | 'vert-steady'
  | 'vert-intervals'
  | 'legs-basic'
  | 'legs-eccentric'
  | 'legs-maint'
  | 'cali-main'
  | 'cali-maint'
  | 'cali-skill'
  | 'maxtest'
  | 'taper-sharpen'
  | 'race-prep'
  | 'race';

export type SessionStatus = 'open' | 'done' | 'missed' | 'paused';

export type MissReason = 'zusatzschicht' | 'krank' | 'sonstiges';

export interface SessionLog {
  distanceKm?: number;
  elevationM?: number;
  durationMin?: number;
  avgHr?: number;
  rpe?: number;
  note?: string;
  sets?: string;
  holdSec?: number;
}

/** Eine geplante Einheit (so, wie sie in der Datenbank liegt). */
export interface Session {
  id?: number;
  date: ISODate;
  cycleNo: number;
  cycleDay: CycleDay;
  phase: PhaseId;
  reentry?: boolean;
  order: number; // Reihenfolge am Tag (0 = morgens)
  kind: SessionKind;
  type: SessionType;
  title: string;
  durationMin: number;
  distanceKm?: number;
  elevationM?: number;
  instruction: string; // für Calisthenics wird der Text zur Laufzeit aus dem Skill-Stand ergänzt
  why: string;
  xp: number;
  optional: boolean;
  status: SessionStatus;
  missReason?: MissReason;
  swapped?: boolean; // durch Erholung ersetzt (Energie rot)
  log?: SessionLog;
  xpAwarded?: number;
  completedAt?: string;
}

/** Fortschrittszustand der Lastprogression am Ende eines Zyklus. */
export interface LoadState {
  longRunKm: number; // aktuelle "Kapazität" langer Lauf (nicht der Entlastungswert)
  vertSessionM: number; // Höhenmeter-Einheit
  vertLongM: number; // Höhenmeter im langen Lauf
  buildsSinceDeload: number;
}

export interface CycleRecord {
  cycleNo: number;
  startDate: ISODate;
  phase: PhaseId;
  mode: 'build' | 'deload' | 'reentry' | 'taper' | 'race';
  state: LoadState; // Zustand nach diesem Zyklus
  longRunKm: number; // tatsächlich geplanter langer Lauf in diesem Zyklus
}
