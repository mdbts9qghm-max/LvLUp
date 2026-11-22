import { useState } from 'react';
import { formatShort } from '../../core/dates';
import { relockSkill, unlockSkill } from '../../game/actions';
import { canUnlock, currentNode, nodesOf, SKILL_NODES, type SkillNode, type SkillPath } from '../../plan/skills';
import { Icon } from '../art/icons';
import { Modal } from '../components/basics';
import { useGame, useUi } from '../game';

export function SkillsScreen() {
  const g = useGame();
  const [sel, setSel] = useState<SkillNode | null>(null);
  const muDone = nodesOf('mu').filter((n) => g.skills.has(n.id)).length;
  const flDone = nodesOf('fl').filter((n) => g.skills.has(n.id)).length;
  return (
    <div className="stack">
      <header className="topbar">
        <h1 className="screen-title">SKILL-TREE</h1>
        <span className="px t8 muted">
          {g.skills.size} / {SKILL_NODES.length}
        </span>
      </header>
      <p className="muted" style={{ margin: 0 }}>
        Jede Stufe hat ein messbares Kriterium. Die aktuelle Stufe (orange) bestimmt, was in deinen Calisthenics-Einheiten trainiert wird. Gestrichelt = Langzeit-Bonus.
      </p>
      <div className="tree">
        <Column path="mu" title="MUSCLE-UP" count={muDone} onSelect={setSel} />
        <Column path="fl" title="FRONT LEVER" count={flDone} onSelect={setSel} />
      </div>
      <div className="card flat">
        <h3>MAXWERTE</h3>
        <div>
          Klimmzüge {g.progress.maxes.pullups} · Dips {g.progress.maxes.dips} · Liegestütze {g.progress.maxes.pushups} · Tuck FL {g.progress.maxes.flTuckSec} s
        </div>
        <div className="muted">Maxtests stehen alle 4 Zyklen im Plan. Zusätzliche Tests trägst du unter STATS ein.</div>
      </div>
      {sel && <NodeModal node={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function Column({ path, title, count, onSelect }: { path: SkillPath; title: string; count: number; onSelect: (n: SkillNode) => void }) {
  const g = useGame();
  const cur = currentNode(path, g.skills);
  return (
    <div>
      <div className="px t8" style={{ marginBottom: 10, color: path === 'mu' ? 'var(--rust)' : 'var(--tech)' }}>
        {title} · {count}/{nodesOf(path).length}
      </div>
      {nodesOf(path).map((n) => {
        const done = g.skills.has(n.id);
        const active = cur?.id === n.id;
        return (
          <button key={n.id} className={`node ${done ? 'done' : ''} ${active ? 'active pulse' : ''} ${n.bonus ? 'bonus' : ''}`} onClick={() => onSelect(n)}>
            <div className="row between">
              <span className="px t7" style={{ lineHeight: 1.6 }}>
                {n.name}
              </span>
              {done ? <Icon name="check" size={12} className="gold" /> : !active ? <Icon name="lock" size={10} /> : null}
            </div>
            {n.bossId && <div className="px t7 rust" style={{ marginTop: 4 }}>BOSS</div>}
          </button>
        );
      })}
    </div>
  );
}

function NodeModal({ node, onClose }: { node: SkillNode; onClose: () => void }) {
  const g = useGame();
  const ui = useUi();
  const done = g.skills.has(node.id);
  const unlockable = canUnlock(node.id, g.skills);
  const isLastDone = done && currentNode(node.path, g.skills) === nodesOf(node.path)[nodesOf(node.path).findIndex((n) => n.id === node.id) + 1];
  return (
    <Modal title={node.name} onClose={onClose} center>
      <div className="stack">
        {node.bonus && <div className="px t7 muted">LANGZEIT-BONUS (NACH APRIL)</div>}
        <div className="card flat">
          <h3>FREISCHALTKRITERIUM</h3>
          <div>{node.criterion}</div>
        </div>
        <div className="card flat">
          <h3>SO TRAINIERST DU DAFÜR</h3>
          <div>{node.train}</div>
        </div>
        {done && <div className="banner green">Freigeschaltet am {formatShort(g.skillDates.get(node.id)!)}.</div>}
        {unlockable && (
          <button
            className="btn primary big block"
            onClick={async () => {
              const r = await unlockSkill(node.id, g.today);
              onClose();
              ui.showReward(r);
            }}
          >
            Kriterium erfüllt (+100 XP)
          </button>
        )}
        {!done && !unlockable && <div className="muted">Erst die vorherige Stufe freischalten.</div>}
        {isLastDone && (
          <button
            className="btn ghost block"
            onClick={async () => {
              await relockSkill(node.id);
              onClose();
            }}
          >
            Versehentlich freigeschaltet? Zurücksetzen
          </button>
        )}
      </div>
    </Modal>
  );
}
