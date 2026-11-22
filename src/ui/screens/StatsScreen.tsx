import { useMemo, useState } from 'react';
import { formatShort } from '../../core/dates';
import { energyZone, ENERGY_COLORS } from '../../core/energy';
import { saveMaxtest } from '../../game/actions';
import { fmtDuration, fmtKm } from '../../plan/templates';
import { Modal } from '../components/basics';
import { MaxtestForm } from '../components/SessionSheet';
import { useGame, useUi } from '../game';

interface BarDatum {
  label: string;
  planned: number;
  done: number;
}

function BarChart({ data, color, unit }: { data: BarDatum[]; color: string; unit: string }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.planned, d.done)));
  const W = 300;
  const H = 110;
  const bw = W / Math.max(1, data.length);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H + 14}`} width="100%" shapeRendering="crispEdges" role="img" aria-label={`Balkendiagramm ${unit}`}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <rect x={0} y={H - H * f} width={W} height={1} fill="#3A3544" />
            <text x={W} y={H - H * f - 2} fontSize={7} fill="#B3AA9C" textAnchor="end" fontFamily="Press Start 2P">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const hp = (d.planned / max) * H;
          const hd = (d.done / max) * H;
          return (
            <g key={i}>
              <rect x={i * bw + 1} y={H - hp} width={Math.max(1, bw - 2)} height={hp} fill="#3A3544" />
              <rect x={i * bw + 1} y={H - hd} width={Math.max(1, bw - 2)} height={hd} fill={color} />
              {(i % 4 === 0 || data.length < 12) && (
                <text x={i * bw + bw / 2} y={H + 11} fontSize={6} fill="#B3AA9C" textAnchor="middle" fontFamily="Press Start 2P">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface Series {
  name: string;
  color: string;
  points: { x: number; y: number }[];
}

function LineChart({ series, xLabels, yMax }: { series: Series[]; xLabels: string[]; yMax?: number }) {
  const W = 300;
  const H = 110;
  const maxY = yMax ?? Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)));
  const n = Math.max(2, xLabels.length);
  const px = (x: number) => (x / (n - 1)) * (W - 8) + 4;
  const py = (y: number) => H - (y / maxY) * (H - 6);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H + 14}`} width="100%" role="img" aria-label="Verlauf">
        {[0.5, 1].map((f) => (
          <g key={f}>
            <rect x={0} y={py(maxY * f)} width={W} height={1} fill="#3A3544" />
            <text x={W} y={py(maxY * f) - 2} fontSize={7} fill="#B3AA9C" textAnchor="end" fontFamily="Press Start 2P">
              {Math.round(maxY * f)}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline points={s.points.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} />
            {s.points.map((p, i) => (
              <rect key={i} x={px(p.x) - 2} y={py(p.y) - 2} width={4} height={4} fill={s.color} />
            ))}
          </g>
        ))}
        {xLabels.map((l, i) =>
          i === 0 || i === xLabels.length - 1 || xLabels.length <= 6 ? (
            <text key={i} x={px(i)} y={H + 11} fontSize={6} fill="#B3AA9C" textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'} fontFamily="Press Start 2P">
              {l}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function StatsScreen() {
  const g = useGame();
  const ui = useUi();
  const [maxOpen, setMaxOpen] = useState(false);

  const stats = useMemo(() => {
    const done = g.sessions.filter((s) => s.status === 'done' && !s.swapped);
    const isRun = (t: string) => t === 'Lauf' || t === 'Höhenmeter';
    let totalKm = 0;
    let totalHm = 0;
    let totalMin = 0;
    let longest = { km: 0, date: '' };
    for (const s of done) {
      const km = s.log?.distanceKm ?? (isRun(s.type) ? (s.distanceKm ?? 0) : 0);
      const hm = s.log?.elevationM ?? s.elevationM ?? 0;
      if (isRun(s.type)) {
        totalKm += km;
        if (km > longest.km) longest = { km, date: s.date };
      }
      totalHm += hm;
      totalMin += s.log?.durationMin ?? s.durationMin;
    }
    const cycles = new Map<number, { km: BarDatum; hm: BarDatum }>();
    for (const s of g.sessions) {
      if (s.kind === 'race') continue;
      const c = cycles.get(s.cycleNo) ?? { km: { label: `${s.cycleNo}`, planned: 0, done: 0 }, hm: { label: `${s.cycleNo}`, planned: 0, done: 0 } };
      if (isRun(s.type) && !s.optional) c.km.planned += s.distanceKm ?? 0;
      if (!s.optional) c.hm.planned += s.elevationM ?? 0;
      if (s.status === 'done' && !s.swapped) {
        if (isRun(s.type)) c.km.done += s.log?.distanceKm ?? s.distanceKm ?? 0;
        c.hm.done += s.log?.elevationM ?? s.elevationM ?? 0;
      }
      cycles.set(s.cycleNo, c);
    }
    const list = [...cycles.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    return { totalKm, totalHm, totalMin, longest, doneCount: done.length, kmData: list.map((x) => x.km), hmData: list.map((x) => x.hm) };
  }, [g.sessions]);

  const maxSorted = [...g.maxtests].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const mkSeries = (key: 'pullups' | 'dips' | 'pushups' | 'flTuckSec', name: string, color: string): Series => ({
    name,
    color,
    points: maxSorted.map((m, i) => ({ x: i, y: m[key] ?? NaN })).filter((p) => !Number.isNaN(p.y)),
  });
  const weights = maxSorted.filter((m) => m.weightKg !== undefined);
  const rec = g.recovery.slice(-30);

  return (
    <div className="stack">
      <header className="topbar">
        <h1 className="screen-title">STATISTIK</h1>
      </header>
      <div className="grid2">
        <Stat label="LAUF-KM" value={fmtKm(Math.round(stats.totalKm * 10) / 10)} />
        <Stat label="HÖHENMETER" value={`${Math.round(stats.totalHm)}`} />
        <Stat label="LÄNGSTER LAUF" value={`${fmtKm(stats.longest.km)} km`} sub={stats.longest.date ? formatShort(stats.longest.date) : '—'} />
        <Stat label="TRAININGSZEIT" value={fmtDuration(Math.round(stats.totalMin))} sub={`${stats.doneCount} Einheiten`} />
      </div>

      <section className="card">
        <h3>LAUF-KM PRO ZYKLUS</h3>
        <BarChart data={stats.kmData} color="#4FA36A" unit="km" />
        <div className="legend">
          <span>
            <i style={{ background: '#4FA36A' }} />
            GELAUFEN
          </span>
          <span>
            <i style={{ background: '#3A3544' }} />
            GEPLANT
          </span>
        </div>
      </section>
      <section className="card">
        <h3>HÖHENMETER PRO ZYKLUS</h3>
        <BarChart data={stats.hmData} color="#9C8FC4" unit="hm" />
      </section>

      <section className="card">
        <div className="row between">
          <h3 style={{ margin: 0 }}>CALISTHENICS-MAXWERTE</h3>
          <button className="btn" onClick={() => setMaxOpen(true)}>
            + Test
          </button>
        </div>
        {maxSorted.length >= 1 ? (
          <>
            <LineChart
              series={[mkSeries('pullups', 'Klimmzüge', '#D9783A'), mkSeries('dips', 'Dips', '#E9A23B'), mkSeries('pushups', 'Liegestütze', '#4FA36A'), mkSeries('flTuckSec', 'Tuck FL (s)', '#6FA3C8')]}
              xLabels={maxSorted.map((m) => formatShort(m.date).split(' ').slice(1).join(' '))}
            />
            <div className="legend">
              <span><i style={{ background: '#D9783A' }} />KLIMMZÜGE</span>
              <span><i style={{ background: '#E9A23B' }} />DIPS</span>
              <span><i style={{ background: '#4FA36A' }} />LIEGESTÜTZE</span>
              <span><i style={{ background: '#6FA3C8' }} />TUCK FL S</span>
            </div>
          </>
        ) : (
          <p className="muted">Noch keine Maxtests.</p>
        )}
      </section>

      <section className="card">
        <h3>RECOVERY (LETZTE 30 EINTRÄGE)</h3>
        {rec.length ? (
          <svg viewBox={`0 0 300 80`} width="100%" shapeRendering="crispEdges" role="img" aria-label="Recovery-Verlauf">
            {rec.map((r, i) => {
              const v = r.recoveryPct ?? 0;
              const bw = 300 / 30;
              const h = (v / 100) * 76;
              return <rect key={r.date} x={i * bw + 1} y={78 - h} width={bw - 2} height={h} fill={r.recoveryPct !== undefined ? ENERGY_COLORS[energyZone(v)] : '#3A3544'} />;
            })}
          </svg>
        ) : (
          <p className="muted">Noch keine Erholungsdaten. Tippe auf dem Startbildschirm auf ENERGIE.</p>
        )}
        {rec.length > 0 && (
          <div className="muted">
            Ø Recovery {Math.round(rec.filter((r) => r.recoveryPct !== undefined).reduce((a, r) => a + r.recoveryPct!, 0) / Math.max(1, rec.filter((r) => r.recoveryPct !== undefined).length))} % · Ø Schlaf{' '}
            {fmtDuration(Math.round(rec.filter((r) => r.sleepMin).reduce((a, r) => a + r.sleepMin!, 0) / Math.max(1, rec.filter((r) => r.sleepMin).length)))}
          </div>
        )}
      </section>

      {weights.length > 0 && (
        <section className="card">
          <h3>KÖRPERGEWICHT</h3>
          <LineChart series={[{ name: 'kg', color: '#ECE5D6', points: weights.map((w, i) => ({ x: i, y: w.weightKg! })) }]} xLabels={weights.map((w) => formatShort(w.date).split(' ').slice(1).join(' '))} yMax={Math.max(...weights.map((w) => w.weightKg!)) + 5} />
        </section>
      )}

      {maxOpen && (
        <Modal title="Maxtest eintragen" onClose={() => setMaxOpen(false)}>
          <MaxtestForm
            defaults={g.progress.maxes}
            onCancel={() => setMaxOpen(false)}
            onSave={async (m) => {
              const r = await saveMaxtest({ date: g.today, ...m });
              setMaxOpen(false);
              ui.showReward(r);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="px t7 muted">{label}</div>
      <div className="px t12" style={{ marginTop: 8 }}>
        {value}
      </div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  );
}
