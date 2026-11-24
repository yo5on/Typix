import { useEffect } from 'preact/hooks';
import { openLesson, updateSettings } from '../../app/state';
import { PLACEMENT_ID } from '../../core/learning/placement';
import { Icon } from '../../ui/components/Icon';
import s from './Onboarding.module.css';

const choices = [
  {
    label: 'I’m new to touch typing',
    detail: 'Start with posture and the home row. No timers, nothing to fail.',
    go: () => openLesson('u0.l1'),
  },
  {
    label: 'I can type, place me',
    detail: 'A two-minute placement test marks the units you already know.',
    go: () => openLesson(PLACEMENT_ID),
  },
  {
    label: 'Just let me look around',
    detail: 'Go to the menu. You can start the course any time.',
    go: () => {},
  },
];

/** First launch (PLAN §4.1): one question, every answer is a single key press away, Esc skips. */
export function Onboarding() {
  const choose = (go: () => void) => {
    updateSettings({ onboarded: true });
    go();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = ['1', '2', '3'].indexOf(e.key);
      if (e.key === 'Escape') choose(() => {});
      else if (i >= 0) choose(choices[i]!.go);
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', onKey, { capture: true });
    return () => removeEventListener('keydown', onKey, { capture: true });
  }, []);

  return (
    <section class={s.onboarding} aria-labelledby="onboarding-title">
      <p class={s.eyebrow}>Welcome to Typix</p>
      <h1 id="onboarding-title" class={s.title}>
        How do you type today?
      </h1>
      <ul class={s.choices}>
        {choices.map((c, i) => (
          <li key={c.label}>
            <button
              type="button"
              class={s.choice}
              onClick={() => choose(c.go)}
              data-autofocus={i === 0 ? true : undefined}
            >
              <kbd>{i + 1}</kbd>
              <span class={s.label}>{c.label}</span>
              <span class={s.detail}>{c.detail}</span>
              <Icon name="chevron" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <p class={s.note}>
        No account needed. Progress is saved in this browser, and you can export it any time from Settings.{' '}
        <kbd>Esc</kbd> skips.
      </p>
    </section>
  );
}
