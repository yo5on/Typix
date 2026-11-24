import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import s from './TypingText.module.css';

export interface TypingTextProps {
  target: string;
  /** Cursor position. */
  pos: number;
  /** What was typed at each position (may contain wrong characters in "continue" mode). */
  typed: readonly string[];
  /** Positions where a mistake was made, even if fixed later. */
  missed: ReadonlySet<number>;
  /** Dims the text and hides the caret (e.g. while paused). */
  inactive?: boolean;
}

/**
 * Renders the text to type in a three-line window that scrolls with the caret.
 * Mistakes are underlined as well as coloured, so they don't rely on colour alone.
 */
export function TypingText({ target, pos, typed, missed, inactive }: TypingTextProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Split into words (each followed by its space) so lines only break between words.
  const words = useMemo(() => {
    const out: { start: number; chars: string }[] = [];
    const re = /\S+\s*|\s+/g;
    for (let m = re.exec(target); m; m = re.exec(target)) out.push({ start: m.index, chars: m[0] });
    return out;
  }, [target]);

  // Keep the caret's line as the second visible line.
  useLayoutEffect(() => {
    const caret = innerRef.current?.querySelector<HTMLElement>('[data-caret]');
    const inner = innerRef.current;
    if (!caret || !inner) return;
    const lineHeight = caret.offsetHeight;
    const shift = Math.max(0, caret.offsetTop - lineHeight);
    inner.style.transform = `translateY(${-shift}px)`;
  }, [pos, target]);

  return (
    <div class={`${s.box} ${inactive ? s.inactive : ''}`} ref={boxRef} aria-hidden="true">
      <div class={s.inner} ref={innerRef}>
        {words.map((w) => (
          <span class={s.word} key={w.start}>
            {[...w.chars].map((ch, j) => {
              const i = w.start + j;
              let cls = s.todo;
              if (i < pos) {
                const wrong = typed[i] !== undefined && typed[i] !== ch;
                cls = wrong ? s.wrong : missed.has(i) ? s.fixed : s.done;
              } else if (i === pos) cls = missed.has(i) ? `${s.todo} ${s.missNow}` : s.todo;
              return (
                <span key={j} class={cls} data-caret={i === pos ? true : undefined}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              );
            })}
          </span>
        ))}
        {pos >= target.length && <span data-caret class={s.todo} />}
      </div>
    </div>
  );
}
