/** Bosskämpfe = Meilensteine. */
import type { Session } from './types';

export type BossSprite = 'golem' | 'wyrm' | 'spirit' | 'titan' | 'warden' | 'final';

export interface BossDef {
  id: string;
  name: string;
  goal: string;
  intro: string;
  sprite: BossSprite;
  color: string;
  bonus?: boolean;
  /** Erfüllt eine (geplante oder erledigte) Lauf-Einheit die Bedingung? */
  runCheck?: (km: number, hm: number) => boolean;
  /** Maxtest-Bedingung */
  maxtestCheck?: (m: { pullups?: number; flTuckSec?: number }) => boolean;
  skillNode?: string;
}

export const BOSSES: BossDef[] = [
  {
    id: 'b15',
    name: 'Wächter der 15 km',
    goal: 'Dein erster Lauf über 15 km',
    intro: 'Am Rand des Flachlands steht ein steinerner Wächter. Er lässt nur passieren, wer 15 Kilometer am Stück bezwingt.',
    sprite: 'warden',
    color: '#8A8296',
    runCheck: (km) => km >= 15,
  },
  {
    id: 'b1000',
    name: 'Der Höhengolem',
    goal: 'Erste Einheit mit 1000 Höhenmetern',
    intro: 'Aus Fels und Moos erhebt sich der Höhengolem. Tausend Höhenmeter – Schritt für Schritt, ohne Eile.',
    sprite: 'golem',
    color: '#9C8FC4',
    runCheck: (_km, hm) => hm >= 1000,
  },
  {
    id: 'bhm',
    name: 'Hüter des Halbmarathons',
    goal: 'Halbmarathon-Distanz (21,1 km) mit mindestens 500 hm',
    intro: 'Im Nebel des Hochwalds wartet ein alter Hüter. Er prüft Ausdauer und Geduld: 21,1 km über Hügel.',
    sprite: 'spirit',
    color: '#6FA3C8',
    runCheck: (km, hm) => km >= 21.1 && hm >= 500,
  },
  {
    id: 'b30',
    name: 'Der Grat-Wyrm',
    goal: 'Dein erster Lauf über 30 km',
    intro: 'Entlang des Grats windet sich ein uralter Wyrm. Dreißig Kilometer sind sein Revier.',
    sprite: 'wyrm',
    color: '#4FA36A',
    runCheck: (km) => km >= 30,
  },
  {
    id: 'b40',
    name: 'Titan der 40 km',
    goal: 'Bonus: ein Lauf über 40 km',
    intro: 'Ein Titan, größer als jeder Berg. Optional – nur für die, die mehr wollen.',
    sprite: 'titan',
    color: '#D9783A',
    bonus: true,
    runCheck: (km) => km >= 40,
  },
  {
    id: 'bpull10',
    name: 'Der Eiserne Griff',
    goal: '10 saubere Klimmzüge am Stück (Maxtest)',
    intro: 'Eine eiserne Hand packt die Stange. Zehnmal musst du dich hinaufziehen, sauber und kontrolliert.',
    sprite: 'golem',
    color: '#E9A23B',
    maxtestCheck: (m) => (m.pullups ?? 0) >= 10,
  },
  {
    id: 'bmu',
    name: 'Wächter der Stange',
    goal: 'Dein erster sauberer Muscle-up',
    intro: 'Über der Stange beginnt eine neue Welt. Der Wächter weicht nur dem, der hinübergelangt.',
    sprite: 'warden',
    color: '#E08A4C',
    skillNode: 'mu-first',
  },
  {
    id: 'bfl',
    name: 'Der Schwebende',
    goal: 'Tuck Front Lever 15 s',
    intro: 'Ein Geist schwebt waagerecht in der Luft. Halte 15 Sekunden gegen die Schwerkraft.',
    sprite: 'spirit',
    color: '#9C8FC4',
    maxtestCheck: (m) => (m.flTuckSec ?? 0) >= 15,
    skillNode: 'fl-tuck15',
  },
  {
    id: 'final',
    name: 'SOUL TRAIL',
    goal: '55 km · 2000 hm · Sankt Engelmar – gesund finishen',
    intro: 'Sankt Engelmar, 8:30 Uhr. 55 Kilometer und 2000 Höhenmeter liegen vor dir. Du bist bereit.',
    sprite: 'final',
    color: '#D9783A',
  },
];

export function bossById(id: string): BossDef | undefined {
  return BOSSES.find((b) => b.id === id);
}

function sessionValues(s: Session, useLog: boolean): { km: number; hm: number } {
  const km = (useLog ? s.log?.distanceKm : undefined) ?? s.distanceKm ?? 0;
  const hm = (useLog ? s.log?.elevationM : undefined) ?? s.elevationM ?? 0;
  return { km, hm };
}

/** Lauf-Bosse, die durch diese erledigte Einheit besiegt werden. */
export function bossesDefeatedBySession(s: Session, defeated: Set<string>): string[] {
  if (s.kind === 'race') return defeated.has('final') ? [] : ['final'];
  if (s.type !== 'Lauf' && s.type !== 'Höhenmeter') return [];
  const { km, hm } = sessionValues(s, true);
  return BOSSES.filter((b) => b.runCheck && !defeated.has(b.id) && b.runCheck(km, hm)).map((b) => b.id);
}

/** Nächster geplanter Bosskampf für eine offene Einheit (für Intro-Szene & Markierung). */
export function plannedBossFor(s: Session, openSessions: Session[], defeated: Set<string>): string | undefined {
  if (s.kind === 'race') return 'final';
  if (s.type !== 'Lauf' && s.type !== 'Höhenmeter') return undefined;
  for (const b of BOSSES) {
    if (!b.runCheck || defeated.has(b.id)) continue;
    // erste offene Einheit, die die Bedingung erfüllt
    const first = openSessions.find((o) => (o.type === 'Lauf' || o.type === 'Höhenmeter') && o.kind !== 'race' && b.runCheck!(o.distanceKm ?? 0, o.elevationM ?? 0));
    if (first && first.id === s.id) return b.id;
  }
  return undefined;
}

export function bossesDefeatedByMaxtest(m: { pullups?: number; flTuckSec?: number }, defeated: Set<string>): string[] {
  return BOSSES.filter((b) => b.maxtestCheck && !defeated.has(b.id) && b.maxtestCheck(m)).map((b) => b.id);
}

export function bossesDefeatedBySkill(nodeId: string, defeated: Set<string>): string[] {
  return BOSSES.filter((b) => b.skillNode === nodeId && !defeated.has(b.id)).map((b) => b.id);
}
