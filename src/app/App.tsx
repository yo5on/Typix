import { useEffect, useState } from 'preact/hooks';
import { navigate, route, type Route } from './router';
import { storageNotice } from './state';
import { MenuScreen } from '../features/menu/MenuScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { PracticeScreen } from '../features/practice/PracticeScreen';
import { LearningScreen } from '../features/learning/LearningScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { Icon } from '../ui/components/Icon';
import s from './App.module.css';

const screens: Record<Route, () => preact.JSX.Element> = {
  menu: () => <MenuScreen />,
  settings: () => <SettingsScreen />,
  learn: () => <LearningScreen />,
  fight: () => <FightLoader />,
  practice: () => <PracticeScreen />,
  'fight-lab': () => (import.meta.env.DEV ? <FightLoader dev /> : <MenuScreen />),
  stats: () => <StatsScreen />,
};

export function App() {
  const current = route.value;

  useEffect(() => {
    // Esc goes back to the menu, unless a dialog is open (it handles Esc itself).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (route.value !== 'menu') navigate('menu');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.mode = current === 'fight' || current === 'fight-lab' ? 'fight' : 'calm';
    // Move focus into the new screen so keyboard users start at the top of it.
    document.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [current]);

  return (
    <>
      {storageNotice.value && (
        <div class={s.notice} role="alert">
          <Icon name="alert" size={16} />
          <span>{storageNotice.value}</span>
          <button type="button" class={s.dismiss} onClick={() => (storageNotice.value = null)}>
            Dismiss
          </button>
        </div>
      )}
      {/* key forces a remount so the enter transition replays on every navigation */}
      <div class={`${s.stage} screen-enter`} key={current}>
        {screens[current]()}
      </div>
    </>
  );
}

/** Loaded on demand, so the menu, Learning and Practice don't ship the fight code. */
function FightLoader({ dev = false }: { dev?: boolean }) {
  const [Lab, setLab] = useState<((p: { dev?: boolean }) => preact.JSX.Element) | null>(null);
  useEffect(() => {
    void import('../features/fight-lab/FightLab').then((m) => setLab(() => m.FightLab));
  }, []);
  return Lab ? <Lab dev={dev} /> : null;
}
