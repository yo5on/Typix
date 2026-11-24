import type { TypingEvent } from './engine';

/** Gaps longer than this are treated as pauses: excluded from rhythm and key-speed numbers. */
export const PAUSE_MS = 2000;

export interface Metrics {
  /** (correct characters ÷ 5) ÷ minutes */
  wpm: number;
  /** (all typed characters ÷ 5) ÷ minutes */
  rawWpm: number;
  /** correct keystrokes ÷ character keystrokes (0–1). Errors later fixed with Backspace still count. */
  accuracy: number;
  /** 1 − coefficient of variation of keystroke intervals, pauses excluded, clamped 0–1. */
  consistency: number;
  correctChars: number;
  keystrokes: number;
  errors: number;
  durationMs: number;
}

const perMinute = (chars: number, ms: number) => (ms <= 0 ? 0 : chars / 5 / (ms / 60_000));

export function consistency(events: TypingEvent[]): number {
  const gaps = events
    .filter((e) => e.kind !== 'backspace' && e.intervalMs !== null && e.intervalMs <= PAUSE_MS)
    .map((e) => e.intervalMs!);
  if (gaps.length < 2) return 1; // too little data to see unevenness
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean === 0) return 1;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
  return Math.min(1, Math.max(0, 1 - sd / mean));
}

/**
 * The one definition of typing metrics used by every mode.
 * `durationMs` is active typing time (pauses for a lost window focus are already removed by the caller).
 */
export function computeMetrics(events: TypingEvent[], correctChars: number, durationMs: number): Metrics {
  const chars = events.filter((e) => e.kind !== 'backspace');
  const errors = chars.filter((e) => e.kind === 'wrong').length;
  return {
    wpm: perMinute(correctChars, durationMs),
    rawWpm: perMinute(chars.length, durationMs),
    accuracy: chars.length === 0 ? 0 : (chars.length - errors) / chars.length,
    consistency: consistency(events),
    correctChars,
    keystrokes: chars.length,
    errors,
    durationMs: Math.max(0, durationMs),
  };
}

/** WPM after each whole second, from correct keystrokes (for the results chart). */
export function wpmBySecond(events: TypingEvent[], startT: number, durationMs: number): number[] {
  const seconds = Math.max(1, Math.ceil(durationMs / 1000));
  const correctPerSecond = new Array<number>(seconds).fill(0);
  for (const e of events) {
    if (e.kind !== 'correct') continue;
    const s = Math.min(seconds - 1, Math.floor((e.t - startT) / 1000));
    if (s >= 0) correctPerSecond[s]!++;
  }
  let total = 0;
  return correctPerSecond.map((n, i) => {
    total += n;
    return perMinute(total, Math.min(durationMs, (i + 1) * 1000));
  });
}
