import { Button } from '../../ui/components/controls';
import { LineChart } from '../../ui/components/LineChart';
import { Keyboard } from '../../ui/keyboard/Keyboard';
import { usQwerty } from '../../core/layout/us-qwerty';
import { describeConfig, layout } from './config';
import type { FinishedTest } from './TestView';
import s from './practice.module.css';

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const keyName = (code: string) => {
  const base = layout.byCode.get(code)?.base;
  return base === ' ' ? 'Space' : (base?.toUpperCase() ?? code);
};

export function Results({
  result,
  onNext,
  onDrill,
  onSetup,
}: {
  result: FinishedTest;
  onNext: () => void;
  onDrill: () => void;
  onSetup: () => void;
}) {
  const m = result.metrics;
  const seconds = Math.round(m.durationMs / 1000);
  return (
    <div class={s.results}>
      <section class={s.headline} aria-label="Result">
        <div class={s.big}>
          <span class={`${s.bigValue} num`}>{Math.round(m.wpm)}</span>
          <span class={s.bigUnit}>WPM</span>
        </div>
        <dl class={s.stats}>
          <Stat label="Accuracy" value={pct(m.accuracy)} />
          <Stat label="Raw WPM" value={String(Math.round(m.rawWpm))} />
          <Stat label="Consistency" value={pct(m.consistency)} />
          <Stat label="Time" value={`${seconds}s`} />
          <Stat label="Errors" value={`${m.errors} / ${m.keystrokes}`} />
        </dl>
      </section>

      <p class={s.resultMeta}>
        {describeConfig(result.config)}
        {result.saved ? ' · saved to your stats' : ' · too short to save to your stats'}
      </p>

      <section class={s.panel}>
        <h2 class={s.panelTitle}>Speed over time</h2>
        <LineChart
          values={result.series.map(Math.round)}
          unit="WPM"
          label={`Words per minute over ${seconds} seconds, ending at ${Math.round(m.wpm)}.`}
        />
      </section>

      <div class={s.split}>
        <section class={s.panel}>
          <h2 class={s.panelTitle}>Key accuracy</h2>
          <div class={s.keyboardWrap}>
            <Keyboard
              layout={usQwerty}
              unit={34}
              heat={result.heat}
              label={`Keyboard heatmap of mistakes. ${
                result.weakKeys.length
                  ? `Most missed: ${result.weakKeys.map(keyName).join(', ')}.`
                  : 'No mistakes.'
              }`}
            />
          </div>
        </section>
        <section class={s.panel}>
          <h2 class={s.panelTitle}>To work on</h2>
          {result.weakKeys.length === 0 && result.slowPairs.length === 0 ? (
            <p class={s.muted}>Nothing stood out. Clean run.</p>
          ) : (
            <dl class={s.workOn}>
              {result.weakKeys.length > 0 && (
                <>
                  <dt>Weakest keys</dt>
                  <dd class={s.keycaps}>
                    {result.weakKeys.map((k) => (
                      <kbd key={k}>{keyName(k)}</kbd>
                    ))}
                  </dd>
                </>
              )}
              {result.slowPairs.length > 0 && (
                <>
                  <dt>Slowest letter pairs</dt>
                  <dd class={s.keycaps}>
                    {result.slowPairs.map((p) => (
                      <span key={p.pair}>
                        <kbd>{p.pair}</kbd> <span class="num">{Math.round(p.ms)} ms</span>
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          )}
        </section>
      </div>

      <div class={s.actions}>
        <Button variant="primary" icon="chevron" onClick={onNext} data-autofocus autoFocus>
          Next test
        </Button>
        <Button onClick={onDrill}>Drill weak keys</Button>
        <Button variant="ghost" onClick={onSetup}>
          Change test
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class={s.stat}>
      <dt>{label}</dt>
      <dd class="num">{value}</dd>
    </div>
  );
}
