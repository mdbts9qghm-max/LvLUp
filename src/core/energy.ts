/** WHOOP-Recovery → Energie-Balken. Schwellen wie bei WHOOP: ≥67 grün, 34–66 gelb, ≤33 rot. */
export type EnergyZone = 'green' | 'yellow' | 'red';

export function energyZone(recoveryPct: number): EnergyZone {
  if (recoveryPct >= 67) return 'green';
  if (recoveryPct >= 34) return 'yellow';
  return 'red';
}

export function energySegments(recoveryPct: number): number {
  return Math.max(0, Math.min(10, Math.round(recoveryPct / 10)));
}

export const ENERGY_COLORS: Record<EnergyZone, string> = {
  green: '#4FA36A',
  yellow: '#E9A23B',
  red: '#D9534A',
};

export function energyAdvice(zone: EnergyZone, kind: 'hard' | 'easy' | 'rest'): string {
  if (zone === 'green') return 'Energie voll: Plan wie vorgesehen.';
  if (zone === 'yellow')
    return kind === 'hard'
      ? 'Energie mittel: Vorschlag – Intensität senken. Puls in Zone 2 halten, Umfang um ~20 % kürzen, Intervalle ggf. weglassen.'
      : 'Energie mittel: Die heutige Einheit ist locker – passt. Achte auf Schlaf.';
  return kind === 'rest'
    ? 'Energie niedrig: Heute ist ohnehin Erholung. Gut so.'
    : 'Energie niedrig: Vorschlag – Einheit durch Erholung ersetzen (30 min Spaziergang + Mobility) oder deutlich verkürzen. Du entscheidest.';
}
