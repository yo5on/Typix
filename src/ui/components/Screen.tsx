import type { ComponentChildren } from 'preact';
import { Icon } from './Icon';
import s from './Screen.module.css';

/** Standard page frame: back button, title, optional right-side content, then the page body. */
export function Screen({
  title,
  onBack,
  aside,
  fill,
  children,
}: {
  title: string;
  onBack: () => void;
  aside?: ComponentChildren;
  /** Fill the whole window with no page scroll (for full-screen surfaces like the fight). */
  fill?: boolean;
  children: ComponentChildren;
}) {
  return (
    <div class={fill ? `${s.screen} ${s.fill}` : s.screen}>
      <header class={s.header}>
        <button type="button" class={s.back} onClick={onBack}>
          <Icon name="back" size={18} />
          <span>Menu</span>
          <kbd>Esc</kbd>
        </button>
        <h1 class={s.title}>{title}</h1>
        <div class={s.aside}>{aside}</div>
      </header>
      <main class={s.body}>{children}</main>
    </div>
  );
}
