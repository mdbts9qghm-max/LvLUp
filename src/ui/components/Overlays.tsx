import { useEffect, useState } from 'react';
import { bossById } from '../../core/bosses';
import { addDays, formatShort } from '../../core/dates';
import { energySegments, energyZone, ENERGY_COLORS } from '../../core/energy';
import type { RecoveryEntry } from '../../core/whoop';
import { titleForLevel } from '../../core/xp';
import { endSick, startSick, saveRecovery, type Reward } from '../../game/actions';
import type { PlanDiff } from '../../plan/reschedule';
import { PixelSprite } from '../art/Pixel';
import { bossLayers } from '../art/bosses';
import { Icon } from '../art/icons';
import { useGame, useUi } from '../game';
import { Avatar, Field, Modal, NumInput, SegBar } from './basics';

/** Belohnungen nacheinander: Boss-Sieg → Level-Up → Ausrüstung → XP. */
export function RewardOverlay({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const g = useGame();
  const steps: ('boss' | 'level' | 'gear' | 'xp')[] = [];
  reward.bosses.forEach(() => steps.push('boss'));
  if (reward.levelAfter > reward.levelBefore) steps.push('level');
  if (reward.gear.length) steps.push('gear');
  if (!steps.length) steps.push('xp');
  const [i, setI] = useState(0);
  const [bossIdx, setBossIdx] = useState(0);
  const [shattered, setShattered] = useState(false);
  const step = steps[i];
  useEffect(() => {
    setShattered(false);
    if (step === 'boss') {
      const t = setTimeout(() => setShattered(true), 900);
      return () => clearTimeout(t);
    }
  }, [step, bossIdx]);
  const next = () => {
    if (step === 'boss') setBossIdx((b) => b + 1);
    if (i + 1 < steps.length) setI(i + 1);
    else onClose();
  };
  const boss = step === 'boss' ? bossById(reward.bosses[bossIdx]) : undefined;
  const look = { ...g.settings.avatar, equipped: g.settings.equipped };
  return (
    <Modal center>
      {step === 'boss' && <div className="flash" key={`f${bossIdx}`} />}
      <div className="stack center" key={`${step}-${bossIdx}`}>
        {step === 'boss' && boss && (
          <>
            <div className="px t14 gold rise">SIEG!</div>
            <div style={{ height: 136, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!shattered ? (
                <PixelSprite layers={bossLayers(boss.sprite, boss.color)} width={16} height={16} scale={8} />
              ) : (
                <div className="shatter">
                  <PixelSprite layers={bossLayers(boss.sprite, boss.color)} width={16} height={16} scale={8} />
                </div>
              )}
            </div>
            <div className="px t10">{boss.name} besiegt</div>
            <p className="muted">{boss.goal}</p>
            <div className="xp-tag">+150 XP BOSS-BONUS</div>
          </>
        )}
        {step === 'level' && (
          <>
            <div className="px t14 gold rise">LEVEL UP!</div>
            <Avatar look={look} scale={5} floating />
            <div className="px t12">
              LV {reward.levelAfter} · {titleForLevel(reward.levelAfter).toUpperCase()}
            </div>
            <p className="muted">Dein Held wird stärker. Weiter so – Schritt für Schritt.</p>
          </>
        )}
        {step === 'gear' && (
          <>
            <div className="px t12 gold rise">NEUE AUSRÜSTUNG</div>
            {reward.gear.map((it) => (
              <div key={it.id} className="card flat">
                <div className="px t9">{it.name}</div>
                <div className="muted">{it.desc}</div>
              </div>
            ))}
            <p className="muted">Anlegen im Tab HELD.</p>
          </>
        )}
        {step === 'xp' && (
          <>
            <div className="px t12 rise">QUEST ERFÜLLT</div>
            <div className="px t16 gold">+{reward.xpGained} XP</div>
          </>
        )}
        <button className="btn primary big block" onClick={next}>
          Weiter
        </button>
      </div>
    </Modal>
  );
}

export function DiffModal({ title, diff, onClose }: { title: string; diff: PlanDiff; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose} center>
      <div className="stack">
        <p>Der restliche Plan bis zum Renntag wurde neu berechnet.</p>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {diff.messages.map((m, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {m}
            </li>
          ))}
        </ul>
        <div className="grid2">
          <div className="card flat">
            <div className="px t7 muted">VORHER</div>
            <div>Längster Lauf {diff.before.peakLongKm} km</div>
            <div>{diff.before.totalKm} km · {diff.before.totalHm} hm</div>
          </div>
          <div className={`card flat ${diff.tight ? 'rust-border' : ''}`}>
            <div className="px t7 muted">JETZT</div>
            <div>Längster Lauf {diff.after.peakLongKm} km</div>
            <div>{diff.after.totalKm} km · {diff.after.totalHm} hm</div>
          </div>
        </div>
        {diff.dropped.length > 0 && (
          <div className="card flat">
            <h3>GESTRICHEN / VERDRÄNGT</h3>
            {diff.dropped.map((d, i) => (
              <div key={i}>
                {formatShort(d.date)}: {d.title} <span className="muted">({d.reason})</span>
              </div>
            ))}
          </div>
        )}
        <button className="btn primary block" onClick={onClose}>
          Verstanden
        </button>
      </div>
    </Modal>
  );
}

export function RecoveryModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const ui = useUi();
  const [date, setDate] = useState(g.today);
  const existing = g.recovery.find((r) => r.date === date);
  const [e, setE] = useState<Partial<RecoveryEntry>>(existing ?? {});
  const [sleepH, setSleepH] = useState<number | undefined>(existing?.sleepMin !== undefined ? Math.floor(existing.sleepMin / 60) : undefined);
  const [sleepM, setSleepM] = useState<number | undefined>(existing?.sleepMin !== undefined ? Math.round(existing.sleepMin % 60) : undefined);
  const zone = e.recoveryPct !== undefined ? energyZone(e.recoveryPct) : undefined;
  return (
    <Modal title="Erholung (WHOOP)" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (ev) => {
          ev.preventDefault();
          const sleepMin = sleepH !== undefined || sleepM !== undefined ? (sleepH ?? 0) * 60 + (sleepM ?? 0) : undefined;
          await saveRecovery({ date, recoveryPct: e.recoveryPct, sleepMin, hrv: e.hrv, rhr: e.rhr });
          ui.toast('Erholung gespeichert');
          onClose();
        }}
      >
        <Field label="DATUM">
          <input className="inp" type="date" value={date} max={g.today} onChange={(x) => setDate(x.target.value)} />
        </Field>
        <Field label="RECOVERY %">
          <NumInput value={e.recoveryPct} onChange={(v) => setE({ ...e, recoveryPct: v === undefined ? undefined : Math.max(0, Math.min(100, v)) })} min={0} max={100} inputMode="numeric" />
        </Field>
        {zone && <SegBar filled={energySegments(e.recoveryPct!)} color={ENERGY_COLORS[zone]} label="Energie" />}
        <div className="grid2">
          <Field label="SCHLAF STUNDEN">
            <NumInput value={sleepH} onChange={setSleepH} min={0} max={16} inputMode="numeric" />
          </Field>
          <Field label="MINUTEN">
            <NumInput value={sleepM} onChange={setSleepM} min={0} max={59} inputMode="numeric" />
          </Field>
          <Field label="HRV MS (OPT.)">
            <NumInput value={e.hrv} onChange={(v) => setE({ ...e, hrv: v })} min={0} inputMode="numeric" />
          </Field>
          <Field label="RUHEPULS (OPT.)">
            <NumInput value={e.rhr} onChange={(v) => setE({ ...e, rhr: v })} min={20} max={150} inputMode="numeric" />
          </Field>
        </div>
        <div className="muted">Mehrere Tage auf einmal? CSV-Import aus dem WHOOP-Export unter HELD → Daten.</div>
        <button type="submit" className="btn primary big block">
          Speichern
        </button>
      </form>
    </Modal>
  );
}

export function SickModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const ui = useUi();
  const sick = g.settings.sick;
  const [since, setSince] = useState(g.today);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (sick) {
    return (
      <Modal title="Verwundet" onClose={onClose}>
        <div className="stack">
          <div className="center">
            <Avatar look={{ ...g.settings.avatar, equipped: g.settings.equipped, wounded: true }} scale={4} />
          </div>
          <p>
            Krank seit {formatShort(sick.since)}
            {sick.note ? ` (${sick.note})` : ''}. Dein Plan ist pausiert, dein Streak eingefroren, deine XP sind sicher.
          </p>
          <SickRules />
          <p className="muted">
            Wieder gesund heißt: 24–48 h symptomfrei, kein Fieber. Danach startet automatisch ein Wiedereinstieg mit reduzierter Last, abhängig von der Pausendauer.
          </p>
          <button
            className="btn primary big block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const diff = await endSick(g.today);
              onClose();
              ui.showDiff('Wieder gesund!', diff);
            }}
          >
            Wieder gesund
          </button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Ich bin krank" onClose={onClose}>
      <div className="stack">
        <SickRules />
        <Field label="KRANK SEIT">
          <input className="inp" type="date" value={since} min={addDays(g.today, -14)} max={g.today} onChange={(e) => setSince(e.target.value)} />
        </Field>
        <Field label="NOTIZ (OPTIONAL)">
          <input className="inp" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Schnupfen, Fieber" />
        </Field>
        <p className="muted">Der Plan pausiert. Kein XP-Verlust, der Streak wird eingefroren. Gute Besserung!</p>
        <button
          className="btn primary big block"
          onClick={async () => {
            await startSick(since, note || undefined);
            ui.toast('Gute Besserung. Plan pausiert.');
            onClose();
          }}
        >
          Plan pausieren
        </button>
      </div>
    </Modal>
  );
}

export function SickRules() {
  return (
    <div className="card flat">
      <h3>DIE NACKEN-REGEL</h3>
      <div>
        <b>Nur oberhalb des Halses</b> (Schnupfen, leichtes Halskratzen): höchstens sehr locker bewegen, z. B. Spaziergang.
      </div>
      <div style={{ marginTop: 6 }}>
        <b>Fieber oder Symptome unterhalb des Halses</b> (Husten, Gliederschmerzen, Magen-Darm): <span className="rust">kein Training.</span> Bei Fieber droht eine Herzmuskelentzündung.
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        Im Zweifel: ärztlich abklären lassen.
      </div>
    </div>
  );
}

export function Toast({ msg }: { msg: string }) {
  return (
    <div role="status" style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--safe-bottom) + 76px)', zIndex: 70, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="card shadow rise row" style={{ maxWidth: 440 }}>
        <Icon name="check" size={14} />
        <span>{msg}</span>
      </div>
    </div>
  );
}
