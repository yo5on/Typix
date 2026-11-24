import type { TypingEvent } from '../typing/engine';
import type { Metrics } from '../typing/metrics';
import { PAUSE_MS } from '../typing/metrics';
import type { LayoutIndex } from '../layout/keys';
import {
  MAX_SESSIONS,
  type KeyStat,
  type ModeStat,
  type PracticeMode,
  type Progress,
  type SessionSummary,
} from '../store/schema';

export const RECENT_WINDOW = 50;
/** Running means weight new samples at least 1/MEAN_WINDOW, so old habits fade out. */
const MEAN_WINDOW = 200;
export const MAX_BIGRAMS = 300;

export interface KeyResult {
  presses: number;
  errors: number;
  latencies: number[];
  /** 1 = correct, 0 = error, in order. */
  results: number[];
}

/** Groups a session's keystrokes by the physical key that *should* have been pressed. */
export function keyResults(events: TypingEvent[], layout: LayoutIndex): Map<string, KeyResult> {
  const out = new Map<string, KeyResult>();
  for (const e of events) {
    if (e.kind === 'backspace') continue;
    const code = layout.byChar.get(e.expected)?.code;
    if (!code) continue;
    let r = out.get(code);
    if (!r) out.set(code, (r = { presses: 0, errors: 0, latencies: [], results: [] }));
    r.presses++;
    r.results.push(e.kind === 'correct' ? 1 : 0);
    if (e.kind === 'wrong') r.errors++;
    else if (e.intervalMs !== null && e.intervalMs <= PAUSE_MS) r.latencies.push(e.intervalMs);
  }
  return out;
}

/** Letter-pair timings inside words: how long the second key took after the first. */
export function bigramResults(events: TypingEvent[], target: string) {
  const out = new Map<string, { n: number; latencies: number[]; errors: number }>();
  for (let i = 1; i < events.length; i++) {
    const e = events[i]!;
    const prev = events[i - 1]!;
    if (e.kind === 'backspace' || e.index === 0) continue;
    const pair = target.slice(e.index - 1, e.index + 1);
    if (pair.includes(' ')) continue;
    let r = out.get(pair);
    if (!r) out.set(pair, (r = { n: 0, latencies: [], errors: 0 }));
    if (e.kind === 'wrong') r.errors++;
    else if (prev.kind === 'correct' && prev.index === e.index - 1 && e.intervalMs! <= PAUSE_MS) {
      r.n++;
      r.latencies.push(e.intervalMs!);
    }
  }
  return out;
}

/** Keys missed in this session: highest error rate first, slower keys first on ties. Needs 3+ presses. */
export function sessionWeakKeys(results: Map<string, KeyResult>, n = 3): string[] {
  return [...results]
    .filter(([, r]) => r.presses >= 3 && r.errors > 0)
    .map(([code, r]) => ({ code, rate: r.errors / r.presses, ms: avg(r.latencies) }))
    .sort((a, b) => b.rate - a.rate || b.ms - a.ms)
    .slice(0, n)
    .map((k) => k.code);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function foldMean(mean: number, count: number, samples: number[]) {
  let m = mean;
  let n = count;
  for (const x of samples) {
    n++;
    m += (x - m) / Math.min(n, MEAN_WINDOW);
  }
  return m;
}

function foldMode(stat: ModeStat, r: KeyResult): ModeStat {
  return {
    presses: stat.presses + r.presses,
    errors: stat.errors + r.errors,
    meanLatencyMs: foldMean(stat.meanLatencyMs, stat.presses - stat.errors, r.latencies),
  };
}

const emptyMode = (): ModeStat => ({ presses: 0, errors: 0, meanLatencyMs: 0 });

export function emptyKeyStat(): KeyStat {
  return { ...emptyMode(), recent: [], guidance: 3, byMode: { calm: emptyMode(), pressure: emptyMode() } };
}

export function localDay(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SessionInput {
  id: string;
  at: number;
  mode: SessionSummary['mode'];
  ref: string;
  pressure: PracticeMode;
  target: string;
  events: TypingEvent[];
  metrics: Metrics;
  layout: LayoutIndex;
  result?: SessionSummary['result'];
}

/** Returns new progress with one finished session folded in. Never mutates the input. */
export function recordSession(progress: Progress, s: SessionInput): Progress {
  const perKey = keyResults(s.events, s.layout);
  const keys = { ...progress.keys };
  for (const [code, r] of perKey) {
    const old = keys[code] ?? emptyKeyStat();
    const { byMode, recent, guidance } = old;
    keys[code] = {
      ...foldMode(old, r),
      recent: [...recent, ...r.results].slice(-RECENT_WINDOW),
      guidance,
      byMode: { ...byMode, [s.pressure]: foldMode(byMode[s.pressure], r) },
    };
  }

  const bigrams = { ...progress.bigrams };
  for (const [pair, r] of bigramResults(s.events, s.target)) {
    const old = bigrams[pair] ?? { n: 0, meanMs: 0, errors: 0 };
    bigrams[pair] = {
      n: old.n + r.n,
      meanMs: foldMean(old.meanMs, old.n, r.latencies),
      errors: old.errors + r.errors,
    };
  }
  const keptBigrams = Object.fromEntries(
    Object.entries(bigrams)
      .sort(([, a], [, b]) => b.n - a.n)
      .slice(0, MAX_BIGRAMS),
  );

  const summary: SessionSummary = {
    id: s.id,
    at: s.at,
    mode: s.mode,
    ref: s.ref,
    wpm: s.metrics.wpm,
    rawWpm: s.metrics.rawWpm,
    accuracy: s.metrics.accuracy,
    consistency: s.metrics.consistency,
    durationMs: s.metrics.durationMs,
    weakKeys: sessionWeakKeys(perKey),
    ...(s.result ? { result: s.result } : {}),
  };

  // Daily totals keep the long-term history even after old session summaries are dropped.
  const day = localDay(s.at);
  const old = progress.daily[day] ?? { minutes: 0 };
  const minutes = s.metrics.durationMs / 60_000;
  const total = old.minutes + minutes;
  const wpmKey = s.pressure === 'calm' ? 'wpmCalm' : 'wpmPressure';
  const prevWpm = old[wpmKey];
  const daily = {
    ...progress.daily,
    [day]: {
      ...old,
      minutes: total,
      // shortcut: weighted by all of today's minutes, including the other mode's; fine until Fight exists (Phase 5).
      [wpmKey]:
        prevWpm === undefined || total === 0
          ? s.metrics.wpm
          : (prevWpm * old.minutes + s.metrics.wpm * minutes) / total,
    },
  };

  return {
    ...progress,
    keys,
    bigrams: keptBigrams,
    sessions: [...progress.sessions, summary].slice(-MAX_SESSIONS),
    daily,
  };
}

/** Lifetime weakest keys (at least `minPresses`), by recent error rate then speed. Codes, weakest first. */
export function weakestKeys(progress: Progress, n = 5, minPresses = 10): string[] {
  return Object.entries(progress.keys)
    .filter(([code, k]) => code !== 'Space' && k.presses >= minPresses)
    .map(([code, k]) => ({ code, err: 1 - avg(k.recent), ms: k.meanLatencyMs }))
    .filter((k) => k.err > 0 || k.ms > 0)
    .sort((a, b) => b.err - a.err || b.ms - a.ms)
    .slice(0, n)
    .map((k) => k.code);
}
