import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { db } from '../db/db';
import type { Reward } from '../game/actions';
import type { PlanDiff } from '../plan/reschedule';
import { Icon, type IconName } from './art/icons';
import { DiffModal, RewardOverlay, Toast } from './components/Overlays';
import { SessionSheet } from './components/SessionSheet';
import { GameProvider, useLoadGame, type TabId, type UiApi } from './game';
import { HeroScreen } from './screens/HeroScreen';
import { MapScreen } from './screens/MapScreen';
import { Onboarding } from './screens/Onboarding';
import { QuestScreen } from './screens/QuestScreen';
import { SkillsScreen } from './screens/SkillsScreen';
import { StatsScreen } from './screens/StatsScreen';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'quest', label: 'QUEST', icon: 'quest' },
  { id: 'karte', label: 'KARTE', icon: 'map' },
  { id: 'skills', label: 'SKILLS', icon: 'skills' },
  { id: 'held', label: 'HELD', icon: 'hero' },
  { id: 'stats', label: 'STATS', icon: 'stats' },
];

export function App() {
  const settings = useLiveQuery(() => db.kv.get('settings').then((s) => s ?? null), []);
  if (settings === undefined) return <Splash />;
  if (!settings || !settings.onboarded) return <Onboarding />;
  return <Main />;
}

function Splash() {
  return (
    <div className="app center" style={{ paddingTop: '40dvh' }}>
      <div className="px t14 rust">SOUL QUEST</div>
    </div>
  );
}

function Main() {
  const settings = useLiveQuery(() => db.kv.get('settings'), []);
  const data = useLoadGame(settings);
  const [tab, setTab] = useState<TabId>('quest');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [diff, setDiff] = useState<{ title: string; diff: PlanDiff } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const ui: UiApi = useMemo(
    () => ({
      openSession: (id) => setSessionId(id),
      showReward: (r) => r && setRewards((q) => [...q, r]),
      showDiff: (title, d) => d && setDiff({ title, diff: d }),
      toast: (msg) => {
        setToast(msg);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 2600);
      },
      goTab: setTab,
    }),
    [],
  );

  const changeTab = useCallback((t: TabId) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  if (!data) return <Splash />;
  return (
    <GameProvider data={data} ui={ui}>
      <main className="app">
        {tab === 'quest' && <QuestScreen />}
        {tab === 'karte' && <MapScreen />}
        {tab === 'skills' && <SkillsScreen />}
        {tab === 'held' && <HeroScreen />}
        {tab === 'stats' && <StatsScreen />}
      </main>
      <nav className="nav" aria-label="Hauptnavigation">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => changeTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon name={t.icon} size={20} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      {sessionId !== null && <SessionSheet key={sessionId} id={sessionId} onClose={() => setSessionId(null)} />}
      {rewards.length > 0 && <RewardOverlay key={rewards.length} reward={rewards[0]} onClose={() => setRewards((q) => q.slice(1))} />}
      {diff && rewards.length === 0 && <DiffModal title={diff.title} diff={diff.diff} onClose={() => setDiff(null)} />}
      {toast && <Toast msg={toast} />}
      <UpdatePrompt />
    </GameProvider>
  );
}

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => undefined, []);
  if (!needRefresh) return null;
  return (
    <div style={{ position: 'fixed', top: 'calc(var(--safe-top) + 8px)', left: 16, right: 16, zIndex: 80, display: 'flex', justifyContent: 'center' }}>
      <div className="card shadow row" style={{ maxWidth: 448 }}>
        <span className="grow">Neue Version verfügbar.</span>
        <button className="btn primary" onClick={() => updateServiceWorker(true)}>
          Aktualisieren
        </button>
        <button className="btn ghost icon-btn" aria-label="Später" onClick={() => setNeedRefresh(false)}>
          <Icon name="close" size={12} />
        </button>
      </div>
    </div>
  );
}
