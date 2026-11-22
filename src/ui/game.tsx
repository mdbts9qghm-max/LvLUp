import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { today as getToday } from '../core/clock';
import { buildCalendar, type CalendarDay } from '../core/cycle';
import type { ISODate } from '../core/dates';
import type { Session } from '../core/types';
import type { RecoveryEntry } from '../core/whoop';
import { db, type MaxtestEntry, type PlanEvent, type Settings } from '../db/db';
import type { Reward } from '../game/actions';
import { computeProgress, type Progress } from '../game/progress';
import type { PlanDiff } from '../plan/reschedule';

export interface GameData {
  settings: Settings;
  sessions: Session[];
  recovery: RecoveryEntry[];
  maxtests: MaxtestEntry[];
  skills: Set<string>;
  skillDates: Map<string, string>;
  bosses: Set<string>;
  bossDates: Map<string, string>;
  planEvents: PlanEvent[];
  progress: Progress;
  today: ISODate;
  calendar: CalendarDay[];
}

export interface UiApi {
  openSession: (id: number) => void;
  showReward: (r: Reward | null | undefined) => void;
  showDiff: (title: string, diff: PlanDiff | null | undefined) => void;
  toast: (msg: string) => void;
  goTab: (t: TabId) => void;
}

export type TabId = 'quest' | 'karte' | 'skills' | 'held' | 'stats';

const GameCtx = createContext<GameData | null>(null);
const UiCtx = createContext<UiApi | null>(null);

export function useLoadGame(settings: Settings | undefined): GameData | null {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const recovery = useLiveQuery(() => db.recovery.toArray(), []);
  const maxtests = useLiveQuery(() => db.maxtests.toArray(), []);
  const skills = useLiveQuery(() => db.skills.toArray(), []);
  const bosses = useLiveQuery(() => db.bosses.toArray(), []);
  const planEvents = useLiveQuery(() => db.planEvents.orderBy('id').reverse().limit(30).toArray(), []);
  const today = getToday();
  return useMemo(() => {
    if (!settings || !sessions || !recovery || !maxtests || !skills || !bosses || !planEvents) return null;
    sessions.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));
    const skillIds = skills.map((s) => s.nodeId);
    const bossIds = bosses.map((b) => b.bossId);
    return {
      settings,
      sessions,
      recovery: [...recovery].sort((a, b) => (a.date < b.date ? -1 : 1)),
      maxtests,
      skills: new Set(skillIds),
      skillDates: new Map(skills.map((s) => [s.nodeId, s.date])),
      bosses: new Set(bossIds),
      bossDates: new Map(bosses.map((b) => [b.bossId, b.date])),
      planEvents,
      progress: computeProgress(sessions, maxtests, skillIds, bossIds, today),
      today,
      calendar: buildCalendar(settings.planStart, settings.raceDate, settings.anchor, settings.shiftAdjustments, settings.blockedDates),
    };
  }, [settings, sessions, recovery, maxtests, skills, bosses, planEvents, today]);
}

export function GameProvider({ data, ui, children }: { data: GameData; ui: UiApi; children: ReactNode }) {
  return (
    <GameCtx.Provider value={data}>
      <UiCtx.Provider value={ui}>{children}</UiCtx.Provider>
    </GameCtx.Provider>
  );
}

export function useGame(): GameData {
  const g = useContext(GameCtx);
  if (!g) throw new Error('GameProvider fehlt');
  return g;
}

export function useUi(): UiApi {
  const u = useContext(UiCtx);
  if (!u) throw new Error('UiProvider fehlt');
  return u;
}

export const TYPE_COLORS: Record<Session['type'], string> = {
  Lauf: '#4FA36A',
  Höhenmeter: '#9C8FC4',
  Kraft: '#D9783A',
  Calisthenics: '#6FA3C8',
  Mobility: '#B3AA9C',
  Ruhe: '#8A8296',
};
