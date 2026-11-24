import { useEffect, useRef } from 'preact/hooks';

export interface TypingKeyHandlers {
  /** A character key, Backspace, or "Dead" (a dead key from a non-US layout). */
  onKey: (key: string, t: number) => void;
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
    const onKeyDown = (e: KeyboardEvent) => {
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
        if (!e.repeat) h.onKey(e.key, e.timeStamp || performance.now());
      }
    };
    // Capture phase, so this runs before the app-wide Esc handler.
    addEventListener('keydown', onKeyDown, { capture: true });
    return () => removeEventListener('keydown', onKeyDown, { capture: true });
  }, [active]);
}
