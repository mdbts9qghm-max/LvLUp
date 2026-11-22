import { useMemo, useState } from 'react';
import { bossById, plannedBossFor } from '../../core/bosses';
import { formatShort } from '../../core/dates';
import { energyAdvice, energyZone, ENERGY_COLORS } from '../../core/energy';
import type { MissReason, Session, SessionLog } from '../../core/types';
import { awardedXp } from '../../core/xp';
import { completeSession, markMissed, reopenSession, saveMaxtest } from '../../game/actions';
import { caliInstruction } from '../../plan/calisthenics';
import { PHASE_INFO } from '../../plan/constants';
import { fmtDuration } from '../../plan/templates';
import { Icon } from '../art/icons';
import { PixelSprite } from '../art/Pixel';
import { bossLayers } from '../art/bosses';
import { TYPE_COLORS, useGame, useUi } from '../game';
import { Field, Modal, NumInput } from './basics';

export function sessionInstruction(s: Session, skills: Set<string>, maxes: Parameters<typeof caliInstruction>[2]): string {
  if (s.kind === 'cali-main' || s.kind === 'cali-maint' || s.kind === 'cali-skill') return caliInstruction(s, skills, maxes);
  return s.instruction;
}

export function hardness(s: Session): 'hard' | 'easy' | 'rest' {
  if (s.type === 'Ruhe' || s.type === 'Mobility') return 'rest';
  if (['long', 'vert-steady', 'vert-intervals', 'legs-eccentric', 'cali-main', 'maxtest', 'race'].includes(s.kind)) return 'hard';
  return 'easy';
}

type Mode = 'intro' | 'view' | 'log' | 'missed' | 'maxtest';

export function SessionSheet({ id, onClose }: { id: number; onClose: () => void }) {
  const g = useGame();
  const ui = useUi();
  const s = g.sessions.find((x) => x.id === id);
  const openSessions = useMemo(() => g.sessions.filter((x) => x.status === 'open'), [g.sessions]);
  const bossId = s && s.status === 'open' ? plannedBossFor(s, openSessions, g.bosses) : undefined;
  const boss = bossId ? bossById(bossId) : undefined;
  const [mode, setMode] = useState<Mode>(boss ? 'intro' : 'view');
  if (!s) return null;

  const rec = g.recovery.find((r) => r.date === s.date);
  const zone = rec?.recoveryPct !== undefined ? energyZone(rec.recoveryPct) : undefined;
  const color = TYPE_COLORS[s.type];

  if (mode === 'intro' && boss) {
    return (
      <Modal onClose={onClose} center>
        <div className="stack center">
          <div className="px t8 rust">BOSSKAMPF</div>
          <div className="floaty" style={{ display: 'inline-block' }}>
            <PixelSprite layers={bossLayers(boss.sprite, boss.color)} width={16} height={16} scale={8} title={boss.name} />
          </div>
          <div className="px t12">{boss.name}</div>
          <p>{boss.intro}</p>
          <p className="muted">Ziel: {boss.goal}</p>
          <button className="btn primary big block" onClick={() => setMode('view')}>
            Kampf annehmen
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={mode === 'log' ? 'Quest abschließen' : mode === 'missed' ? 'Verpasst' : mode === 'maxtest' ? 'Maxtest eintragen' : undefined} onClose={onClose}>
      {mode === 'view' && (
        <div className="stack">
          <div className="row between">
            <span className="type-tag" style={{ color }}>
              {s.type.toUpperCase()}
            </span>
            <span className="xp-tag">+{s.xp} XP</span>
          </div>
          <h2 className="px t12" style={{ margin: 0 }}>
            {s.title}
          </h2>
          <div className="muted">
            Zyklus {s.cycleNo} · Tag {s.cycleDay} · {formatShort(s.date)} · {PHASE_INFO[s.phase].name}
            {s.reentry ? ' · Wiedereinstieg' : ''} · {fmtDuration(s.durationMin)}
          </div>
          {boss && (
            <div className="banner">
              <span className="px t8 gold">BOSS: {boss.name}</span>
              <div>{boss.goal}</div>
            </div>
          )}
          {zone && s.status === 'open' && (
            <div className={`banner ${zone === 'green' ? 'green' : zone === 'red' ? 'red' : ''}`}>
              <span className="px t8" style={{ color: ENERGY_COLORS[zone] }}>
                ENERGIE {rec!.recoveryPct} %
              </span>
              <div>{energyAdvice(zone, hardness(s))}</div>
            </div>
          )}
          <div className="card flat">
            <h3>ANWEISUNG</h3>
            <div className="pre">{sessionInstruction(s, g.skills, g.progress.maxes)}</div>
          </div>
          <div className="card flat">
            <h3>WARUM HEUTE?</h3>
            <div>{s.why}</div>
          </div>
          {s.status === 'done' && (
            <div className="banner green">
              <div className="px t8 green">ERLEDIGT · +{s.xpAwarded ?? 0} XP{s.swapped ? ' · durch Erholung ersetzt' : ''}</div>
              <LogSummary log={s.log} />
            </div>
          )}
          {s.status === 'missed' && <div className="banner">Verpasst ({s.missReason === 'zusatzschicht' ? 'Zusatzschicht' : s.missReason === 'krank' ? 'krank' : 'sonstiger Grund'}). Kein XP-Verlust.</div>}
          {s.status === 'paused' && <div className="banner">Pausiert wegen Krankheit. Zählt nicht gegen dich.</div>}

          {s.status === 'open' ? (
            <div className="stack-s">
              {s.date > g.today && <div className="muted">Hinweis: Diese Einheit liegt in der Zukunft ({formatShort(s.date)}).</div>}
              <button className="btn primary big block" onClick={() => setMode(s.kind === 'maxtest' ? 'maxtest' : 'log')}>
                <Icon name="check" size={14} /> Quest abschließen
              </button>
              {zone === 'red' && hardness(s) !== 'rest' && (
                <button
                  className="btn block"
                  onClick={async () => {
                    const r = await completeSession(s.id!, { note: 'Durch Erholung ersetzt (Energie rot)', durationMin: 30 }, { swapped: true });
                    ui.toast(`Durch Erholung ersetzt · +${r.xpGained} XP`);
                    onClose();
                  }}
                >
                  Durch Erholung ersetzen (+{awardedXp(s.xp, true)} XP)
                </button>
              )}
              {!s.optional && s.type !== 'Ruhe' && (
                <button className="btn ghost block" onClick={() => setMode('missed')}>
                  Verpasst / ausgefallen
                </button>
              )}
            </div>
          ) : (
            <div className="row">
              {s.status !== 'done' && (
                <button className="btn grow" onClick={() => setMode(s.kind === 'maxtest' ? 'maxtest' : 'log')}>
                  Doch erledigt
                </button>
              )}
              <button
                className="btn ghost grow"
                onClick={async () => {
                  await reopenSession(s.id!);
                  ui.toast('Zurückgesetzt');
                }}
              >
                Rückgängig
              </button>
            </div>
          )}
        </div>
      )}
      {mode === 'log' && (
        <LogForm
          s={s}
          onCancel={() => setMode('view')}
          onSave={async (log) => {
            const r = await completeSession(s.id!, log);
            onClose();
            ui.showReward(r);
          }}
        />
      )}
      {mode === 'maxtest' && (
        <MaxtestForm
          defaults={g.progress.maxes}
          onCancel={() => setMode('view')}
          onSave={async (m) => {
            const r = await saveMaxtest({ date: s.date <= g.today ? s.date : g.today, ...m }, s.id!);
            onClose();
            ui.showReward(r);
          }}
        />
      )}
      {mode === 'missed' && (
        <MissedForm
          onCancel={() => setMode('view')}
          onSave={async (reason) => {
            const diff = await markMissed(s.id!, reason);
            onClose();
            if (diff) ui.showDiff('Plan angepasst', diff);
            else ui.toast('Als verpasst markiert – kein XP-Verlust.');
          }}
        />
      )}
    </Modal>
  );
}

function LogSummary({ log }: { log?: SessionLog }) {
  if (!log) return null;
  const parts: string[] = [];
  if (log.distanceKm !== undefined) parts.push(`${log.distanceKm} km`);
  if (log.elevationM !== undefined) parts.push(`${log.elevationM} hm`);
  if (log.durationMin !== undefined) parts.push(fmtDuration(log.durationMin));
  if (log.avgHr !== undefined) parts.push(`Ø ${log.avgHr} bpm`);
  if (log.rpe !== undefined) parts.push(`RPE ${log.rpe}`);
  if (log.sets) parts.push(log.sets);
  if (log.holdSec !== undefined) parts.push(`${log.holdSec} s Hold`);
  return (
    <div>
      {parts.join(' · ')}
      {log.note && <div className="muted">„{log.note}“</div>}
    </div>
  );
}

function LogForm({ s, onSave, onCancel }: { s: Session; onSave: (l: SessionLog) => void; onCancel: () => void }) {
  const isRun = s.type === 'Lauf' || s.type === 'Höhenmeter';
  const isStrength = s.type === 'Calisthenics' || s.type === 'Kraft';
  const [log, setLog] = useState<SessionLog>({
    distanceKm: isRun ? s.distanceKm : undefined,
    elevationM: isRun ? (s.elevationM ?? 0) : undefined,
    durationMin: s.durationMin,
  });
  const set = (p: Partial<SessionLog>) => setLog((l) => ({ ...l, ...p }));
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(log);
      }}
    >
      <div className="muted">{s.title}</div>
      {isRun && (
        <div className="grid2">
          <Field label="DISTANZ (KM)">
            <NumInput value={log.distanceKm} onChange={(v) => set({ distanceKm: v })} min={0} />
          </Field>
          <Field label="HÖHENMETER">
            <NumInput value={log.elevationM} onChange={(v) => set({ elevationM: v })} min={0} inputMode="numeric" />
          </Field>
        </div>
      )}
      <div className="grid2">
        <Field label="DAUER (MIN)">
          <NumInput value={log.durationMin} onChange={(v) => set({ durationMin: v })} min={0} inputMode="numeric" />
        </Field>
        {isRun ? (
          <Field label="Ø-PULS (OPTIONAL)">
            <NumInput value={log.avgHr} onChange={(v) => set({ avgHr: v })} min={40} max={220} inputMode="numeric" />
          </Field>
        ) : (
          <Field label="HALTEZEIT S (OPT.)">
            <NumInput value={log.holdSec} onChange={(v) => set({ holdSec: v })} min={0} inputMode="numeric" />
          </Field>
        )}
      </div>
      {isStrength && (
        <Field label="SÄTZE × WDH. (Z. B. 4×6 KLIMMZÜGE)">
          <input className="inp" value={log.sets ?? ''} onChange={(e) => set({ sets: e.target.value })} placeholder="4×6 Klimmzüge, 3×8 Dips" />
        </Field>
      )}
      <Field label={`ANSTRENGUNG (RPE) ${log.rpe ?? '–'} / 10`} group>
        <div className="row wrap" style={{ gap: 4 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className={`chip ${log.rpe === n ? 'on' : ''}`} style={{ minWidth: 40 }} onClick={() => set({ rpe: n })} aria-pressed={log.rpe === n}>
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="NOTIZ">
        <textarea className="inp" value={log.note ?? ''} onChange={(e) => set({ note: e.target.value })} placeholder="Wie lief's? Beine, Magen, Stimmung …" />
      </Field>
      <div className="row">
        <button type="button" className="btn ghost grow" onClick={onCancel}>
          Zurück
        </button>
        <button type="submit" className="btn primary grow big">
          Speichern
        </button>
      </div>
    </form>
  );
}

export interface MaxValues {
  pullups?: number;
  dips?: number;
  pushups?: number;
  flTuckSec?: number;
  weightKg?: number;
}

export function MaxtestForm({ defaults, onSave, onCancel }: { defaults: { pullups: number; dips: number; pushups: number; flTuckSec: number }; onSave: (m: MaxValues) => void; onCancel: () => void }) {
  const [m, setM] = useState<MaxValues>({});
  const set = (p: Partial<MaxValues>) => setM((x) => ({ ...x, ...p }));
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(m);
      }}
    >
      <div className="muted">Saubere Wiederholungen am Stück. Letzter Stand in Klammern. Leere Felder werden nicht geändert.</div>
      <div className="grid2">
        <Field label={`KLIMMZÜGE (${defaults.pullups})`}>
          <NumInput value={m.pullups} onChange={(v) => set({ pullups: v })} min={0} inputMode="numeric" />
        </Field>
        <Field label={`DIPS (${defaults.dips})`}>
          <NumInput value={m.dips} onChange={(v) => set({ dips: v })} min={0} inputMode="numeric" />
        </Field>
        <Field label={`LIEGESTÜTZE (${defaults.pushups})`}>
          <NumInput value={m.pushups} onChange={(v) => set({ pushups: v })} min={0} inputMode="numeric" />
        </Field>
        <Field label={`TUCK FL S (${defaults.flTuckSec})`}>
          <NumInput value={m.flTuckSec} onChange={(v) => set({ flTuckSec: v })} min={0} inputMode="numeric" />
        </Field>
        <Field label="GEWICHT KG (OPT.)">
          <NumInput value={m.weightKg} onChange={(v) => set({ weightKg: v })} min={30} max={200} />
        </Field>
      </div>
      <div className="row">
        <button type="button" className="btn ghost grow" onClick={onCancel}>
          Zurück
        </button>
        <button type="submit" className="btn primary grow big">
          Speichern
        </button>
      </div>
    </form>
  );
}

function MissedForm({ onSave, onCancel }: { onSave: (r: MissReason) => void; onCancel: () => void }) {
  return (
    <div className="stack">
      <p>Kein Problem – der Plan passt sich an, statt dich zu bestrafen. Kein XP-Verlust. Warum ist die Einheit ausgefallen?</p>
      <button className="btn block" onClick={() => onSave('zusatzschicht')}>
        Zusatzschicht / Arbeit
      </button>
      <div className="muted">Streak bleibt eingefroren.</div>
      <button className="btn block" onClick={() => onSave('sonstiges')}>
        Sonstiger Grund
      </button>
      <div className="muted">Streak beginnt neu. Bei Schlüsseleinheiten (langer Lauf, Höhenmeter) wird der Rest des Plans neu berechnet.</div>
      <div className="muted">Krank? Nutze lieber den Krank-Modus auf dem Startbildschirm – dann pausiert der ganze Plan.</div>
      <button className="btn ghost block" onClick={onCancel}>
        Zurück
      </button>
    </div>
  );
}
