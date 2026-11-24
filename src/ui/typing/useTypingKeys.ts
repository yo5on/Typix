import { useEffect, useRef } from 'preact/hooks';

export interface TypingKeyHandlers {
  /** A character key, Backspace, or "Dead" (a dead key from a non-US layout). */
  /** `shift`: the Shift key held, when exactly one is down. */
  onKey: (key: string, t: number, shift?: 'ShiftLeft' | 'ShiftRight') => void;
  onTab?: () => void;
  onEscape?: () => void;
}

/**
 * Captures typing keys for a typing surface while `active`.
 * Blocks the browser actions typing keys would trigger (Firefox quick find on ' and /, Space scrolling,
 * Backspace navigation, Tab focus moves). Ctrl/Cmd/Alt shortcuts are never blocked, and form fields are left alone.
 */
export function useTypingKeys(active: boolean, handlers: TypingKeyHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!active) return;
    // Which Shift keys are down, so capitals can be checked for the opposite-hand Shift.
    const held = new Set<string>();
    const onKeyUp = (e: KeyboardEvent) => held.delete(e.code);
    const onBlur = () => held.clear();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') held.add(e.code);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable], dialog')) return;
      const h = ref.current;

      if (e.key === 'Escape') {
        if (h.onEscape) {
          e.preventDefault(); // stops the app-wide "Esc = back to menu"
          h.onEscape();
        }
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!e.repeat) h.onTab?.();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Dead' || [...e.key].length === 1) {
        e.preventDefault();
        const shift =
          e.shiftKey && held.size === 1 ? ([...held][0] as 'ShiftLeft' | 'ShiftRight') : undefined;
        if (!e.repeat) h.onKey(e.key, e.timeStamp || performance.now(), shift);
      }
    };
    // Capture phase, so this runs before the app-wide Esc handler.
    addEventListener('keydown', onKeyDown, { capture: true });
    addEventListener('keyup', onKeyUp, { capture: true });
    addEventListener('blur', onBlur);
    return () => {
      removeEventListener('keydown', onKeyDown, { capture: true });
      removeEventListener('keyup', onKeyUp, { capture: true });
      removeEventListener('blur', onBlur);
    };
  }, [active]);
}
