# Trainingsplan: Annahmen & Logik

Dieses Dokument erklärt, wie Soul Quest den Plan berechnet. Die Zahlen sind Richtwerte nach gängigen Prinzipien des Ultra-Trail-Trainings und der Calisthenics-Progression. **Der Plan ersetzt keine ärztliche oder trainerische Beratung.**

Code: Vorlagen und Texte in `src/plan/templates.ts`, Stellschrauben in `src/plan/constants.ts`, Logik in `src/plan/generator.ts` und `src/plan/reschedule.ts`.

## Ausgangslage (Annahmen)

| Punkt | Annahme |
|---|---|
| Rennen | Soul Trail, 55 km, 2000 hm, 17.04.2027, 8:30 Uhr. Ziel: gesund finishen |
| Planstart | 23.11.2026 → ca. 29 Schichtzyklen à 5 Tage |
| Laufbasis | aktuell keine (nach Erkältung), längster Lauf zuletzt 10 km → **Startkapazität 10 km** |
| Lockeres Tempo | **6:30 min/km** (konservativ für einen Halbmarathon-Finisher, kurz nach einer Erkältung) |
| Höhenmeter-Zuschlag | 1 min pro 15 hm (Laufband-Steigung / Powerhiking) |
| Laufband/Stairmaster | ~500 hm pro Stunde zügiges Gehen bei 10–15 % Steigung |
| Intensität | über RPE (1–10) und Gesprächstest, weil keine Pulszonen bekannt sind. RPE 3–4 ≈ Zone 2 |

## Schichtzyklus

| Tag | Arbeit | Typische Belegung |
|---|---|---|
| 1 | Tagschicht | Ruhetag, optional 10 min Mobility |
| 2 | Nachtschicht ab 19 Uhr | **genau eine** kurze Einheit am Vormittag: lockerer Lauf **oder** Exzentrik-Beine (Aufbau) |
| 3 | nach Nachtschicht | Erholung: Spaziergang + Mobility |
| 4 | frei | vormittags Lauf/Höhenmeter, nachmittags **Krafteinheit** (Calisthenics, in Wiedereinstieg/Grundlage mit leichtem Bein-Abschluss) |
| 5 | frei | langer Lauf |

- Ein neuer Zyklus beginnt mit jeder Tagschicht. Durch **Verschiebungen** wiederholte Tage werden zu zusätzlichen freien Tagen (Erholung) – der Plan rückt nach.
- **Zusatzschicht**: Der Tag wird blockiert. Schlüsseleinheiten (langer Lauf, Höhenmeter) weichen auf einen anderen freien Tag des Zyklus aus und verdrängen dort weniger wichtige Einheiten. Was nicht passt, wird ehrlich als gestrichen angezeigt.
- **Höchstens 2 Einheiten pro Tag, vor der Nachtschicht (Tag 2) nur 1.**
- **Wechsel Lauf/Kraft:** Gerade Zyklen (2, 4, 6 …) haben 3× Laufen + 1× Kraft. Ungerade Zyklen ab Zyklus 3 haben 2× Laufen + 2× Kraft – dann ist Tag 2 eine Krafteinheit für die Beine (Grundlage: Beinkraft, Aufbau: Exzentrik, Peak: Exzentrik-Erhalt), und die Krafteinheit an Tag 4 kommt ohne Bein-Abschluss aus. Im Taper wird nur gelaufen. Kraft und Calisthenics laufen immer zusammen als eine „Krafteinheit“.
- **Keine schweren Beineinheiten vor dem langen Lauf**: An Tag 4 gibt es nur einen leichten Bein-Abschluss (15 min Körpergewicht, RPE 6) innerhalb der Krafteinheit. Schwere Exzentrik liegt an Tag 2, danach folgt Tag 3 als Erholung.

## Phasen (= Welten)

| Welt | Phase | Länge | Inhalt |
|---|---|---|---|
| 1 Flachland | Wiedereinstieg | 2 Zyklen | Lauf/Geh-Wechsel (3/2 → 5/1 min), langer Lauf 60 % → 80 % der Startkapazität (6 → 8 km), Calisthenics-Technik |
| 2 Hügelland | Grundlage | bis ca. Mitte Januar (~41 % der mittleren Zyklen) | langer Lauf ~11 → ~20 km, Steigerungen, Hügel-Einstieg 6–8 % |
| 3 Hochwald | Höhe & Aufbau | bis ca. Mitte März | Höhenmeter-Session (300 → 900 hm), abwechselnd Bergintervalle und lange Steigung, langer Lauf mit 200 → ~1000 hm, Back-to-back Tag 4 + 5, Exzentrik an Tag 2 in ungeraden Zyklen |
| 4 Gratpfad | Peak | 3 Zyklen vor dem Taper | längster Lauf ~35 km bzw. max. 5 h mit ~1000+ hm, Rennausrüstung und Verpflegung testen, Ausflug in den Bayerischen Wald empfohlen. Calisthenics nur noch Erhalt |
| 5 Ruhelager | Taper | alle Zyklen, die in den letzten 11 Tagen beginnen (≈ 10 Tage) | Umfang 60 % → 45 %, kurze knackige Reize; die letzten 6 Tage folgen festen Rennwochen-Regeln |
| Finale | Renntag | – | Final Boss: Soul Trail |

## Progression

- **Langer Lauf**: +10 % pro Aufbauzyklus (mindestens +1 km), begrenzt pro Phase:
  - Grundlage: max. 20 km bzw. 2,5 h
  - Aufbau: max. 30 km bzw. 4 h
  - Peak: max. 38 km bzw. **5 h**. Die Zeitgrenze greift zuerst: Mit ~1000 hm sind 5 h etwa 33–35 km. Auf Trails zählt Zeit auf den Beinen mehr als Kilometer.
  - Der letzte Peak-Zyklus ist bewusst etwas kürzer (80 %), damit der längste Lauf etwa 2 Wochen vor dem Rennen liegt.
- **Entlastung**: Nach 3 Aufbauzyklen folgt ein Entlastungszyklus (70 % Umfang, 60 % Höhenmeter). Vor dem Peak wird ab 2 Aufbauzyklen entlastet, damit du frisch in die größten Läufe gehst. Im Peak gibt es keine Entlastung.
- Alle anderen Laufeinheiten skalieren mit dem langen Lauf, dadurch steigt auch der Gesamtumfang um höchstens etwa 10 % pro Zyklus. Ausnahme sind Phasenwechsel, bei denen sich der Charakter von Tag 4 ändert.
- **Höhenmeter**: Höhenmeter-Session +10 %/Zyklus (300 → 900 hm im Aufbau, bis 1100 im Peak). Höhenmeter im langen Lauf +15 %/Zyklus (200 → 1000, im Peak bis 1500).
- Größenordnung des Standardplans: ~950 km und ~19 000 hm bis zum Renntag, Spitzenzyklen ~50 km und ~2000 hm in 5 Tagen (≈ 70 km/Woche).

## Calisthenics

- Krafteinheit an Tag 4 nachmittags (55 min, mit Bein-Abschluss 70 min): Skill A (Muscle-up), Skill B (Front Lever), Grundkraft (Klimmzüge/Dips/Liegestütze mit ~65 % des Maxwerts, 1–2 Wdh. Reserve), Rumpf.
- Wiedereinstieg: 50 % Umfang, Technik vor Last. Im Peak und Taper nur 30-min-Erhalt.
- **Maxtest** alle 4 Zyklen an Tag 4: Klimmzüge, Dips, Liegestütze, Tuck-Front-Lever-Hold. Die Werte steuern die Satzvorgaben.
- Die Übungen kommen immer aus der **aktuellen Stufe im Skill-Tree** (erste noch nicht freigeschaltete Stufe je Pfad).

### Muscle-up-Pfad (Kriterien)
Aktiver Hang (3×30 s + 3×10 Scap-Pulls) → 8 Klimmzüge → Chest-to-bar 3×5 → 12 Klimmzüge → Explosive Klimmzüge 3×5 → Straight-Bar-Dips 3×8 → Negativ-Muscle-ups 3×3 à 5 s → Band-Muscle-ups 3×3 → Transition-Drills 3×5 → **erster Muscle-up** (Boss) → Bonus: 3 am Stück.

### Front-Lever-Pfad (Kriterien)
Hollow Body 3×30 s → Scapula-Pulls 3×12 + Knieheben 3×10 → Tuck FL 3×10 s → Tuck-Raises 3×6 → **Tuck FL 15 s** (Boss) → Advanced Tuck 3×5 s → Advanced Tuck 12 s (**Ziel bis April**) → Bonus: One Leg, Straddle, Full.

Realistisch: Von 5 auf 12+ Klimmzüge in ~4 Monaten bei 1–2 Zugeinheiten pro 5 Tage ist ambitioniert, aber machbar. Der erste Muscle-up bis April ist möglich, aber nicht garantiert, weil der Trail Vorrang hat.

## Erholung (WHOOP)

Energie = Recovery: **≥ 67 % grün** (Plan wie vorgesehen), **34–66 % gelb** (Vorschlag: Intensität senken, Puls in Zone 2, Umfang −20 %), **≤ 33 % rot** (Vorschlag: durch Erholung ersetzen – gibt halbe XP und zählt für den Streak). Die Schwellen entsprechen den WHOOP-Farben. Es bleibt immer ein Vorschlag, du entscheidest.

CSV-Import: tolerante Zuordnung der Spalten aus `physiological_cycles.csv` (Recovery score %, Asleep duration (min), Heart rate variability (ms), Resting heart rate (bpm), Datum aus „Wake onset“ bzw. „Cycle start time“). Semikolon, Dezimalkomma und deutsche Daten werden ebenfalls erkannt.

## Krankheit & Neuberechnung

- **Nacken-Regel**: nur Symptome oberhalb des Halses → höchstens sehr locker. Fieber oder Symptome unterhalb des Halses → kein Training.
- Während der Krankheit ist der Plan pausiert, die Einheiten zählen als „pausiert“ (Streak eingefroren, kein XP-Verlust).
- Nach „Wieder gesund“ wird abhängig von der Pausendauer neu berechnet:

| Pause | Kapazität | Wiedereinstieg |
|---|---|---|
| ≤ 2 Tage | 100 % | keiner |
| 3–6 Tage | 90 % | 1 Zyklus mit 75 % |
| 7–13 Tage | 80 % | 2 Zyklen (60 % → 85 %) |
| 14–27 Tage | 70 % | 2 Zyklen (60 % → 80 %) |
| ≥ 28 Tage | 60 % | 3 Zyklen (50 % → 80 %) |

- Danach wird bis zum Renntag neu progressiv aufgebaut. Taper und Peak hängen fest am Renntag. Ist der längste Lauf danach kürzer als 28 km, sagt die App ehrlich, dass es eng wird, und gibt Rennstrategie-Tipps.
- **Verpasster langer Lauf / verpasste Höhenmeter-Session**: Es wird vom letzten erledigten Stand aus weiter aufgebaut, also nicht weiter gesteigert. Nicht eingetragene Einheiten zählen als erledigt, Vergessen wird nicht bestraft.

## Gamification-Zahlen

- XP je Einheit ≈ Minuten × Faktor (Lauf 1,0 · Höhenmeter 1,3 · Kraft 1,0 · Calisthenics 1,1 · Mobility 0,6 · Ruhe 0,5, mindestens 10). Boss +150, Skill-Stufe +100, Renntag 1000.
- Level: von LV n auf n+1 braucht man 100 + 100·n XP (LV 3 → 400 XP). Der komplette Plan ergibt etwa LV 13–14.
- Streak: zählt erledigte Pflicht-Einheiten. Ruhetage, optionale Einheiten, Krankheit und Zusatzschichten brechen ihn nicht. „Verpasst aus sonstigem Grund“ beginnt ihn neu. Für das Nachtragen hast du 2 Tage Zeit.
