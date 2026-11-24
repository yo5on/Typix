import type { ComponentChildren } from 'preact';
import { Icon } from './Icon';
import s from './Screen.module.css';

/** Standard page frame: back button, title, optional right-side content, then the page body. */
export function Screen({
  title,
  onBack,
  aside,
  children,
}: {
  title: string;
  onBack: () => void;
  aside?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class={s.screen}>
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
