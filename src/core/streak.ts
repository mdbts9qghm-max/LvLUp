/**
 * Streak, angepasst an den Schichtzyklus:
 * Gezählt werden geplante Pflicht-Einheiten (nicht optional, keine Ruhetage), die erledigt wurden.
 * - Ruhetage und optionale Einheiten zählen nicht und brechen nichts.
 * - Pausierte Einheiten (Krank-Modus) frieren den Streak ein.
 * - Verpasst wegen Zusatzschicht/Krankheit friert ebenfalls ein.
 * - Verpasst aus sonstigem Grund bricht den Streak (aber kein XP-Verlust).
 * - Offene Einheiten in der Vergangenheit, die nie eingetragen wurden, brechen den Streak
 *   erst, wenn sie älter als 2 Tage sind (Zeit zum Nachtragen).
 */
import { addDays, type ISODate } from './dates';
import type { Session } from './types';

export interface StreakInfo {
  current: number;
  best: number;
}

export function computeStreak(sessions: Session[], today: ISODate): StreakInfo {
  const relevant = sessions
    .filter((s) => !s.optional && s.type !== 'Ruhe' && s.date <= today)
    .sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
  const graceLimit = addDays(today, -2);
  let current = 0;
  let best = 0;
  for (const s of relevant) {
    if (s.status === 'done') {
      current++;
      best = Math.max(best, current);
    } else if (s.status === 'paused') {
      // eingefroren
    } else if (s.status === 'missed') {
      if (s.missReason === 'zusatzschicht' || s.missReason === 'krank') continue;
      current = 0;
    } else if (s.status === 'open') {
      if (s.date < graceLimit) current = 0;
    }
  }
  return { current, best };
}
