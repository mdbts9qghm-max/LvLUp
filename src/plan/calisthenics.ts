/** Konkrete Calisthenics-Vorgaben aus Skill-Stand und letztem Maxtest. */
import type { Session } from '../core/types';
import { currentNode } from './skills';

export interface Maxes {
  pullups: number;
  dips: number;
  pushups: number;
  flTuckSec: number;
}

function reps(max: number, factor: number, min = 2): number {
  return Math.max(min, Math.round(max * factor));
}

export function caliInstruction(session: Pick<Session, 'kind' | 'phase' | 'reentry'>, unlocked: Set<string>, m: Maxes): string {
  const mu = currentNode('mu', unlocked);
  const fl = currentNode('fl', unlocked);
  const muTxt = mu ? `${mu.name}: ${mu.train}` : 'Muscle-up-Pfad gemeistert – Erhalt: 3 × 2 Muscle-ups';
  const flTxt = fl ? `${fl.name}: ${fl.train}` : 'Front Lever gemeistert – Erhalt: 4 × 5 s Holds';
  const reduced = session.phase === 'wiedereinstieg' || session.reentry;

  switch (session.kind) {
    case 'cali-skill':
      return `Frisch und ohne Ermüdung, 15 min: 1) ${flTxt.split('·')[0].trim()} – nur 3–4 Sätze. 2) Scapula-Pulls 2 × 8. 3) Ein Technik-Element aus dem Muscle-up-Pfad (2–3 Sätze, weit weg vom Versagen).`;
    case 'cali-maint':
      return `30 min, nichts bis zum Versagen: Aufwärmen 5 min · Skill: ${flTxt.split('·')[0].trim()} (3 Sätze) · Klimmzüge 2 × ${reps(m.pullups, 0.6)} · Dips 2 × ${reps(m.dips, 0.6)} · Hollow Hold 2 × 30 s.`;
    case 'cali-main':
    default: {
      const f = reduced ? 0.5 : 0.65;
      const sets = reduced ? 3 : 4;
      return [
        'Aufwärmen 8 min: Schulterkreisen, Band-Pull-aparts, Scapula-Pulls 2 × 8, 2 lockere Klimmzug-Sätze.',
        `Skill A (Muscle-up) – ${muTxt}`,
        `Skill B (Front Lever) – ${flTxt}`,
        `Grundkraft: Klimmzüge ${sets} × ${reps(m.pullups, f)} · Dips ${sets} × ${reps(m.dips, f)} · Liegestütze 3 × ${reps(m.pushups, f, 5)} (2 min Pause, 1–2 Wdh. Reserve).`,
        'Rumpf: Hollow Body Hold 3 × 30 s · Hängendes Knieheben 2 × 10.',
        reduced ? 'Wiedereinstieg: Technik vor Last, kein Satz bis zum Versagen.' : '',
      ]
        .filter(Boolean)
        .join('\n');
    }
  }
}
