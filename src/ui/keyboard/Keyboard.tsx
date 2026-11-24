import type { Layout } from '../../core/layout/types';
import s from './Keyboard.module.css';

export interface KeyHeat {
  presses: number;
  errors: number;
}

export const fingerVar = (f: string) =>
  `var(--finger-${f === 'L1' || f === 'R1' ? 'thumb' : f.toLowerCase()})`;

/**
 * On-screen keyboard. With `heat`, each typed key is tinted by its error rate and shows the
 * percentage as text (so the heatmap doesn't depend on colour alone).
 * Learning adds `lit` (the key(s) to press next), `dim` (keys not in the lesson) and finger labels.
 */
export function Keyboard({
  layout,
  heat,
  label,
  unit = 52,
  lit,
  dim,
  fingerLabels,
}: {
  layout: Layout;
  heat?: Map<string, KeyHeat>;
  label: string;
  /** Pixels per key unit. */
  unit?: number;
  /** Key codes to light up in their finger's colour. */
  lit?: ReadonlySet<string>;
  /** Key codes to fade out. */
  dim?: ReadonlySet<string>;
  /** Shows the finger (L5…R5) on each key, so finger colour is not the only cue. */
  fingerLabels?: boolean;
}) {
  return (
    <div class={s.board} role="img" aria-label={label} style={{ '--unit': `${unit}px` }}>
      {layout.keys.map((k) => {
        const h = heat?.get(k.code);
        const rate = h && h.presses ? h.errors / h.presses : 0;
        const legend = k.label ?? (k.base && /[a-z]/.test(k.base) ? k.base.toUpperCase() : k.base);
        const cls = [
          s.key,
          heat && !h ? s.unused : '',
          h?.errors ? s.hasRate : '',
          lit?.has(k.code) ? s.lit : '',
          dim?.has(k.code) && !lit?.has(k.code) ? s.dim : '',
        ].join(' ');
        return (
          <div
            key={k.code}
            class={cls}
            data-code={k.code}
            style={{
              left: `calc(${k.x} * var(--unit))`,
              top: `calc(${k.row} * var(--unit))`,
              width: `calc(${k.w} * var(--unit) - 4px)`,
              '--finger': fingerVar(k.finger),
              '--heat': `${Math.round(Math.min(1, rate * 4) * 70)}%`,
            }}
          >
            {k.shift && !/[A-Z]/.test(k.shift) && <span class={s.shift}>{k.shift}</span>}
            <span class={k.label ? s.named : s.legend}>{legend}</span>
            {h && h.errors > 0 && <span class={`${s.rate} num`}>{Math.round(rate * 100)}%</span>}
            {fingerLabels && <span class={s.finger}>{k.finger}</span>}
            {k.homeBump && <span class={s.bump} />}
          </div>
        );
      })}
    </div>
  );
}
