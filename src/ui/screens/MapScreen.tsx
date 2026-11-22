import { useEffect, useMemo, useRef, useState } from 'react';
import { BOSSES, plannedBossFor } from '../../core/bosses';
import { groupCycles } from '../../core/cycle';
import { formatShort } from '../../core/dates';
import type { PhaseId, Session } from '../../core/types';
import { PHASE_INFO } from '../../plan/constants';
import { PixelSprite } from '../art/Pixel';
import { bossLayers } from '../art/bosses';
import { avatarLayers } from '../art/avatar';
import { ChipGroup } from '../components/basics';
import { TYPE_COLORS, useGame, useUi } from '../game';

const REGION_COLORS: Record<PhaseId | 'final', { ground: string; deco: string; label: string }> = {
  wiedereinstieg: { ground: '#3A4630', deco: '#55663F', label: 'Flachland' },
  grundlage: { ground: '#2A3D30', deco: '#4D6A47', label: 'Hügelland' },
  aufbau: { ground: '#1A2924', deco: '#2F4B3B', label: 'Hochwald' },
  peak: { ground: '#332C42', deco: '#5E5378', label: 'Gratpfad' },
  taper: { ground: '#2A2534', deco: '#D9783A', label: 'Ruhelager' },
  final: { ground: '#3E3554', deco: '#CFC6DE', label: 'Sankt Engelmar' },
};

export function MapScreen() {
  const [view, setView] = useState<'karte' | 'plan'>('karte');
  return (
    <div className="stack">
      <header className="topbar">
        <h1 className="screen-title">{view === 'karte' ? 'WELTKARTE' : 'QUESTBUCH'}</h1>
        <ChipGroup options={{ karte: 'KARTE', plan: 'PLAN' }} value={view} onChange={setView} />
      </header>
      {view === 'karte' ? <WorldMap /> : <PlanList />}
    </div>
  );
}

function WorldMap() {
  const g = useGame();
  const ref = useRef<HTMLDivElement>(null);
  const cycles = useMemo(() => {
    const byCycle = new Map<number, Session[]>();
    for (const s of g.sessions) {
      const arr = byCycle.get(s.cycleNo) ?? [];
      arr.push(s);
      byCycle.set(s.cycleNo, arr);
    }
    return [...byCycle.entries()].sort((a, b) => a[0] - b[0]).map(([no, ss]) => {
      const req = ss.filter((x) => !x.optional && x.type !== 'Ruhe');
      const done = req.filter((x) => x.status === 'done').length;
      const openSessions = g.sessions.filter((x) => x.status === 'open');
      const boss = ss.map((x) => (x.status === 'open' ? plannedBossFor(x, openSessions, g.bosses) : undefined)).find(Boolean);
      const defeated = ss.some((x) => x.status === 'done' && BOSSES.some((b) => g.bossDates.get(b.id) === x.date && b.runCheck));
      return { no, phase: ss[0].phase, start: ss[0].date, end: ss[ss.length - 1].date, done, total: req.length, boss, defeated, isRace: ss.some((x) => x.kind === 'race') };
    });
  }, [g.sessions, g.bosses, g.bossDates]);

  const W = 90;
  const STEP = 11;
  const H = cycles.length * STEP + 40;
  const nodes = cycles.map((c, i) => {
    const y = H - 20 - i * STEP;
    const x = Math.round(45 + Math.sin(i * 0.9) * 26);
    return { ...c, x, y };
  });
  const currentIdx = Math.max(0, nodes.findIndex((n) => n.end >= g.today));
  const cur = nodes[currentIdx === -1 ? nodes.length - 1 : currentIdx];

  useEffect(() => {
    const el = ref.current;
    if (!el || !cur) return;
    const scale = el.clientWidth / W;
    el.scrollTop = cur.y * scale - el.clientHeight / 2;
  }, [cur]);

  // Regionen als Bänder
  const bands: { phase: PhaseId | 'final'; y0: number; y1: number }[] = [];
  nodes.forEach((n, i) => {
    const ph: PhaseId | 'final' = n.isRace ? 'final' : n.phase;
    const y0 = n.y + STEP / 2;
    const y1 = n.y - STEP / 2;
    const last = bands[bands.length - 1];
    if (last && last.phase === ph) last.y1 = y1;
    else bands.push({ phase: ph, y0: i === 0 ? H : y0, y1 });
  });
  if (bands.length) bands[bands.length - 1].y1 = 0;

  const look = { ...g.settings.avatar, equipped: g.settings.equipped, wounded: !!g.settings.sick };
  const deco: JSX.Element[] = [];
  bands.forEach((b, bi) => {
    const c = REGION_COLORS[b.phase];
    for (let y = Math.floor(b.y1) + 3; y < b.y0 - 2; y += 7) {
      for (const x of [6, 16, 74, 84]) {
        const jitter = ((x * 7 + y * 13 + bi) % 5) - 2;
        const X = x + jitter;
        const key = `${bi}-${x}-${y}`;
        if (b.phase === 'peak' || b.phase === 'final') {
          deco.push(<polygon key={key} points={`${X - 5},${y + 3} ${X},${y - 4} ${X + 5},${y + 3}`} fill={c.deco} />);
          deco.push(<polygon key={key + 's'} points={`${X - 1.5},${y - 2} ${X},${y - 4} ${X + 1.5},${y - 2}`} fill="#ECE5D6" />);
        } else if (b.phase === 'taper') {
          if ((x + y) % 3 === 0) deco.push(<polygon key={key} points={`${X - 2},${y + 2} ${X},${y - 1} ${X + 2},${y + 2}`} fill={c.deco} />);
          else deco.push(<rect key={key} x={X} y={y} width={1} height={1} fill="#ECE5D6" opacity={0.6} />);
        } else if (b.phase === 'aufbau') {
          deco.push(<polygon key={key} points={`${X - 2},${y + 3} ${X},${y - 3} ${X + 2},${y + 3}`} fill={c.deco} />);
          deco.push(<rect key={key + 't'} x={X - 0.5} y={y + 3} width={1} height={1} fill="#4A3628" />);
        } else if (b.phase === 'grundlage') {
          deco.push(<rect key={key} x={X - 3} y={y + 1} width={6} height={1} fill={c.deco} />);
          deco.push(<rect key={key + 'b'} x={X - 1.5} y={y} width={3} height={1} fill={c.deco} />);
        } else {
          deco.push(<rect key={key} x={X - 2} y={y} width={1} height={1} fill={c.deco} />);
          deco.push(<rect key={key + 'b'} x={X} y={y - 1} width={1} height={2} fill={c.deco} />);
        }
      }
    }
  });

  return (
    <>
      <div ref={ref} className="card" style={{ padding: 0, height: '62dvh', overflowY: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" shapeRendering="crispEdges" style={{ display: 'block' }} aria-label="Weltkarte">
          {bands.map((b, i) => (
            <rect key={i} x={0} y={b.y1} width={W} height={b.y0 - b.y1} fill={REGION_COLORS[b.phase].ground} />
          ))}
          {deco}
          {bands.map((b, i) => (
            <text key={`t${i}`} x={3} y={b.y0 - 2} fontFamily="Press Start 2P" fontSize={2.6} fill="#ECE5D6" opacity={0.85}>
              {b.phase === 'final' ? 'FINALE · SANKT ENGELMAR' : `WELT ${PHASE_INFO[b.phase].world} · ${REGION_COLORS[b.phase].label.toUpperCase()}`}
            </text>
          ))}
          <polyline points={nodes.map((n) => `${n.x},${n.y}`).join(' ')} fill="none" stroke="#8A7560" strokeWidth={1.2} strokeDasharray="1.5 1" />
          {nodes.map((n) => {
            const complete = n.total > 0 && n.done >= n.total;
            const past = n.end < g.today;
            const fill = complete ? '#E9A23B' : past ? '#6B6478' : '#24212B';
            const size = n.boss || n.isRace ? 6 : 4;
            return (
              <g key={n.no}>
                <rect x={n.x - size / 2} y={n.y - size / 2} width={size} height={size} fill={fill} stroke={n.boss || n.isRace ? '#D9783A' : '#ECE5D6'} strokeWidth={0.7} />
                <text x={n.x + size / 2 + 1.5} y={n.y + 1} fontFamily="Press Start 2P" fontSize={2.2} fill="#ECE5D6">
                  {n.isRace ? 'SOUL TRAIL' : `Z${n.no}${n.boss ? ' · BOSS' : ''}`}
                </text>
              </g>
            );
          })}
          {cur && (
            <g transform={`translate(${cur.x - 2.8}, ${cur.y - 13})`}>
              <g transform="scale(0.35)">
                {avatarLayers(look).map((l, i) =>
                  l.rows.map((row, y) =>
                    [...row].map((ch, x) => (ch !== '.' && l.palette[ch] ? <rect key={`${i}-${x}-${y}`} x={x} y={y} width={1} height={1} fill={l.palette[ch]} opacity={l.opacity} /> : null)),
                  ),
                )}
              </g>
            </g>
          )}
        </svg>
      </div>
      <div className="legend">
        <span>
          <i style={{ background: '#E9A23B' }} />
          ABGESCHLOSSEN
        </span>
        <span>
          <i style={{ background: '#24212B', border: '1px solid #D9783A' }} />
          BOSS
        </span>
        <span>
          <i style={{ background: '#6B6478' }} />
          VERGANGEN
        </span>
      </div>
      <BossList />
    </>
  );
}

function BossList() {
  const g = useGame();
  return (
    <section className="card">
      <h3>BOSSKÄMPFE</h3>
      <div className="stack-s">
        {BOSSES.map((b) => {
          const date = g.bossDates.get(b.id);
          return (
            <div key={b.id} className="row" style={{ opacity: date ? 1 : 0.85 }}>
              <div style={{ opacity: date ? 1 : 0.45, filter: date ? undefined : 'grayscale(1)', lineHeight: 0 }}>
                <PixelSprite layers={bossLayers(b.sprite, b.color)} width={16} height={16} scale={2.5} />
              </div>
              <div className="grow">
                <div className="px t8" style={{ color: date ? 'var(--gold)' : undefined }}>
                  {b.name}
                  {b.bonus ? ' (Bonus)' : ''}
                </div>
                <div className="muted">
                  {b.goal}
                  {date ? ` · besiegt am ${formatShort(date)}` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlanList() {
  const g = useGame();
  const ui = useUi();
  const cycles = useMemo(() => groupCycles(g.calendar), [g.calendar]);
  const curNo = g.calendar.find((d) => d.date >= g.today)?.cycleNo ?? cycles.length;
  const [shown, setShown] = useState<number>(curNo);
  const cyc = cycles.find((c) => c.cycleNo === shown);
  const byDate = useMemo(() => {
    const m = new Map<string, Session[]>();
    for (const s of g.sessions) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return m;
  }, [g.sessions]);
  if (!cyc) return <p>Kein Plan vorhanden.</p>;
  const phase = byDate.get(cyc.days[0].date)?.[0]?.phase;
  return (
    <div className="stack">
      <div className="row between">
        <button className="btn icon-btn" disabled={shown <= 1} onClick={() => setShown(shown - 1)} aria-label="Vorheriger Zyklus">
          ‹
        </button>
        <div className="center">
          <div className="px t10">ZYKLUS {shown}</div>
          <div className="muted">
            {formatShort(cyc.days[0].date)} – {formatShort(cyc.days[cyc.days.length - 1].date)}
            {phase ? ` · ${PHASE_INFO[phase].name}` : ''}
          </div>
        </div>
        <button className="btn icon-btn" disabled={shown >= cycles.length} onClick={() => setShown(shown + 1)} aria-label="Nächster Zyklus">
          ›
        </button>
      </div>
      {shown !== curNo && (
        <button className="btn ghost block" onClick={() => setShown(curNo)}>
          Zum aktuellen Zyklus
        </button>
      )}
      <div className="card">
        {cyc.days.map((d) => {
          const list = byDate.get(d.date) ?? [];
          const pausedBySick = g.settings.sick && d.date >= g.settings.sick.since;
          return (
            <div key={d.date} className={`day-row ${d.date === g.today ? 'today-mark' : ''}`} style={{ paddingLeft: d.date === g.today ? 6 : 0 }}>
              <div>
                <div className="px t8">TAG {d.cycleDay}</div>
                <div className="muted" style={{ fontSize: 17 }}>
                  {formatShort(d.date)}
                </div>
                {d.blocked && <div className="px t7 rust">SCHICHT</div>}
              </div>
              <div>
                {list.length === 0 && <div className="muted">—</div>}
                {list.map((s) => (
                  <button key={s.id} className={`sess-line ${s.status}`} onClick={() => ui.openSession(s.id!)} style={{ opacity: pausedBySick && s.status === 'open' ? 0.5 : 1 }}>
                    <span className="dot" style={{ color: TYPE_COLORS[s.type] }} />
                    <span className="ttl grow">
                      {s.title}
                      {s.optional ? ' (optional)' : ''}
                    </span>
                    <span className="xp-tag t8">{s.status === 'done' ? '✓' : s.status === 'missed' ? '✗' : s.status === 'paused' ? 'II' : s.xp}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
