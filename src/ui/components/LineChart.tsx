import s from './LineChart.module.css';

/** Minimal single-series line chart (SVG). The data summary goes in `label` for screen readers. */
export function LineChart({ values, label, unit }: { values: number[]; label: string; unit: string }) {
  const W = 600;
  const H = 120;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`).join(' ');
  return (
    <figure class={s.chart}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <line x1="0" x2={W} y1={H} y2={H} class={s.axis} />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} class={s.grid} />
        <polyline points={values.length > 1 ? points : `0,${H} ${W},${H}`} class={s.line} />
      </svg>
      <div class={s.labels}>
        <span class="num">
          peak {Math.round(max)} {unit}
        </span>
        <span class="num">{values.length}s</span>
      </div>
    </figure>
  );
}
