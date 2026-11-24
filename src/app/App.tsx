import { useEffect } from 'preact/hooks';
import { navigate, route, type Route } from './router';
import { storageNotice } from './state';
import { MenuScreen } from '../features/menu/MenuScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { ComingSoon } from '../features/placeholder/ComingSoon';
import { PracticeScreen } from '../features/practice/PracticeScreen';
import { Icon } from '../ui/components/Icon';
import s from './App.module.css';

const screens: Record<Route, () => preact.JSX.Element> = {
  menu: () => <MenuScreen />,
  settings: () => <SettingsScreen />,
  learn: () => (
    <ComingSoon
      title="Learn Typing"
      phase={3}
      text="A guided course with animated hands, from the home row to code."
    />
  ),
  fight: () => (
    <ComingSoon
      title="Fight"
      phase={5}
      text="Arcade combat powered by your typing. Practice difficulty included."
    />
  ),
  practice: () => <PracticeScreen />,
  stats: () => (
    <ComingSoon title="Stats & Progress" phase={4} text="Key mastery, calm vs pressure speed and records." />
  ),
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
    document.documentElement.dataset.mode = current === 'fight' ? 'fight' : 'calm';
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
