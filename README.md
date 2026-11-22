# Soul Quest

Dein Trainingsplan für den **Soul Trail 2027** (55 km · 2000 hm · Sankt Engelmar, 17.04.2027, 8:30 Uhr) und für **Muscle-up & Front Lever** – als Pixel-Art-RPG. Er plant in deinen 5-Tage-Schichtzyklen, läuft als App auf dem iPhone und speichert alles nur lokal.

> Der Plan ersetzt keine ärztliche Beratung. Bei Schmerzen oder Krankheit: pausieren.

**App-Adresse (nach der Einrichtung unten):** https://mdbts9qghm-max.github.io/LvLUp/

---

## 1. Einmalig: Veröffentlichen (GitHub Pages)

Du brauchst nur deinen GitHub-Account, den du schon hast. Dauer: ca. 5 Minuten.

1. Öffne im Browser **github.com/mdbts9qghm-max/LvLUp** und melde dich an.
2. Oben auf **Settings** (Zahnrad) tippen → links **Pages**.
3. Unter **Build and deployment → Source** die Option **GitHub Actions** wählen. Fertig, speichern ist nicht nötig.
4. Optional, aber empfohlen: **Settings → General → Default branch** auf `main` umstellen (Pfeil-Symbol → `main` → Update).
5. Unter **Actions** siehst du den Lauf „Deploy auf GitHub Pages“. Wenn er grün ist (ca. 2 Minuten), ist die App unter der Adresse oben erreichbar.

> Veröffentlicht wird nur, was auf `main` liegt. Neue Versionen kommen als Pull Request: öffnen → **Merge pull request** → **Confirm merge**. Danach ist das Update nach ca. 2 Minuten online.
>
> Wenn der Deploy-Schritt rot ist mit „Branch is not allowed to deploy“: Settings → Environments → **github-pages** → bei „Deployment branches“ `main` erlauben, oder Schritt 4 erledigen.

## 2. Auf dem iPhone installieren

1. Die App-Adresse in **Safari** öffnen (wichtig: Safari, nicht Chrome).
2. Unten auf **Teilen** (Quadrat mit Pfeil nach oben) tippen.
3. Nach unten scrollen → **Zum Home-Bildschirm** → **Hinzufügen**.
4. Soul Quest jetzt immer über das neue Icon öffnen. Dann läuft die App im Vollbild und funktioniert auch offline.

Beim ersten Start führt dich die App durch die Einrichtung: Held erstellen, Datum eines Zyklustags 1 (Tagschicht), Startwerte.

## 3. So nutzt du die App

| Tab | Was du dort machst |
|---|---|
| **QUEST** | Heutige Einheit starten und abhaken, Energie (WHOOP-Recovery) eintragen, Countdown, Krank-Modus (Kreuz-Button) |
| **KARTE** | Weltkarte mit deinem Fortschritt, Bosskämpfe, **PLAN**: alle Zyklen mit „Zyklus 12 · Tag 4“ und Datum |
| **SKILLS** | Skill-Tree Muscle-up und Front Lever. Kriterium geschafft → Stufe freischalten |
| **HELD** | Aussehen, Ausrüstung anlegen, Attribute, **Zyklus verschieben**, **Zusatzschicht**, Backup, WHOOP-CSV-Import |
| **STATS** | km und hm pro Zyklus, längster Lauf, Maxwerte, Recovery-Verlauf, Körpergewicht |

- **Quest abschließen**: Distanz, Höhenmeter, Dauer, Puls (optional), RPE, Notiz bzw. Sätze × Wdh. eintragen. Vorgeschlagen werden die geplanten Werte.
- **Verpasst?** In der Einheit auf „Verpasst / ausgefallen“ tippen. Kein XP-Verlust. Bei langen Läufen und Höhenmeter-Sessions rechnet die App den Rest des Plans neu.
- **Krank**: Kreuz-Button neben „Quest starten“. Der Plan pausiert, der Streak wird eingefroren. Mit „Wieder gesund“ startet ein angepasster Wiedereinstieg. Die App zeigt dir ehrlich, was sich ändert.
- **Schichttausch**: HELD → Zyklus verschieben (z. B. ab Datum X um +2 Tage). **Zusatzschicht** an einem freien Tag: HELD → Zusatzschicht.
- **Energie gelb/rot**: Die App schlägt vor, die Intensität zu senken oder die Einheit durch Erholung zu ersetzen. Du entscheidest.

Wie der Plan aufgebaut ist und welche Annahmen dahinterstecken: [docs/trainingsplan.md](docs/trainingsplan.md).

## 4. Daten sichern (wichtig!)

Alle Daten liegen **nur auf deinem iPhone**. Es gibt keinen Server und keinen Account. Wenn du die App löschst oder Safari-Daten löschst, sind sie weg.

- **HELD → Daten → Backup exportieren**. Auf dem iPhone erscheint „In Dateien sichern“ → z. B. iCloud Drive wählen.
- Die App erinnert dich alle 7 Tage an ein Backup.
- **Wiederherstellen** (z. B. neues iPhone): App öffnen, Einrichtung durchklicken, dann HELD → Backup importieren → Datei auswählen.

## 5. WHOOP-Daten

- Täglich: Auf dem Startbildschirm auf **ENERGIE** tippen → Recovery %, Schlaf, optional HRV und Ruhepuls.
- Mehrere Tage auf einmal: In der WHOOP-App die Daten exportieren (Profil → Einstellungen → Daten exportieren). Du bekommst eine ZIP-Datei per E-Mail. Daraus `physiological_cycles.csv` in „Dateien“ speichern und unter HELD → WHOOP-CSV-Import auswählen.
- Eine automatische WHOOP-Verbindung bräuchte einen kleinen Server (OAuth). Sie ist als optionale spätere Phase vorgesehen und wird nur nach Absprache gebaut.

## 6. Updates

Neue Versionen werden automatisch veröffentlicht, sobald ein Pull Request nach `main` gemergt ist. Beim nächsten Öffnen erscheint in der App „Neue Version verfügbar → Aktualisieren“. Deine Daten bleiben erhalten.

---

## Für Entwickler

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests (Zyklen, Plan, Neuberechnung, XP, Streak, WHOOP, Datenbank)
npm run build      # Produktions-Build nach dist/
npm run icons      # App-Icons neu erzeugen
```

Zum Testen eines anderen Tages `?heute=2027-02-10` an die URL hängen.

**Struktur**
- `src/core/` – reine Spiel- und Kalenderlogik (Zyklen, XP, Streak, Bosse, Ausrüstung, Attribute, Energie, WHOOP-CSV)
- `src/plan/` – Trainingsplan: Konstanten, Vorlagen und Texte, Generator, Neuberechnung, Skill-Tree, Calisthenics-Vorgaben
- `src/db/` – IndexedDB über Dexie
- `src/game/` – Aktionen (abhaken, krank, verschieben, Backup) und abgeleiteter Spielstand
- `src/ui/` – React-Oberfläche, Pixel-Art (alles selbst gezeichnet), Screens

Technik: Vite + React + TypeScript, Dexie, vite-plugin-pwa (Workbox). Schriften: Press Start 2P und VT323 (SIL OFL, lokal eingebunden über @fontsource).
