/** Skill-Tree: Muscle-up und Front Lever. Jede Stufe hat ein messbares Freischaltkriterium. */
export type SkillPath = 'mu' | 'fl';

export interface SkillNode {
  id: string;
  path: SkillPath;
  name: string;
  train: string; // was du übst, solange diese Stufe dein aktuelles Ziel ist
  criterion: string; // wann die Stufe freigeschaltet ist
  bonus?: boolean; // Langzeit-Bonus (nach April)
  bossId?: string;
}

export const SKILL_NODES: SkillNode[] = [
  // ---------------- Muscle-up
  {
    id: 'mu-hang',
    path: 'mu',
    name: 'Aktiver Hang',
    train: 'Aktiver Hang 3 × 20–30 s (Schultern weg von den Ohren) · Scapula-Pulls 3 × 8',
    criterion: '3 × 30 s aktiver Hang und 3 × 10 saubere Scapula-Pulls',
  },
  {
    id: 'mu-pull8',
    path: 'mu',
    name: '8 Klimmzüge',
    train: 'Klimmzüge 5 Sätze à (Max − 2) Wdh., 2–3 min Pause · 3 × 3 Negativ-Klimmzüge (5 s ablassen)',
    criterion: '8 saubere Klimmzüge am Stück',
  },
  {
    id: 'mu-c2b',
    path: 'mu',
    name: 'Chest-to-bar',
    train: 'Chest-to-bar-Versuche 5 × 2–3 (Brust zur Stange, Körper leicht zurücklehnen) · Klimmzüge 3 × (Max − 2)',
    criterion: '3 × 5 Chest-to-bar-Klimmzüge',
  },
  {
    id: 'mu-pull12',
    path: 'mu',
    name: '12 Klimmzüge',
    train: 'Klimmzüge Pyramide 2-4-6-4-2 oder 5 × (Max − 3) · Chest-to-bar 3 × 4',
    criterion: '12 saubere Klimmzüge am Stück',
  },
  {
    id: 'mu-explosive',
    path: 'mu',
    name: 'Explosive Klimmzüge',
    train: 'Explosive Klimmzüge 5 × 3 (so hoch wie möglich, Hüfte bis zur Stange) · False Grip Hang 3 × 15 s',
    criterion: '3 × 5 explosive Klimmzüge mit Brustbein/Hüfte nahe der Stange',
  },
  {
    id: 'mu-sbdips',
    path: 'mu',
    name: 'Straight-Bar-Dips',
    train: 'Straight-Bar-Dips 4 × 5–8 (an der Klimmzugstange, Brust über die Hände) · Dips 3 × (Max − 2)',
    criterion: '3 × 8 Straight-Bar-Dips',
  },
  {
    id: 'mu-negative',
    path: 'mu',
    name: 'Negativ-Muscle-up',
    train: 'Negativ-Muscle-ups 4 × 2 (oben starten, 5 s kontrolliert durch die Transition ablassen)',
    criterion: '3 × 3 Negativ-Muscle-ups à 5 s',
  },
  {
    id: 'mu-band',
    path: 'mu',
    name: 'Muscle-up mit Band',
    train: 'Muscle-ups mit Widerstandsband 5 × 2–3 · Transition-Drills an niedriger Stange 3 × 5',
    criterion: '3 × 3 Band-Muscle-ups mit leichtem Band',
  },
  {
    id: 'mu-transition',
    path: 'mu',
    name: 'Transition-Drill',
    train: 'Transition-Drills an hüfthoher Stange 4 × 5 (Füße am Boden, schneller Ellbogenwechsel) · Explosive Klimmzüge 4 × 3',
    criterion: '3 × 5 saubere Transitions, Ellbogen schnell über der Stange',
  },
  {
    id: 'mu-first',
    path: 'mu',
    name: 'Erster Muscle-up',
    train: 'Muscle-up-Versuche: 6–8 frische Einzelversuche, 2–3 min Pause. Bei Fehlversuch: 1 Negativ-Muscle-up.',
    criterion: '1 sauberer Muscle-up an der Stange (ohne Band, ohne großen Kipp)',
    bossId: 'bmu',
  },
  {
    id: 'mu-three',
    path: 'mu',
    name: '3 Muscle-ups',
    train: 'Muscle-up-Einzel 5 × 1–2, dann 2er-Serien',
    criterion: '3 saubere Muscle-ups am Stück',
    bonus: true,
  },
  // ---------------- Front Lever
  {
    id: 'fl-hollow',
    path: 'fl',
    name: 'Hollow Body Hold',
    train: 'Hollow Body Hold 4 × 20–30 s (Lendenwirbel am Boden) · Hollow Rocks 3 × 10',
    criterion: '3 × 30 s Hollow Body Hold',
  },
  {
    id: 'fl-scap',
    path: 'fl',
    name: 'Scapula-Pulls',
    train: 'Scapula-Pulls 3 × 10 · Aktiver Hang 3 × 20 s · Hängendes Knieheben 3 × 10',
    criterion: '3 × 12 Scapula-Pulls und 3 × 10 Knieheben im Hang',
  },
  {
    id: 'fl-tuck10',
    path: 'fl',
    name: 'Tuck Front Lever',
    train: 'Tuck-Front-Lever-Holds 6 × 5–8 s (Knie zur Brust, Rücken rund, Arme gestreckt) · Band-assistiert, falls nötig',
    criterion: '3 × 10 s Tuck-Front-Lever-Hold',
  },
  {
    id: 'fl-raises',
    path: 'fl',
    name: 'Tuck-Raises',
    train: 'Tuck-Front-Lever-Raises 4 × 4–6 (vom Hang langsam in den Tuck heben) · Tuck-Holds 3 × 10 s',
    criterion: '3 × 6 Tuck-Front-Lever-Raises',
  },
  {
    id: 'fl-tuck15',
    path: 'fl',
    name: 'Tuck FL 15 s',
    train: 'Tuck-Holds 4 × 12–15 s · Tuck-Raises 3 × 5',
    criterion: '1 × 15 s Tuck Front Lever (Rücken waagerecht)',
    bossId: 'bfl',
  },
  {
    id: 'fl-adv5',
    path: 'fl',
    name: 'Advanced Tuck',
    train: 'Advanced-Tuck-Holds 6 × 3–5 s (Rücken flach, Hüfte offen) · Tuck-Holds 2 × 15 s',
    criterion: '3 × 5 s Advanced Tuck Front Lever',
  },
  {
    id: 'fl-adv12',
    path: 'fl',
    name: 'Advanced Tuck 12 s',
    train: 'Advanced-Tuck-Holds 5 × 6–10 s · Advanced-Tuck-Raises 3 × 3',
    criterion: '1 × 12 s Advanced Tuck Front Lever (Ziel bis April: 10–15 s)',
  },
  {
    id: 'fl-oneleg',
    path: 'fl',
    name: 'One Leg',
    train: 'One-Leg-Front-Lever-Holds 6 × 3–5 s je Seite',
    criterion: '3 × 5 s One-Leg Front Lever je Seite',
    bonus: true,
  },
  {
    id: 'fl-straddle',
    path: 'fl',
    name: 'Straddle',
    train: 'Straddle-Front-Lever-Holds 6 × 2–4 s',
    criterion: '1 × 5 s Straddle Front Lever',
    bonus: true,
  },
  {
    id: 'fl-full',
    path: 'fl',
    name: 'Full Front Lever',
    train: 'Full-Front-Lever-Holds und Negatives',
    criterion: '1 × 5 s Full Front Lever',
    bonus: true,
  },
];

export function nodesOf(path: SkillPath): SkillNode[] {
  return SKILL_NODES.filter((n) => n.path === path);
}

/** Aktuelles Ziel eines Pfades = erste noch nicht freigeschaltete Stufe. */
export function currentNode(path: SkillPath, unlocked: Set<string>): SkillNode | undefined {
  return nodesOf(path).find((n) => !unlocked.has(n.id));
}

export function canUnlock(nodeId: string, unlocked: Set<string>): boolean {
  const node = SKILL_NODES.find((n) => n.id === nodeId);
  if (!node || unlocked.has(nodeId)) return false;
  return currentNode(node.path, unlocked)?.id === nodeId;
}
