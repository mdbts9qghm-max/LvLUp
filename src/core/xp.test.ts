import { describe, expect, it } from 'vitest';
import { awardedXp, levelFromXp, titleForLevel, totalXpForLevel, xpFor, xpToNext } from './xp';

describe('XP & Level', () => {
  it('Level-Kurve: LV 3 braucht 400 XP', () => {
    expect(xpToNext(1)).toBe(200);
    expect(xpToNext(3)).toBe(400);
    expect(totalXpForLevel(3)).toBe(500);
  });
  it('rechnet Level aus Gesamt-XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, needed: 200 });
    expect(levelFromXp(199).level).toBe(1);
    expect(levelFromXp(200).level).toBe(2);
    expect(levelFromXp(740)).toMatchObject({ level: 3, into: 240, needed: 400 });
  });
  it('Titel', () => {
    expect(titleForLevel(3)).toBe('Trailläufer');
    expect(titleForLevel(99)).toBe('Legende vom Engelmar');
  });
  it('XP nach Typ und Dauer, mindestens 10', () => {
    expect(xpFor('Lauf', 60)).toBe(60);
    expect(xpFor('Höhenmeter', 100)).toBe(130);
    expect(xpFor('Ruhe', 5)).toBe(10);
  });
  it('Ersetzen durch Erholung gibt halbe XP', () => {
    expect(awardedXp(120, true)).toBe(60);
    expect(awardedXp(120, false)).toBe(120);
  });
});
