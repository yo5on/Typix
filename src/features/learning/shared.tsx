import { useEffect, useRef } from 'preact/hooks';
import { reducedMotion, settings } from '../../app/state';
import { indexLayout } from '../../core/layout/keys';
import type { KeyStroke } from '../../core/layout/types';
import { usQwerty } from '../../core/layout/us-qwerty';
import { Hands, HANDS_BELOW, type HandsMode } from '../../ui/keyboard/Hands';
import { Keyboard } from '../../ui/keyboard/Keyboard';
import s from './learning.module.css';

export const layout = indexLayout(usQwerty);
export const UNIT = 46;

/** Keys a lesson doesn't use, so the keyboard can fade them. */
export function unusedKeys(allowed: string): Set<string> {
  const used = new Set([...(allowed + ' ')].map((c) => layout.byChar.get(c)?.code));
  for (const c of allowed) if (layout.byChar.get(c)?.shiftCode) used.add(layout.byChar.get(c)!.shiftCode);
  return new Set(usQwerty.keys.map((k) => k.code).filter((c) => !used.has(c)));
}

/** Keyboard with the hands drawn over it, honouring the Learning settings. */
export function KeyboardWithHands({
  stroke,
  hint,
  mode,
  dim,
  replay,
}: {
  stroke: KeyStroke | null;
  /** Light the key(s) for `stroke`. */
  hint: boolean;
  mode: HandsMode;
  dim?: ReadonlySet<string>;
  replay?: number;
}) {
  const v = settings.value;
  const lit = new Set(hint && stroke ? [stroke.code, ...(stroke.shiftCode ? [stroke.shiftCode] : [])] : []);
  return (
    <div class={s.board} style={{ paddingBottom: v.showHands ? `${HANDS_BELOW * UNIT}px` : 0 }}>
      <Keyboard
        layout={usQwerty}
        unit={UNIT}
        lit={lit}
        dim={dim}
        fingerLabels={v.fingerLabels}
        label={stroke && hint ? `Keyboard. Next key: ${keyName(stroke.code)}` : 'Keyboard'}
      />
      {v.showHands && (
        <Hands
          layout={layout}
          stroke={stroke}
          mode={mode}
          unit={UNIT}
          tone={v.handTone}
          reduced={reducedMotion.value}
          replay={replay}
        />
      )}
    </div>
  );
}

export function keyName(code: string): string {
  const k = layout.byCode.get(code);
  if (!k) return code;
  if (code === 'Space') return 'Space';
  return k.label ?? (k.base && /[a-z]/.test(k.base) ? k.base.toUpperCase() : (k.base ?? code));
}

/** How a character is shown on a big keycap: "F", "Space", "Shift + J". */
export function charName(c: string): string {
  if (c === ' ') return 'Space';
  if (/[A-Z]/.test(c)) return `Shift + ${c}`;
  return c.toUpperCase();
}

/**
 * Space / Enter / Esc for the non-typing steps and the summary. Space and Enter on a focused button are
 * left to the button itself, so a click never fires twice.
 */
export function useStepKeys(handlers: { space?: () => void; enter?: () => void; escape?: () => void }) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const h = ref.current;
      if (e.key === 'Escape' && h.escape) {
        e.preventDefault();
        return h.escape();
      }
      if ((e.target as HTMLElement | null)?.closest('button, input, textarea, select, a')) return;
      const run = e.key === ' ' ? h.space : e.key === 'Enter' ? h.enter : undefined;
      if (run) {
        e.preventDefault();
        run();
      }
    };
    addEventListener('keydown', onKey, { capture: true });
    return () => removeEventListener('keydown', onKey, { capture: true });
  }, []);
}

/** Focuses this view's `[data-autofocus]` element when it appears, so Enter acts on it straight away. */
export function useFocusOnMount() {
  useEffect(() => document.querySelector<HTMLElement>('[data-autofocus]')?.focus(), []);
}
