import { useRef } from 'preact/hooks';
import { navigate, type Route } from '../../app/router';
import { progress } from '../../app/state';
import { Icon, type IconName } from '../../ui/components/Icon';
import s from './MenuScreen.module.css';

const items: { route: Route; label: string; detail: string; icon: IconName }[] = [
  { route: 'learn', label: 'Learn Typing', detail: 'Guided course with animated hands', icon: 'learn' },
  { route: 'fight', label: 'Fight', detail: 'Test your skills in arcade combat', icon: 'fight' },
  { route: 'practice', label: 'Free Practice', detail: 'Timed tests, drills, custom text', icon: 'practice' },
  { route: 'stats', label: 'Stats & Progress', detail: 'Mastery, history and records', icon: 'stats' },
  { route: 'settings', label: 'Settings', detail: 'Accessibility, audio, data', icon: 'settings' },
];

export function MenuScreen() {
  const listRef = useRef<HTMLUListElement>(null);
  const p = progress.value;
  const lessonsDone = Object.values(p.lessons).filter((l) => l.completed).length;

  // ↑/↓ move between menu entries (Tab still works too).
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(listRef.current?.querySelectorAll('button') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
    buttons[i === -1 ? 0 : next]?.focus();
    e.preventDefault();
  }

  return (
    <div class={s.menu} onKeyDown={onKeyDown}>
      <header class={s.top}>
        <span class={s.wordmark}>HOMEROW</span>
      </header>

      <div class={s.content}>
        <button type="button" class={s.continue} onClick={() => navigate('learn')} data-autofocus>
          <span class={s.continueEyebrow}>{lessonsDone === 0 ? 'Start here' : 'Continue'}</span>
          <span class={s.continueTitle}>Unit 0 · Orientation</span>
          <span class={s.continueDetail}>Posture, the F and J bumps, and the home position</span>
          <span class={s.continueAction}>
            Enter <Icon name="chevron" size={16} />
          </span>
        </button>

        <nav aria-label="Main menu">
          <ul class={s.list} ref={listRef}>
            {items.map((item) => (
              <li key={item.route}>
                <button type="button" class={s.item} onClick={() => navigate(item.route)}>
                  <span class={s.itemIcon}>
                    <Icon name={item.icon} />
                  </span>
                  <span class={s.itemLabel}>{item.label}</span>
                  <span class={s.itemDetail}>{item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <footer class={s.footer}>
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>Enter</kbd> select
        </span>
        <span>
          <kbd>Esc</kbd> back
        </span>
        <span class={s.footerNote}>No account needed · progress stays in this browser</span>
      </footer>
    </div>
  );
}
