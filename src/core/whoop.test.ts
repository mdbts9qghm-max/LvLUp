import { describe, expect, it } from 'vitest';
import { parseWhoopCsv } from './whoop';

describe('WHOOP-CSV', () => {
  it('liest physiological_cycles.csv', () => {
    const csv = [
      'Cycle start time,Cycle end time,Cycle timezone,Recovery score %,Resting heart rate (bpm),Heart rate variability (ms),Skin temp (celsius),Blood oxygen %,Day Strain,Energy burned (cal),Max HR (bpm),Average HR (bpm),Sleep onset,Wake onset,Sleep performance %,Respiratory rate (rpm),Asleep duration (min),In bed duration (min),Sleep need (min)',
      '2026-12-01 22:10:00,2026-12-02 21:50:00,UTC+01:00,72,52,85,33.1,96,10.2,2500,170,70,2026-12-01 23:00:00,2026-12-02 07:05:00,88,15.1,452,480,500',
      '2026-12-02 21:50:00,,UTC+01:00,28,58,48,33.0,95,,,,,2026-12-02 23:30:00,2026-12-03 06:00:00,60,15.5,360,390,510',
    ].join('\n');
    const r = parseWhoopCsv(csv);
    expect(r.entries).toEqual([
      { date: '2026-12-02', recoveryPct: 72, sleepMin: 452, hrv: 85, rhr: 52 },
      { date: '2026-12-03', recoveryPct: 28, sleepMin: 360, hrv: 48, rhr: 58 },
    ]);
    expect(r.recognized).toEqual(['Datum', 'Recovery', 'Schlaf', 'HRV', 'Ruhepuls']);
  });
  it('ist tolerant: Semikolon, deutsche Daten, Dezimalkomma, andere Reihenfolge', () => {
    const csv = 'Datum;HRV;Recovery;Schlafdauer\n02.12.2026;"85,5";72 %;7,5\n;;\n';
    const r = parseWhoopCsv(csv);
    expect(r.entries).toEqual([{ date: '2026-12-02', hrv: 85.5, recoveryPct: 72, sleepMin: 450 }]);
  });
  it('überspringt Zeilen ohne Datum', () => {
    const r = parseWhoopCsv('Date,Recovery score %\nfoo,50\n2026-12-01,60\n');
    expect(r.entries).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
});
