import { useState } from 'react';
import { ATTRS } from '../../core/attributes';
import { CYCLE_DAY_INFO } from '../../core/cycle';
import { diffDays, formatShort } from '../../core/dates';
import { energySegments, energyZone, ENERGY_COLORS } from '../../core/energy';
import { titleForLevel } from '../../core/xp';
import { markBackupDone, exportBackup } from '../../game/actions';
import { backupDue } from '../../game/progress';
import { saveSettings } from '../../db/db';
import { PHASE_INFO } from '../../plan/constants';
import { fmtDuration } from '../../plan/templates';
import { Flame, Icon } from '../art/icons';
import { Landscape } from '../art/Landscape';
import { Avatar, Bar, SegBar } from '../components/basics';
import { RecoveryModal, SickModal } from '../components/Overlays';
import { hardness, sessionInstruction } from '../components/SessionSheet';
import { energyAdvice } from '../../core/energy';
import { TYPE_COLORS, useGame, useUi } from '../game';
import { downloadBackup } from './data';

export function currentPhase(g: ReturnType<typeof useGame>) {
  const day = g.calendar.find((d) => d.date === g.today);
  const sess = g.sessions.find((s) => s.date >= g.today) ?? g.sessions[g.sessions.length - 1];
  const phase = g.today < g.settings.planStart ? 'wiedereinstieg' : (sess?.phase ?? 'wiedereinstieg');
  const raceDone = g.bosses.has('final') || g.today > g.settings.raceDate;
  return { day, phase, world: raceDone ? 6 : PHASE_INFO[phase].world, worldName: raceDone ? 'SANKT ENGELMAR' : PHASE_INFO[phase].worldName };
}

export function QuestScreen() {
  const g = useGame();
  const ui = useUi();
  const [recOpen, setRecOpen] = useState(false);
  const [sickOpen, setSickOpen] = useState(false);
  const { level, streak, attrs } = g.progress;
  const { day, world, worldName } = currentPhase(g);
  const sick = g.settings.sick;
  const look = { ...g.settings.avatar, equipped: g.settings.equipped, wounded: !!sick };

  const todays = g.sessions.filter((s) => s.date === g.today);
  const mainToday = todays.find((s) => s.status === 'open' && !s.optional) ?? todays.find((s) => s.status === 'open') ?? todays[0];
  const nextOpen = g.sessions.find((s) => s.date > g.today && s.status === 'open' && s.type !== 'Ruhe');
  const rec = g.recovery.find((r) => r.date === g.today);
  const zone = rec?.recoveryPct !== undefined ? energyZone(rec.recoveryPct) : undefined;
  const daysToRace = diffDays(g.today, g.settings.raceDate);
  const showBackup = backupDue(g.settings.lastBackupAt, g.settings.backupSnoozedAt, g.settings.createdAt, g.today) && g.sessions.some((s) => s.status !== 'open');

  return (
    <div className="stack">
      <header className="topbar">
        <h1 className="px t14 rust" style={{ margin: 0 }}>
          SOUL QUEST
        </h1>
        <div className="row" title={`Bester Streak: ${streak.best}`} aria-label={`Streak ${streak.current}`}>
          <Flame size={22} dim={streak.current === 0 || !!sick} />
          <span className="px t12">{streak.current}</span>
        </div>
      </header>

      {showBackup && (
        <div className="banner row between">
          <span>Zeit für ein Backup deiner Daten.</span>
          <div className="row">
            <button
              className="btn"
              onClick={async () => {
                downloadBackup(await exportBackup());
                await markBackupDone();
                ui.toast('Backup gespeichert');
              }}
            >
              Sichern
            </button>
            <button className="btn ghost icon-btn" aria-label="Später" onClick={() => saveSettings({ backupSnoozedAt: new Date().toISOString() })}>
              <Icon name="close" size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Heldenkarte */}
      <section className="card hero" aria-label="Held">
        <div className="hero-scene">
          <Landscape world={world} className="land" />
          <div className="badge">
            {world === 6 ? 'FINALE' : `WELT ${world}`} · {worldName}
          </div>
          {sick && <div className="status-badge">VERWUNDET</div>}
          <div className="avatar">
            <Avatar look={look} scale={4} floating={!sick} />
          </div>
        </div>
        <div className="row between" style={{ marginTop: 10 }}>
          <span className="px t10">
            LV {level.level} · {titleForLevel(level.level).toUpperCase()}
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <Bar value={level.into} max={level.needed} label="Erfahrung" />
          <div className="px t8 gold" style={{ marginTop: 6, textAlign: 'right' }}>
            {level.into} / {level.needed} XP
          </div>
        </div>
      </section>

      {/* Energie & Final Boss */}
      <div className="grid2">
        <button className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setRecOpen(true)} aria-label="Energie eintragen">
          <div className="row between">
            <span className="px t8">ENERGIE</span>
            <Icon name="bolt" size={12} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SegBar filled={rec?.recoveryPct !== undefined ? energySegments(rec.recoveryPct) : 0} color={zone ? ENERGY_COLORS[zone] : 'var(--bar-bg)'} label="Energie" />
          </div>
          <div className="px t8" style={{ marginTop: 8, color: zone ? ENERGY_COLORS[zone] : 'var(--muted)' }}>
            {rec?.recoveryPct !== undefined ? `${rec.recoveryPct} %` : 'EINTRAGEN'}
          </div>
        </button>
        <div className="card rust-border">
          <div className="px t8 rust">FINAL BOSS</div>
          <div className="px t16" style={{ marginTop: 8 }}>
            {daysToRace >= 0 ? daysToRace : '✓'}
          </div>
          <div className="px t7 muted" style={{ marginTop: 6 }}>
            {daysToRace > 0 ? 'TAGE · SOUL TRAIL' : daysToRace === 0 ? 'HEUTE! 8:30 UHR' : 'GESCHAFFT'}
          </div>
        </div>
      </div>

      {/* Heutige Quest */}
      <section className="card shadow" aria-label="Heutige Quest">
        {sick ? (
          <div className="stack-s">
            <div className="px t9 rust">STATUS: VERWUNDET</div>
            <p style={{ margin: 0 }}>Dein Plan ist pausiert. Erhol dich gut – kein XP-Verlust, der Streak ist eingefroren.</p>
            <div className="row">
              <button className="btn primary big grow" onClick={() => setSickOpen(true)}>
                Wieder gesund?
              </button>
            </div>
          </div>
        ) : mainToday ? (
          <div className="stack-s">
            <div className="row between">
              <span className="px t8 muted">
                ZYKLUS {mainToday.cycleNo} · TAG {mainToday.cycleDay}
              </span>
              <span className="xp-tag">+{mainToday.xp} XP</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span className="type-tag" style={{ color: TYPE_COLORS[mainToday.type] }}>
                {mainToday.type.toUpperCase()}
              </span>
              <span className="muted">{fmtDuration(mainToday.durationMin)}</span>
              {mainToday.status === 'done' && <span className="px t7 green">ERLEDIGT</span>}
            </div>
            <h2 className="px t12" style={{ margin: '4px 0' }}>
              {mainToday.title}
            </h2>
            <p className="pre" style={{ margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {sessionInstruction(mainToday, g.skills, g.progress.maxes)}
            </p>
            {zone && zone !== 'green' && mainToday.status === 'open' && <div className={`banner ${zone === 'red' ? 'red' : ''}`}>{energyAdvice(zone, hardness(mainToday))}</div>}
            {todays.length > 1 && (
              <div className="stack-s">
                {todays
                  .filter((s) => s.id !== mainToday.id)
                  .map((s) => (
                    <button key={s.id} className={`sess-line ${s.status}`} onClick={() => ui.openSession(s.id!)}>
                      <span className="dot" style={{ color: TYPE_COLORS[s.type] }} />
                      <span className="ttl grow">
                        + {s.title}
                        {s.optional ? ' (optional)' : ''}
                      </span>
                      <span className="xp-tag t8">{s.xp}</span>
                    </button>
                  ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn primary big grow" onClick={() => ui.openSession(mainToday.id!)}>
                {mainToday.status === 'done' ? 'Quest ansehen' : 'Quest starten'}
              </button>
              <button className="btn big icon-btn" onClick={() => setSickOpen(true)} aria-label="Krank-Modus" title="Ich bin krank">
                <Icon name="sick" size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="stack-s">
            <div className="px t8 muted">{day ? `ZYKLUS ${day.cycleNo} · TAG ${day.cycleDay} · ${CYCLE_DAY_INFO[day.cycleDay].label.toUpperCase()}` : 'KEINE QUEST HEUTE'}</div>
            <p style={{ margin: 0 }}>
              {g.today < g.settings.planStart
                ? `Dein Abenteuer beginnt am ${formatShort(g.settings.planStart)}. Bis dahin: gut schlafen, locker bewegen.`
                : g.today > g.settings.raceDate
                  ? 'Die Quest ist vollbracht. Gönn dir Erholung – du hast sie verdient.'
                  : 'Heute steht nichts an.'}
            </p>
            {nextOpen && (
              <button className="btn block" onClick={() => ui.openSession(nextOpen.id!)}>
                Nächste: {formatShort(nextOpen.date)} · {nextOpen.title}
              </button>
            )}
          </div>
        )}
        {!sick && mainToday?.status === 'done' && nextOpen && (
          <div className="muted" style={{ marginTop: 8 }}>
            Nächste Quest: {formatShort(nextOpen.date)} · {nextOpen.title}
          </div>
        )}
      </section>

      {/* Attribute */}
      <section className="card" aria-label="Attribute">
        <h3>ATTRIBUTE</h3>
        <div className="stack-s">
          {ATTRS.map((a) => (
            <div key={a.id} className="row">
              <span className="px t7" style={{ width: 96, color: a.color }}>
                {a.name.toUpperCase()}
              </span>
              <div className="grow">
                <Bar value={attrs[a.id].progress} max={1} color={a.color} label={a.name} />
              </div>
              <span className="px t7" style={{ width: 40, textAlign: 'right' }}>
                LV{attrs[a.id].level}
              </span>
            </div>
          ))}
        </div>
      </section>

      {recOpen && <RecoveryModal onClose={() => setRecOpen(false)} />}
      {sickOpen && <SickModal onClose={() => setSickOpen(false)} />}
    </div>
  );
}
