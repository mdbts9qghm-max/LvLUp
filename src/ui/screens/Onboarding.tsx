import { useState } from 'react';
import { buildCalendar, cycleDayFor, CYCLE_DAY_INFO, groupCycles } from '../../core/cycle';
import { addDays, formatDE, formatShort, isValidISO } from '../../core/dates';
import { today as getToday } from '../../core/clock';
import { completeOnboarding } from '../../game/actions';
import { defaultAufbauStart } from '../../plan/generator';
import { Landscape } from '../art/Landscape';
import { Avatar, ChipGroup, Field, NumInput } from '../components/basics';
import { AvatarEditor } from './HeroScreen';

export const DISCLAIMER =
  'Dieser Trainingsplan ersetzt keine ärztliche Beratung. Bei Schmerzen, Krankheit oder Unsicherheit: pausieren und ärztlich abklären lassen. Du trainierst auf eigene Verantwortung.';

const RACE = '2027-04-17';
const DEFAULT_START = '2026-11-23';

export function Onboarding() {
  const today = getToday();
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const [look, setLook] = useState({ hair: 'kurz', hairColor: 'dunkelbraun', beard: 'kein', skin: 'hell' });
  const [outfit, setOutfit] = useState<'outfit-standard' | 'outfit-stein' | 'outfit-wald'>('outfit-standard');
  const [planStart, setPlanStart] = useState(today > DEFAULT_START ? today : DEFAULT_START);
  const [anchor, setAnchor] = useState(today > DEFAULT_START ? today : DEFAULT_START);
  const [pullups, setPullups] = useState<number | undefined>(5);
  const [pushups, setPushups] = useState<number | undefined>(10);
  const [dips, setDips] = useState<number | undefined>(8);
  const [fl, setFl] = useState<number | undefined>(undefined);
  const [weight, setWeight] = useState<number | undefined>(82);
  const [longest, setLongest] = useState<number | undefined>(10);
  const [busy, setBusy] = useState(false);

  const validDates = isValidISO(planStart) && isValidISO(anchor) && planStart < RACE;
  const equipped = { outfit, shoes: 'shoes-trail' };
  const cal = validDates ? buildCalendar(planStart, RACE, anchor) : [];
  const nCycles = cal.length ? groupCycles(cal).length : 0;
  const raceDay = validDates ? cycleDayFor(RACE, anchor) : 4;

  const steps = ['Willkommen', 'Dein Held', 'Schichtzyklus', 'Startwerte', 'Los geht’s'];

  return (
    <div className="app" style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
      <header className="topbar">
        <h1 className="px t14 rust" style={{ margin: 0 }}>
          SOUL QUEST
        </h1>
        <span className="px t7 muted">
          {step + 1}/{steps.length}
        </span>
      </header>

      {step === 0 && (
        <div className="stack rise">
          <div className="hero-scene" style={{ height: 180 }}>
            <Landscape world={1} className="land" />
          </div>
          <h2 className="px t12">Dein Weg zum Soul Trail</h2>
          <p>
            55 km und 2000 Höhenmeter im Bayerischen Wald, Start am 17. April 2027 um 8:30 Uhr in Sankt Engelmar. Dazu Muscle-up und Front Lever. Jede Einheit ist eine Quest, jeder Meilenstein ein Boss.
          </p>
          <p className="muted">Geplant wird in deinen 5-Tage-Schichtzyklen, nicht in Kalenderwochen.</p>
          <div className="card rust-border stack-s">
            <div className="px t8 rust">WICHTIG</div>
            <div>{DISCLAIMER}</div>
            <label className="row" style={{ minHeight: 44, cursor: 'pointer' }}>
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ width: 24, height: 24, accentColor: '#D9783A' }} />
              <span>Verstanden</span>
            </label>
          </div>
          <button className="btn primary big block" disabled={!accepted} onClick={() => setStep(1)}>
            Weiter
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="stack rise">
          <h2 className="px t10">Erschaffe deinen Helden</h2>
          <AvatarEditor value={look} onChange={setLook} equipped={equipped} name={name} onName={setName} />
          <Field label="OUTFIT" group>
            <ChipGroup options={{ 'outfit-standard': 'Nachtblau', 'outfit-stein': 'Steingrau', 'outfit-wald': 'Waldgrün' }} value={outfit} onChange={setOutfit} />
          </Field>
          <p className="muted">Mehr Ausrüstung (Kappe, Laufweste, Stirnlampe, Stöcke …) schaltest du über Level und Bosse frei.</p>
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </div>
      )}

      {step === 2 && (
        <div className="stack rise">
          <h2 className="px t10">Dein Schichtzyklus</h2>
          <div className="card flat">
            {([1, 2, 3, 4, 5] as const).map((d) => (
              <div key={d}>
                <span className="px t8">TAG {d}</span> · {CYCLE_DAY_INFO[d].work}
              </div>
            ))}
          </div>
          <Field label="AN WELCHEM DATUM IST ZYKLUSTAG 1 (TAGSCHICHT)?">
            <input className="inp" type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          </Field>
          <div className="muted">Irgendein Datum mit Tagschicht reicht – vergangen oder zukünftig. Die App rechnet alle Zyklen bis zum Renntag aus.</div>
          {validDates && (
            <div className="card flat">
              <h3>VORSCHAU</h3>
              {Array.from({ length: 6 }, (_, i) => addDays(planStart, i)).map((d) => (
                <div key={d}>
                  {formatShort(d)} · Tag {cycleDayFor(d, anchor)} · <span className="muted">{CYCLE_DAY_INFO[cycleDayFor(d, anchor)].label}</span>
                </div>
              ))}
            </div>
          )}
          <Field label="PLANSTART">
            <input className="inp" type="date" value={planStart} min={today < DEFAULT_START ? today : undefined} max={addDays(RACE, -30)} onChange={(e) => setPlanStart(e.target.value)} />
          </Field>
          {validDates && (
            <div>
              {nCycles} Zyklen bis zum Renntag ({formatDE(RACE)}).
              {raceDay !== 4 && raceDay !== 5 && (
                <div className="banner" style={{ marginTop: 8 }}>
                  Achtung: Der Renntag fällt nach aktuellem Rhythmus auf Zyklustag {raceDay} ({CYCLE_DAY_INFO[raceDay].label}). Bitte rechtzeitig Schicht tauschen. Verschiebungen kannst du später jederzeit eintragen.
                </div>
              )}
            </div>
          )}
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!validDates} />
        </div>
      )}

      {step === 3 && (
        <div className="stack rise">
          <h2 className="px t10">Deine Startwerte</h2>
          <p className="muted">Saubere Wiederholungen am Stück. Daraus berechnet die App deine Satz-Vorgaben.</p>
          <div className="grid2">
            <Field label="KLIMMZÜGE">
              <NumInput value={pullups} onChange={setPullups} min={0} inputMode="numeric" />
            </Field>
            <Field label="LIEGESTÜTZE">
              <NumInput value={pushups} onChange={setPushups} min={0} inputMode="numeric" />
            </Field>
            <Field label="DIPS">
              <NumInput value={dips} onChange={setDips} min={0} inputMode="numeric" />
            </Field>
            <Field label="TUCK FL S (OPT.)">
              <NumInput value={fl} onChange={setFl} min={0} inputMode="numeric" />
            </Field>
            <Field label="LÄNGSTER LAUF (KM)">
              <NumInput value={longest} onChange={setLongest} min={0} max={50} />
            </Field>
            <Field label="GEWICHT KG (OPT.)">
              <NumInput value={weight} onChange={setWeight} min={30} max={200} />
            </Field>
          </div>
          <div className="muted">Längster Lauf der letzten 3 Monate. Die ersten 2 Zyklen sind wegen der Erkältung bewusst ein lockerer Wiedereinstieg mit Lauf/Geh-Wechsel.</div>
          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </div>
      )}

      {step === 4 && (
        <div className="stack rise">
          <div className="hero-scene" style={{ height: 200 }}>
            <Landscape world={1} className="land" />
            <div className="badge">WELT 1 · FLACHLAND</div>
            <div className="avatar">
              <Avatar look={{ ...look, equipped }} scale={4} floating />
            </div>
          </div>
          <h2 className="px t10">Bereit, {name.trim() || 'Held'}?</h2>
          <p>
            Dein Plan: {nCycles} Zyklen in 5 Welten – Wiedereinstieg, Grundlage, Höhe & Aufbau, Peak, Taper – und am Ende der Final Boss.
          </p>
          <p className="muted">Tipp: Füge die App über „Teilen → Zum Home-Bildschirm“ hinzu und mach regelmäßig ein Backup (Tab HELD).</p>
          <button
            className="btn primary big block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await completeOnboarding({
                heroName: name.trim() || 'Held',
                avatar: look,
                equipped,
                anchor,
                planStart,
                raceDate: RACE,
                initialLongRunKm: longest ?? 10,
                aufbauStart: defaultAufbauStart(cal, RACE),
                maxes: { pullups: pullups ?? 0, dips: dips ?? 0, pushups: pushups ?? 0, flTuckSec: fl, weightKg: weight },
                today,
              });
            }}
          >
            {busy ? 'Plan wird erstellt …' : 'Abenteuer beginnen'}
          </button>
          <button className="btn ghost block" onClick={() => setStep(3)}>
            Zurück
          </button>
        </div>
      )}
    </div>
  );
}

function Nav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <button className="btn ghost grow" onClick={onBack}>
        Zurück
      </button>
      <button className="btn primary grow big" onClick={onNext} disabled={nextDisabled}>
        Weiter
      </button>
    </div>
  );
}
