import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { progress, settings } from '../../app/state';
import { TypingSession, type TypingEvent } from '../../core/typing/engine';
import { computeMetrics, wpmBySecond, type Metrics } from '../../core/typing/metrics';
import { bigramResults, keyResults, recordSession, sessionWeakKeys } from '../../core/stats/aggregate';
import { TypingText } from '../../ui/typing/TypingText';
import { useTypingKeys } from '../../ui/typing/useTypingKeys';
import type { KeyHeat } from '../../ui/keyboard/Keyboard';
import { describeConfig, layout, type PreparedTest, type TestConfig } from './config';
import s from './practice.module.css';

/** Tests shorter than this are shown but not saved, so a stray key doesn't skew your stats. */
const MIN_SAVED_CHARS = 10;
const MIN_SAVED_MS = 3000;
/** Timed tests add more words when fewer than this many characters remain. */
const REFILL_AT = 80;

export interface FinishedTest {
  config: TestConfig;
  metrics: Metrics;
  series: number[];
  heat: Map<string, KeyHeat>;
  weakKeys: string[];
  slowPairs: { pair: string; ms: number }[];
  saved: boolean;
}

export function TestView({
  config,
  test,
  onFinish,
  onRestart,
  onExit,
}: {
  config: TestConfig;
  test: PreparedTest;
  onFinish: (r: FinishedTest) => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const session = useMemo(() => new TypingSession(test.text, settings.value.errorMode), [test]);
  const missed = useRef(new Set<number>()).current;
  const timing = useRef({ pausedTotal: 0, pausedAt: null as number | null, finished: false });
  const [, rerender] = useState(0);
  const [paused, setPaused] = useState(false);
  const [deadKey, setDeadKey] = useState(false);
  const [now, setNow] = useState(() => performance.now());

  const limitMs = config.kind === 'time' ? config.seconds * 1000 : null;
  const started = session.startedAt !== null;

  /** Active typing time so far: wall time since the first key, minus time spent paused. */
  const elapsed = (at: number) => {
    const t = timing.current;
    if (session.startedAt === null) return 0;
    const pausedNow = t.pausedAt !== null ? at - t.pausedAt : 0;
    return at - t.pausedTotal - pausedNow - session.startedAt;
  };

  function finish() {
    const t = timing.current;
    if (t.finished) return;
    t.finished = true;
    const events: TypingEvent[] = session.events;
    const first = events[0];
    const durationMs =
      limitMs !== null
        ? Math.min(limitMs, elapsed(performance.now()))
        : first
          ? events.at(-1)!.t - first.t
          : 0;
    const metrics = computeMetrics(events, session.correctChars, durationMs);
    const perKey = keyResults(events, layout);
    const saved = metrics.correctChars >= MIN_SAVED_CHARS && durationMs >= MIN_SAVED_MS;
    if (saved) {
      progress.value = recordSession(progress.value, {
        id: crypto.randomUUID(),
        at: Date.now(),
        mode: 'practice',
        ref: describeConfig(config),
        pressure: 'calm',
        target: session.target,
        events,
        metrics,
        layout,
      });
    }
    const slowPairs = [...bigramResults(events, session.target)]
      .filter(([, r]) => r.latencies.length >= 2)
      .map(([pair, r]) => ({ pair, ms: r.latencies.reduce((a, b) => a + b, 0) / r.latencies.length }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 3);
    onFinish({
      config,
      metrics,
      series: first ? wpmBySecond(events, first.t, durationMs) : [],
      heat: new Map([...perKey].map(([code, r]) => [code, { presses: r.presses, errors: r.errors }])),
      weakKeys: sessionWeakKeys(perKey),
      slowPairs,
      saved,
    });
  }

  useTypingKeys(true, {
    onEscape: onExit,
    onTab: onRestart,
    onKey(key, at) {
      const t = timing.current;
      if (t.finished) return;
      if (t.pausedAt !== null) {
        // The key that resumes a paused test is not typed.
        t.pausedTotal += at - t.pausedAt;
        t.pausedAt = null;
        setPaused(false);
        return;
      }
      if (key === 'Dead') return setDeadKey(true);
      const ev = session.input({ key, t: at - t.pausedTotal });
      if (!ev) return;
      if (ev.kind === 'wrong') missed.add(ev.index);
      if (test.more && session.target.length - session.pos < REFILL_AT) session.append(test.more());
      if (session.done) finish();
      else rerender((n) => n + 1);
    },
  });

  // Pause when the window loses focus mid-test, so time away doesn't count.
  useEffect(() => {
    const pause = () => {
      const t = timing.current;
      if (session.startedAt === null || t.finished || t.pausedAt !== null) return;
      t.pausedAt = performance.now();
      setPaused(true);
    };
    const onVisibility = () => document.hidden && pause();
    addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [session]);

  // Timed tests: tick the clock and stop at the limit.
  useEffect(() => {
    if (limitMs === null || !started) return;
    const id = setInterval(() => {
      const at = performance.now();
      setNow(at);
      if (timing.current.pausedAt === null && elapsed(at) >= limitMs) finish();
    }, 100);
    return () => clearInterval(id);
  }, [started, limitMs]);

  const wordsTotal = config.kind === 'time' ? null : session.target.split(' ').length;
  const wordsDone = session.target.slice(0, session.pos).split(' ').length - 1;
  const remaining = limitMs !== null ? Math.max(0, Math.ceil((limitMs - elapsed(now)) / 1000)) : null;

  return (
    <div class={s.test}>
      <div class={s.testBar}>
        <span class={`${s.counter} num`} aria-live="off">
          {remaining !== null
            ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
            : `${wordsDone} / ${wordsTotal}`}
        </span>
        {test.note && <span class={s.note}>{test.note}</span>}
        {!started && <span class={s.note}>Start typing when you're ready.</span>}
      </div>

      <div class={s.textWrap}>
        <TypingText
          target={session.target}
          pos={session.pos}
          typed={session.typed}
          missed={missed}
          inactive={paused}
        />
        {paused && (
          <div class={s.paused} role="status">
            <span>Paused. Press any key to continue.</span>
          </div>
        )}
      </div>
      <p class="visually-hidden" aria-live="polite">
        {started ? '' : 'Typing test ready. Start typing to begin.'}
      </p>

      {deadKey && (
        <p class={s.warning} role="alert">
          Your keyboard sent a "dead key", which usually means a US-International or non-US layout. Typix
          expects a plain US layout, so quotes and some symbols may not register.
        </p>
      )}

      <footer class={s.testFooter}>
        <span>
          <kbd>Tab</kbd> restart
        </span>
        <span>
          <kbd>Esc</kbd> stop
        </span>
        <span>
          {settings.value.errorMode === 'stop'
            ? 'Mistakes: wait for the right key'
            : 'Mistakes: carry on, Backspace allowed'}
        </span>
      </footer>
    </div>
  );
}
