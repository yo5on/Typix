import { navigate } from '../../app/router';
import { Screen } from '../../ui/components/Screen';
import s from './ComingSoon.module.css';

/** Temporary screen for modes that are built in later phases. */
export function ComingSoon({ title, text, phase }: { title: string; text: string; phase: number }) {
  return (
    <Screen title={title} onBack={() => navigate('menu')}>
      <div class={s.wrap}>
        <p class={s.eyebrow}>Arrives in phase {phase}</p>
        <h2 class={s.title}>{title}</h2>
        <p class={s.text}>{text}</p>
        <button type="button" class={s.link} onClick={() => navigate('menu')} data-autofocus>
          Back to menu
        </button>
      </div>
    </Screen>
  );
}
