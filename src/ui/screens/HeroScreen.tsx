import { useRef, useState } from 'react';
import { ATTRS } from '../../core/attributes';
import { bossById } from '../../core/bosses';
import { cycleDayFor, CYCLE_DAY_INFO } from '../../core/cycle';
import { addDays, formatDE, formatShort } from '../../core/dates';
import { GEAR, isGearUnlocked, unlockText, type GearSlot } from '../../core/gear';
import { parseWhoopCsv } from '../../core/whoop';
import { titleForLevel } from '../../core/xp';
import { saveSettings } from '../../db/db';
import {
  addExtraShift,
  addShiftAdjustment,
  exportBackup,
  importBackup,
  importRecovery,
  markBackupDone,
  removeExtraShift,
  removeShiftAdjustment,
  resetAll,
  validateBackup,
} from '../../game/actions';
import { BEARD_STYLES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES } from '../art/avatar';
import { Icon } from '../art/icons';
import { Avatar, Bar, ChipGroup, Field, Modal } from '../components/basics';
import { useGame, useUi } from '../game';
import { downloadBackup, readFileText } from './data';
import { DISCLAIMER } from './Onboarding';

const SLOT_NAMES: Record<GearSlot, string> = { outfit: 'Outfit', head: 'Kopf', body: 'Körper', hands: 'Hände', legs: 'Beine', shoes: 'Schuhe' };

export function HeroScreen() {
  const g = useGame();
  const { level, attrs, streak } = g.progress;
  const look = { ...g.settings.avatar, equipped: g.settings.equipped, wounded: !!g.settings.sick };
  const [editLook, setEditLook] = useState(false);
  return (
    <div className="stack">
      <header className="topbar">
        <h1 className="screen-title">HELD</h1>
        <span className="px t8 muted">{g.settings.heroName}</span>
      </header>

      <section className="card hero row" style={{ gap: 16 }}>
        <div style={{ background: '#1C1530', border: '2px solid var(--text)', padding: 8, lineHeight: 0 }}>
          <Avatar look={look} scale={4} />
        </div>
        <div className="grow stack-s">
          <div className="px t10">{g.settings.heroName}</div>
          <div className="px t8 gold">
            LV {level.level} · {titleForLevel(level.level).toUpperCase()}
          </div>
          <div className="muted">{level.total} XP gesamt · Bester Streak {streak.best}</div>
          <button className="btn" onClick={() => setEditLook(true)}>
            Aussehen
          </button>
        </div>
      </section>

      <div className="section-label">Ausrüstung</div>
      <GearSection />

      <div className="section-label">Attribute</div>
      <section className="card stack-s">
        {ATTRS.map((a) => (
          <div key={a.id}>
            <div className="row between">
              <span className="px t8" style={{ color: a.color }}>
                {a.name.toUpperCase()}
              </span>
              <span className="px t8">LV {attrs[a.id].level}</span>
            </div>
            <Bar value={attrs[a.id].progress} max={1} color={a.color} label={a.name} />
            <div className="muted" style={{ fontSize: 17 }}>
              {a.source}
            </div>
          </div>
        ))}
      </section>

      <div className="section-label">Schicht & Plan</div>
      <ShiftSection />

      <div className="section-label">Daten</div>
      <DataSection />

      <div className="section-label">Über</div>
      <section className="card stack-s">
        <div className="px t8">HINWEIS</div>
        <div>{DISCLAIMER}</div>
        <div className="muted">
          Soul Quest speichert alles nur lokal auf diesem Gerät. Kein Account, kein Server, kein Tracking. Schriften: Press Start 2P und VT323 (SIL Open Font License). Grafiken selbst erstellt.
        </div>
      </section>
      {editLook && <LookModal onClose={() => setEditLook(false)} />}
    </div>
  );
}

function LookModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [a, setA] = useState(g.settings.avatar);
  const [name, setName] = useState(g.settings.heroName);
  return (
    <Modal title="Aussehen" onClose={onClose}>
      <AvatarEditor value={a} onChange={setA} equipped={g.settings.equipped} name={name} onName={setName} />
      <button
        className="btn primary big block"
        style={{ marginTop: 16 }}
        onClick={async () => {
          await saveSettings({ avatar: a, heroName: name.trim() || 'Held' });
          onClose();
        }}
      >
        Speichern
      </button>
    </Modal>
  );
}

export function AvatarEditor({
  value,
  onChange,
  equipped,
  name,
  onName,
}: {
  value: { hair: string; hairColor: string; beard: string; skin: string };
  onChange: (v: { hair: string; hairColor: string; beard: string; skin: string }) => void;
  equipped: Record<string, string | null | undefined>;
  name: string;
  onName: (n: string) => void;
}) {
  const label = (r: Record<string, { label: string }>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.label]));
  return (
    <div className="stack">
      <div className="center" style={{ background: '#1C1530', border: '3px solid var(--text)', padding: 12, lineHeight: 0 }}>
        <Avatar look={{ ...value, equipped }} scale={6} />
      </div>
      <Field label="HELDENNAME">
        <input className="inp" value={name} maxLength={16} onChange={(e) => onName(e.target.value)} />
      </Field>
      <Field label="FRISUR" group>
        <ChipGroup options={HAIR_STYLES} value={value.hair} onChange={(hair) => onChange({ ...value, hair })} />
      </Field>
      <Field label="HAARFARBE" group>
        <ChipGroup options={label(HAIR_COLORS)} value={value.hairColor} onChange={(hairColor) => onChange({ ...value, hairColor })} />
      </Field>
      <Field label="BART" group>
        <ChipGroup options={BEARD_STYLES} value={value.beard} onChange={(beard) => onChange({ ...value, beard })} />
      </Field>
      <Field label="HAUTTON" group>
        <ChipGroup options={label(SKIN_TONES)} value={value.skin} onChange={(skin) => onChange({ ...value, skin })} />
      </Field>
    </div>
  );
}

function GearSection() {
  const g = useGame();
  const defeated = g.bosses;
  const slots: GearSlot[] = ['outfit', 'head', 'body', 'hands', 'legs', 'shoes'];
  const equip = async (slot: GearSlot, id: string | null) => {
    await saveSettings({ equipped: { ...g.settings.equipped, [slot]: id } });
  };
  return (
    <section className="card stack">
      {slots.map((slot) => {
        const items = GEAR.filter((x) => x.slot === slot);
        const optional = slot !== 'outfit' && slot !== 'shoes';
        return (
          <div key={slot}>
            <div className="px t8 muted" style={{ marginBottom: 6 }}>
              {SLOT_NAMES[slot].toUpperCase()}
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {optional && (
                <button className={`chip ${!g.settings.equipped[slot] ? 'on' : ''}`} onClick={() => equip(slot, null)}>
                  Nichts
                </button>
              )}
              {items.map((it) => {
                const unlocked = isGearUnlocked(it, g.progress.level.level, defeated);
                const on = g.settings.equipped[slot] === it.id;
                return (
                  <button
                    key={it.id}
                    className={`chip ${on ? 'on' : ''}`}
                    disabled={!unlocked}
                    onClick={() => unlocked && equip(slot, it.id)}
                    title={unlocked ? it.desc : unlockText(it, (id) => bossById(id)?.name ?? id)}
                    style={{ opacity: unlocked ? 1 : 0.55 }}
                    aria-pressed={on}
                  >
                    {!unlocked && <Icon name="lock" size={8} />} {it.name}
                    {!unlocked && <span className="muted"> · {unlockText(it, (id) => bossById(id)?.name ?? id)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function ShiftSection() {
  const g = useGame();
  const ui = useUi();
  const s = g.settings;
  const [shiftFrom, setShiftFrom] = useState(g.today);
  const [shiftDays, setShiftDays] = useState(1);
  const [extra, setExtra] = useState(addDays(g.today, 1));
  const preview = Array.from({ length: 10 }, (_, i) => addDays(shiftFrom, i - 2));
  const previewAdj = [...s.shiftAdjustments, { id: 'preview', from: shiftFrom, days: shiftDays }];
  const raceDay = cycleDayFor(s.raceDate, s.anchor, s.shiftAdjustments);
  return (
    <section className="card stack">
      <div>
        Zyklus-Anker: Tag 1 am <b>{formatDE(s.anchor)}</b>. Planstart {formatDE(s.planStart)}, Renntag {formatDE(s.raceDate)} ({s.raceTime} Uhr).
      </div>
      {raceDay !== 4 && raceDay !== 5 && (
        <div className="banner">
          Achtung: Der Renntag fällt auf Zyklustag {raceDay} ({CYCLE_DAY_INFO[raceDay].label}). Rechtzeitig Schicht tauschen und den Tag davor freihalten!
        </div>
      )}

      <div className="card flat stack-s">
        <h3>ZYKLUS VERSCHIEBEN</h3>
        <div className="muted">Schichttausch? Ab einem Datum verschiebt sich dein Rhythmus. Beispiel: Die Tagschicht kommt 2 Tage später → +2. Der Plan rückt nach, statt Einheiten zu verlieren.</div>
        <div className="grid2">
          <Field label="AB DATUM">
            <input className="inp" type="date" value={shiftFrom} min={s.planStart} max={s.raceDate} onChange={(e) => setShiftFrom(e.target.value)} />
          </Field>
          <Field label="TAGE (+/−)">
            <select className="inp" value={shiftDays} onChange={(e) => setShiftDays(Number(e.target.value))}>
              {[-4, -3, -2, -1, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n > 0 ? `+${n}` : n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="muted" style={{ fontSize: 17 }}>
          Vorschau:{' '}
          {preview.map((d) => (
            <span key={d} style={{ marginRight: 8, color: d >= shiftFrom ? 'var(--text)' : undefined }}>
              {formatShort(d).split(' ').slice(1).join(' ')}: T{cycleDayFor(d, s.anchor, previewAdj)}
            </span>
          ))}
        </div>
        <button
          className="btn block"
          onClick={async () => {
            const diff = await addShiftAdjustment(shiftFrom, shiftDays, g.today);
            ui.showDiff('Zyklus verschoben', diff);
          }}
        >
          Verschieben
        </button>
        {s.shiftAdjustments.map((a) => (
          <div key={a.id} className="row between">
            <span>
              Ab {formatShort(a.from)}: {a.days > 0 ? '+' : ''}
              {a.days} Tag(e)
            </span>
            <button
              className="btn ghost"
              onClick={async () => {
                const diff = await removeShiftAdjustment(a.id, g.today);
                ui.showDiff('Verschiebung entfernt', diff);
              }}
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>

      <div className="card flat stack-s">
        <h3>ZUSATZSCHICHT</h3>
        <div className="muted">An einem eigentlich freien Tag arbeiten? Der Tag wird blockiert, wichtige Einheiten werden verlegt.</div>
        <div className="row">
          <input className="inp grow" type="date" value={extra} min={s.planStart} max={s.raceDate} onChange={(e) => setExtra(e.target.value)} />
          <button
            className="btn"
            onClick={async () => {
              const diff = await addExtraShift(extra, g.today);
              ui.showDiff('Zusatzschicht eingetragen', diff);
            }}
          >
            <Icon name="plus" size={12} />
          </button>
        </div>
        {s.blockedDates.map((d) => (
          <div key={d} className="row between">
            <span>{formatShort(d)}</span>
            <button
              className="btn ghost"
              onClick={async () => {
                const diff = await removeExtraShift(d, g.today);
                ui.showDiff('Zusatzschicht entfernt', diff);
              }}
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>

      {g.planEvents.length > 0 && (
        <div className="card flat stack-s">
          <h3>PLAN-ÄNDERUNGEN</h3>
          {g.planEvents.slice(0, 10).map((e) => (
            <button key={e.id} className="sess-line" onClick={() => e.diff && ui.showDiff(e.title, e.diff)} disabled={!e.diff}>
              <span className="ttl grow">
                {formatShort(e.at.slice(0, 10))}: {e.title}
              </span>
              {e.diff && <span className="link px t7">DETAILS</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function DataSection() {
  const g = useGame();
  const ui = useUi();
  const backupInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <section className="card stack">
      <div className="muted">
        Deine Daten liegen nur auf diesem iPhone. Sichere sie regelmäßig als Datei (z. B. in iCloud Drive über „In Dateien sichern“).
        {g.settings.lastBackupAt ? ` Letztes Backup: ${formatShort(g.settings.lastBackupAt.slice(0, 10))}.` : ' Noch kein Backup.'}
      </div>
      <button
        className="btn primary block"
        onClick={async () => {
          downloadBackup(await exportBackup());
          await markBackupDone();
          ui.toast('Backup erstellt');
        }}
      >
        <Icon name="download" size={12} /> Backup exportieren
      </button>
      <button className="btn block" onClick={() => backupInput.current?.click()}>
        <Icon name="upload" size={12} /> Backup importieren
      </button>
      <input
        ref={backupInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const json = JSON.parse(await readFileText(f));
            if (!validateBackup(json)) throw new Error('Keine gültige Soul-Quest-Sicherung.');
            if (!confirm(`Backup vom ${json.exportedAt.slice(0, 10)} laden? Der aktuelle Stand auf diesem Gerät wird ersetzt.`)) return;
            await importBackup(json);
            ui.toast('Backup geladen');
          } catch (err) {
            alert(`Import fehlgeschlagen: ${(err as Error).message}`);
          }
        }}
      />
      <div className="card flat stack-s">
        <h3>WHOOP-CSV IMPORT</h3>
        <div className="muted">
          WHOOP-App → Profil → Einstellungen → Daten exportieren. In der ZIP-Datei liegt <b>physiological_cycles.csv</b> – diese Datei hier auswählen. Recovery, Schlaf, HRV und Ruhepuls werden übernommen.
        </div>
        <button className="btn block" onClick={() => csvInput.current?.click()}>
          CSV auswählen
        </button>
        <input
          ref={csvInput}
          type="file"
          accept=".csv,text/csv,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const res = parseWhoopCsv(await readFileText(f));
            if (!res.entries.length) {
              alert(`Keine Daten erkannt. Erkannte Spalten: ${res.recognized.join(', ') || 'keine'}.`);
              return;
            }
            const n = await importRecovery(res.entries);
            ui.toast(`${n} Tage importiert (${res.recognized.join(', ')})`);
          }}
        />
      </div>
      {!confirmReset ? (
        <button className="btn danger block" onClick={() => setConfirmReset(true)}>
          Alles zurücksetzen
        </button>
      ) : (
        <div className="banner red stack-s">
          <div>Wirklich alle Daten löschen? Das kann nicht rückgängig gemacht werden. Vorher ein Backup machen!</div>
          <div className="row">
            <button className="btn ghost grow" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </button>
            <button
              className="btn danger grow"
              onClick={async () => {
                await resetAll();
                location.reload();
              }}
            >
              Löschen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
