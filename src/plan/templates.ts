/**
 * Trainingsvorlagen: Texte und Struktur der einzelnen Einheiten.
 * Reine Daten/Funktionen – keine Spiel-Logik. Hier lässt sich der Plan anpassen.
 */
import type { CycleDay } from '../core/cycle';
import type { PhaseId, SessionKind, SessionType } from '../core/types';
import { xpFor } from '../core/xp';
import { CLIMB_M_PER_MIN, EASY_PACE_MIN_PER_KM, VERT_M_PER_HOUR } from './constants';

export type Needs = 'any' | 'light' | 'full';

export interface Draft {
  day: CycleDay; // natürlicher Zyklustag
  order: number;
  kind: SessionKind;
  type: SessionType;
  title: string;
  durationMin: number;
  distanceKm?: number;
  elevationM?: number;
  instruction: string;
  why: string;
  xp: number;
  optional: boolean;
  priority: number;
  needs: Needs;
  relocatable: boolean;
  legs?: boolean;
}

export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
export function round10(n: number): number {
  return Math.round(n / 10) * 10;
}
export function round50(n: number): number {
  return Math.round(n / 50) * 50;
}

export function runMinutes(km: number, hm = 0): number {
  return Math.round(km * EASY_PACE_MIN_PER_KM + hm / CLIMB_M_PER_MIN);
}

export function fmtKm(km: number): string {
  return (Math.round(km * 10) / 10).toString().replace('.', ',');
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}:${String(m).padStart(2, '0')} h` : `${h} h`;
}

function d(p: Omit<Draft, 'xp' | 'optional' | 'relocatable'> & { xp?: number; optional?: boolean; relocatable?: boolean }): Draft {
  return {
    optional: false,
    relocatable: true,
    ...p,
    xp: p.xp ?? xpFor(p.type, p.durationMin),
  };
}

// ---------------------------------------------------------------- Erholung

export function restDay(day: CycleDay = 1, title = 'Ruhetag (Tagschicht)'): Draft {
  return d({
    day,
    order: 0,
    kind: 'rest',
    type: 'Ruhe',
    title,
    durationMin: 10,
    instruction:
      'Heute zählt Erholung. Optional nach der Schicht 10 min Mobility: Hüftbeuger, Waden, Brustwirbelsäule. Viel trinken, früh schlafen.',
    why: 'Nach 12 Stunden Schicht bringt Training kaum etwas. Schlaf ist dein stärkstes Trainingsmittel. Ruhetage brechen keinen Streak.',
    optional: true,
    priority: 0,
    needs: 'any',
    relocatable: false,
  });
}

export function recoveryDay(day: CycleDay = 3, extra = false): Draft {
  return d({
    day,
    order: 0,
    kind: 'recovery',
    type: 'Mobility',
    title: extra ? 'Freier Zusatztag: locker bewegen' : 'Erholung: Spaziergang & Mobility',
    durationMin: 40,
    instruction:
      '30 min zügiger Spaziergang, gern bei Tageslicht nach dem Aufstehen. Danach 10 min Mobility: Hüfte (90/90), Sprunggelenke, Schultern, Brustwirbelsäule.',
    why: extra
      ? 'Ein Tag mehr frei als geplant: nutze ihn für Erholung, nicht für Zusatzumfang. So bleibt die Steigerung kontrolliert.'
      : 'Nach der Nachtschicht steckst du im Schlafdefizit. Leichte Bewegung fördert die Durchblutung und die Regeneration, ohne zu ermüden.',
    optional: extra,
    priority: 10,
    needs: 'any',
    relocatable: false,
  });
}

// ---------------------------------------------------------------- Laufen

export function runWalk(day: CycleDay, order: number, km: number, stage: number, isLong = false): Draft {
  // stage 0: 3/2, 1: 5/1, ab 2: 8/1 (Laufen/Gehen in Minuten)
  const [run, walk] = stage <= 0 ? [3, 2] : stage === 1 ? [5, 1] : [8, 1];
  const minutes = Math.max(25, Math.round(km * 7.5));
  const reps = Math.max(4, Math.round(minutes / (run + walk)));
  const total = reps * (run + walk);
  return d({
    day,
    order,
    kind: isLong ? 'long' : 'runwalk',
    type: 'Lauf',
    title: isLong ? `Längerer Lauf/Geh-Wechsel · ${fmtKm(km)} km` : `Lauf/Geh-Wechsel · ${total} min`,
    durationMin: total,
    distanceKm: roundHalf(km),
    instruction: `${reps} × (${run} min sehr locker laufen / ${walk} min zügig gehen), ca. ${fmtKm(km)} km. RPE 3 von 10: du kannst ganze Sätze sprechen. 5 min einlaufen, danach Waden und Hüftbeuger dehnen.`,
    why: isLong
      ? 'Die Erkältung steckt noch im System. Mit Gehpausen gewöhnen sich Sehnen und Gelenke wieder an die Laufbelastung – ohne Rückfallrisiko.'
      : 'Lauf/Geh-Wechsel baut die Basis sicher wieder auf. Das Herz-Kreislauf-System erholt sich schneller als Sehnen und Bänder – deshalb erst kurz und locker.',
    priority: isLong ? 100 : 50,
    needs: isLong ? 'full' : 'light',
  });
}

export function easyRun(day: CycleDay, order: number, km: number, phase: PhaseId): Draft {
  const dur = runMinutes(km);
  return d({
    day,
    order,
    kind: 'easy',
    type: 'Lauf',
    title: `Lockerer Lauf · ${dur} min`,
    durationMin: dur,
    distanceKm: roundHalf(km),
    instruction: `${fmtKm(km)} km locker im Gesprächstempo (RPE 3–4, Puls Zone 2). Wenn du nur noch in Halbsätzen sprechen kannst: langsamer.`,
    why:
      day === 2
        ? 'Kurz und locker vor der Nachtschicht: sammelt aerobe Minuten, ohne dich für die Schicht zu ermüden. Danach ein Nickerchen einplanen.'
        : phase === 'taper'
          ? 'Im Taper bleibt der Rhythmus erhalten, der Umfang sinkt. So kommst du frisch an die Startlinie.'
          : 'Lockere Kilometer sind das Fundament jedes Ultras: Sie verbessern Fettstoffwechsel und Kapillarisierung.',
    priority: 50,
    needs: 'light',
  });
}

export function stridesRun(day: CycleDay, order: number, km: number): Draft {
  const dur = runMinutes(km) + 4;
  return d({
    day,
    order,
    kind: 'strides',
    type: 'Lauf',
    title: `Lauf mit Steigerungen · ${dur} min`,
    durationMin: dur,
    distanceKm: roundHalf(km),
    instruction: `${fmtKm(km)} km locker (RPE 3–4). Gegen Ende 6 × 20 s Steigerungen: locker beginnen, zügig (nicht maximal) werden, 60 s gehen/traben dazwischen.`,
    why: 'Steigerungen halten den Laufstil ökonomisch und die Beine "wach", ohne nennenswerte Ermüdung für den langen Lauf morgen.',
    priority: 50,
    needs: 'light',
  });
}

export function hillIntro(day: CycleDay, order: number, km: number): Draft {
  const hm = 150;
  const dur = runMinutes(km, hm);
  return d({
    day,
    order,
    kind: 'hillintro',
    type: 'Lauf',
    title: `Hügel-Einstieg (Laufband) · ${dur} min`,
    durationMin: dur,
    distanceKm: roundHalf(km),
    elevationM: hm,
    instruction: `${fmtKm(km)} km auf dem Laufband. 10 min locker flach, dann 3 × 5 min bei 6–8 % Steigung (RPE 4–5, kurze Schritte, aufrecht), dazwischen 3 min flach. Rest locker.`,
    why: 'Sanfter Einstieg in die Steigung, bevor in der nächsten Welt die Höhenmeter-Arbeit beginnt. Waden und Achillessehnen gewöhnen sich langsam an die Belastung.',
    priority: 50,
    needs: 'light',
  });
}

export interface LongOpts {
  km: number;
  hm: number;
  phase: PhaseId;
  deload: boolean;
  backToBack: boolean;
  tripSuggestion: boolean;
  isLongest?: boolean;
}

export function longRun(day: CycleDay, o: LongOpts): Draft {
  const dur = runMinutes(o.km, o.hm);
  const parts: string[] = [];
  parts.push(`${fmtKm(o.km)} km${o.hm ? ` mit ca. ${o.hm} hm` : ''}, RPE 3–4 (Gesprächstempo). Gehpausen am Berg sind ausdrücklich erlaubt.`);
  if (o.hm >= 150) {
    parts.push(
      o.phase === 'peak'
        ? 'Höhenmeter idealerweise draußen in hügeligem Gelände sammeln. Alternativ Laufband: alle 15 min 8–10 min bei 10–12 % zügig gehen.'
        : 'Höhenmeter auf dem Laufband: alle 15 min einen Block von 6–10 min bei 8–12 % Steigung zügig gehen oder locker laufen. Treppen/Brücken draußen zählen auch.',
    );
  } else {
    parts.push('Flach, gleichmäßig, ruhig atmen.');
  }
  if (dur >= 75) parts.push('Ab 75 min: ab Minute 30 alle 20–30 min trinken und 30–60 g Kohlenhydrate pro Stunde (Gel, Riegel, Banane) – trainiert den Magen.');
  if (o.phase === 'peak' || (o.phase === 'aufbau' && dur >= 180))
    parts.push('Generalprobe: Rennschuhe, Laufweste, Stöcke, Verpflegung wie am Renntag testen.');
  if (o.tripSuggestion)
    parts.push('Empfehlung: Diesen Lauf wenn möglich in echtem Gelände machen, z. B. Wochenendausflug in den Bayerischen Wald (Sankt Engelmar, Pröller, Hirschenstein).');
  let why: string;
  if (o.deload) why = 'Entlastungszyklus: Der Körper wird in der Pause stärker, nicht im Training. Weniger Umfang festigt die Anpassungen der letzten Zyklen.';
  else if (o.phase === 'grundlage') why = 'Der lange Lauf ist die wichtigste Einheit: Er stärkt Ausdauer, Sehnen und Kopf. Die Steigerung bleibt bei max. ~10 % pro Zyklus.';
  else if (o.phase === 'aufbau')
    why = o.backToBack
      ? 'Back-to-back: Nach der Höhenmeter-Einheit gestern läufst du heute mit vorermüdeten Beinen – genau wie in der zweiten Hälfte des Soul Trails.'
      : 'Höhenmeter im langen Lauf bereiten Beine und Kopf auf 2000 hm im Bayerischen Wald vor.';
  else if (o.phase === 'peak') why = o.isLongest ? 'Dein längster Lauf vor dem Rennen. Zeit auf den Beinen zählt mehr als Tempo. Danach geht es in den Taper.' : 'Peak: Rennspezifische Belastung mit möglichst vielen Höhenmetern. Hier trainierst du Verpflegung, Ausrüstung und Geduld.';
  else why = 'Taper: deutlich kürzer, aber noch lang genug, um den Rhythmus zu behalten.';
  return d({
    day,
    order: 0,
    kind: 'long',
    type: 'Lauf',
    title: `${o.isLongest ? 'Längster Lauf' : o.deload ? 'Langer Lauf (Entlastung)' : 'Langer Lauf'} · ${fmtKm(o.km)} km`,
    durationMin: dur,
    distanceKm: roundHalf(o.km),
    elevationM: o.hm || undefined,
    instruction: parts.join(' '),
    why,
    priority: 100,
    needs: 'full',
  });
}

export function vertSession(day: CycleDay, hm: number, variant: 'steady' | 'intervals', phase: PhaseId, deload: boolean): Draft {
  hm = round50(hm);
  if (variant === 'intervals') {
    const reps = Math.min(12, Math.max(5, Math.round(hm / 70)));
    const dur = 15 + reps * 5 + 10;
    return d({
      day,
      order: 0,
      kind: 'vert-intervals',
      type: 'Höhenmeter',
      title: `Bergintervalle · ${reps} × 3 min`,
      durationMin: dur,
      distanceKm: roundHalf(dur / 9),
      elevationM: hm,
      instruction: `15 min einlaufen. Dann ${reps} × 3 min bei 12–15 % Steigung zügig bergauf (Laufband oder Stairmaster, RPE 7, kraftvoll, aber kontrolliert), 2 min flach locker dazwischen. 10 min auslaufen. Ziel: ca. ${hm} hm.`,
      why: deload
        ? 'Entlastung mit kurzem Reiz: weniger Wiederholungen, gleiche Qualität.'
        : 'Bergintervalle verbessern Kraftausdauer und die Leistung am Anstieg – ohne die Stoßbelastung von schnellem Flachlaufen.',
      priority: 80,
      needs: 'full',
    });
  }
  const climbMin = Math.round((hm / VERT_M_PER_HOUR) * 60);
  const dur = climbMin + 15;
  return d({
    day,
    order: 0,
    kind: 'vert-steady',
    type: 'Höhenmeter',
    title: `Höhenmeter-Session · ${hm} hm`,
    durationMin: dur,
    distanceKm: roundHalf(climbMin / 12),
    elevationM: hm,
    instruction: `10 min locker einlaufen. Dann ${climbMin} min Laufband bei 10–15 % Steigung zügig gehen (5–6 km/h, RPE 5–6, nicht am Geländer festhalten) – oder Stairmaster / Treppenhaus. Ziel: ${hm} hm. 5 min auslaufen.`,
    why:
      phase === 'peak'
        ? 'Rennspezifisch: Am Soul Trail wirst du viele Anstiege zügig gehen. Genau das trainierst du hier.'
        : 'Ohne Berge vor der Haustür sammelst du die Höhenmeter im Gym. Zügiges Bergaufgehen ist am Ultra oft effizienter als Laufen.',
    priority: 80,
    needs: 'full',
  });
}

// ---------------------------------------------------------------- Kraft

export function legsBasic(day: CycleDay, order: number): Draft {
  return d({
    day,
    order,
    kind: 'legs-basic',
    type: 'Kraft',
    title: 'Beine & Rumpf (leicht)',
    durationMin: 20,
    instruction:
      'Körpergewicht, RPE 6, nicht bis zum Muskelversagen: Kniebeugen 3 × 12 · Rückwärts-Ausfallschritte 2 × 10 je Bein · Step-downs von der Bank 2 × 8 je Bein (3 s ablassen) · Wadenheben einbeinig 2 × 12 · Glute Bridge 2 × 15 · Seitstütz 2 × 30 s je Seite.',
    why: 'Leichte Beinkraft macht Sehnen und Gelenke robuster. Bewusst locker gehalten, damit der lange Lauf morgen nicht leidet.',
    priority: 30,
    needs: 'full',
    relocatable: false,
  });
}

export function legsEccentric(day: CycleDay, order: number, stage: number): Draft {
  const load = stage <= 1 ? 'mit Körpergewicht' : stage <= 3 ? 'mit leichten Kurzhanteln (2 × 6–10 kg)' : 'mit Kurzhanteln (2 × 10–16 kg)';
  return d({
    day,
    order,
    kind: 'legs-eccentric',
    type: 'Kraft',
    title: 'Krafteinheit (Beine)',
    durationMin: 35,
    instruction: `${load}, langsames Absenken: Step-downs von 30–40 cm Box 3 × 8 je Bein (4 s runter) · Bulgarian Split Squats 3 × 8 je Bein (3 s runter) · Rückwärts-Ausfallschritte 3 × 10 je Bein · Einbeiniges Kreuzheben 3 × 8 je Bein · Exzentrisches Wadenheben 3 × 12 (auf zwei hoch, auf einem 3 s runter). RPE 7.`,
    why: 'Bergab wird der Oberschenkel unter Last verlängert – das zerstört im Ultra die meisten Beine. Exzentrisches Training macht sie dafür robust. Morgen ist Erholungstag, übermorgen bist du wieder frisch.',
    priority: 55,
    needs: 'light',
    relocatable: false,
  });
}

export function legsMaint(day: CycleDay, order: number): Draft {
  return d({
    day,
    order,
    kind: 'legs-maint',
    type: 'Kraft',
    title: 'Krafteinheit (Beine, kurz)',
    durationMin: 20,
    instruction: 'Step-downs 2 × 8 je Bein (3 s runter) · Bulgarian Split Squats 2 × 8 je Bein · Einbeiniges Wadenheben 2 × 12. RPE 6, kein Muskelkater erzwingen.',
    why: 'Im Peak reicht ein kleiner Reiz, um die Bergab-Festigkeit zu erhalten. Die Energie gehört jetzt den langen Läufen.',
    priority: 40,
    needs: 'light',
    relocatable: false,
  });
}

// ---------------------------------------------------------------- Calisthenics
// Die genauen Übungen ergänzt die App zur Laufzeit aus deinem Skill-Stand (siehe calisthenics.ts).

export function caliMain(day: CycleDay, order: number, reduced: boolean, withLegs = false): Draft {
  return d({
    day,
    order,
    kind: 'cali-main',
    type: 'Kraft',
    title: 'Krafteinheit',
    durationMin: (reduced ? 40 : 55) + (withLegs ? 15 : 0),
    legs: withLegs || undefined,
    instruction: 'Aufwärmen, Skill-Arbeit Muscle-up und Front Lever, Grundkraft Zug/Druck, Rumpf' + (withLegs ? ', leichter Bein-Abschluss.' : '.'),
    why: reduced
      ? 'Technik vor Last: saubere Bewegungsmuster jetzt sparen dir später Wochen. Moderater Umfang, weil der Körper noch im Wiedereinstieg ist.'
      : 'Nachmittags nach der Laufeinheit: Oberkörper-Kraft stört die Beine für den langen Lauf morgen nicht. Skills zuerst, solange du frisch bist.',
    priority: 60,
    needs: 'light',
  });
}

export function caliMaint(day: CycleDay, order: number): Draft {
  return d({
    day,
    order,
    kind: 'cali-maint',
    type: 'Kraft',
    title: 'Krafteinheit (kurz)',
    durationMin: 30,
    instruction: 'Kurze Skill-Arbeit und 2 Sätze Grundkraft, weit weg vom Muskelversagen.',
    why: 'Der Trail hat jetzt Priorität. Mit einem kleinen, regelmäßigen Reiz hältst du Kraft und Skills, ohne Energie für die langen Läufe zu verlieren.',
    priority: 45,
    needs: 'light',
  });
}

export function caliSkill(day: CycleDay, order: number): Draft {
  return d({
    day,
    order,
    kind: 'cali-skill',
    type: 'Calisthenics',
    title: 'Skill-Block (optional) · 15 min',
    durationMin: 15,
    instruction: 'Kurze, frische Skill-Arbeit ohne Ermüdung.',
    why: 'Skills lernt man durch häufiges, frisches Üben. 15 Minuten reichen – nicht bis zur Erschöpfung, damit die Nachtschicht nicht leidet.',
    optional: true,
    priority: 20,
    needs: 'light',
  });
}

export function maxtest(day: CycleDay, order: number): Draft {
  return d({
    day,
    order,
    kind: 'maxtest',
    type: 'Kraft',
    title: 'Krafteinheit: Maxtest',
    durationMin: 40,
    instruction:
      'Gut aufwärmen. Dann je ein Satz bis zur letzten sauberen Wiederholung, 3–5 min Pause: Klimmzüge (Kinn über die Stange, unten gestreckt) · Dips (Schulter unter Ellbogenhöhe) · Liegestütze (Brust fast am Boden, Körper gerade) · Tuck-Front-Lever-Hold (Sekunden, Rücken waagerecht). Optional: Körpergewicht morgens.',
    why: 'Alle 4 Zyklen misst du deinen Fortschritt. Die Werte steuern deine Trainingsvorgaben und updaten dein Kraft-Attribut.',
    xp: 80,
    priority: 70,
    needs: 'light',
  });
}

// ---------------------------------------------------------------- Taper & Rennen

export function taperSharpen(day: CycleDay, order: number, minutes: number): Draft {
  return d({
    day,
    order,
    kind: 'taper-sharpen',
    type: 'Lauf',
    title: `Aktivierung · ${minutes} min`,
    durationMin: minutes,
    distanceKm: roundHalf(minutes / EASY_PACE_MIN_PER_KM),
    elevationM: minutes >= 35 ? 100 : undefined,
    instruction:
      minutes >= 35
        ? `${minutes} min locker, darin 4 × 3 min bei 8–10 % Steigung zügig (RPE 7), 2 min locker dazwischen.`
        : `${minutes} min sehr locker, am Ende 3–4 × 20 s Steigerungen.`,
    why: 'Im Taper sinkt der Umfang deutlich, aber kurze, knackige Reize halten die Beine scharf. Weniger ist jetzt mehr.',
    priority: 50,
    needs: 'light',
  });
}

export function racePrep(day: CycleDay): Draft {
  return d({
    day,
    order: 0,
    kind: 'race-prep',
    type: 'Ruhe',
    title: 'Vorabend: Ruhe & Vorbereitung',
    durationMin: 20,
    instruction:
      'Ausrüstung packen (Pflichtausrüstung laut Veranstalter prüfen!), Startnummer, Verpflegung, Stirnlampe laden. Kohlenhydratreich essen, viel trinken. Optional 15 min Gehen. Früh ins Bett – Start ist um 8:30 Uhr.',
    why: 'Die Arbeit ist getan. Heute geht es nur darum, ausgeruht und entspannt an den Start zu kommen.',
    xp: 20,
    priority: 40,
    needs: 'any',
    relocatable: false,
  });
}

export function raceDay(day: CycleDay): Draft {
  return d({
    day,
    order: 0,
    kind: 'race',
    type: 'Lauf',
    title: 'FINAL BOSS: Soul Trail',
    durationMin: 600,
    distanceKm: 55,
    elevationM: 2000,
    instruction:
      'Start 8:30 Uhr, Sankt Engelmar. 55 km · 2000 hm hoch und runter. Ziel: gesund finishen. Die ersten 10 km bewusst zu langsam angehen. Anstiege zügig gehen, ab Minute 30 regelmäßig essen (40–60 g KH/h) und trinken. Bergab locker und kontrolliert – deine Exzentrik-Arbeit zahlt sich jetzt aus.',
    why: 'Alles, was du in den letzten Monaten getan hast, führt zu diesem Tag. Genieße ihn.',
    xp: 1000,
    priority: 1000,
    needs: 'any',
    relocatable: false,
  });
}
