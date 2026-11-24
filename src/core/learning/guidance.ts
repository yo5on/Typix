import type { KeyStat, Progress, Settings } from '../store/schema';

/**
 * Per-key fading guidance (PLAN §5.4).
 * 3 = animated hands + lit key, 2 = lit key + highlighted finger, 1 = hint only after a pause, 0 = no hint.
 */
export type Guidance = KeyStat['guidance'];

/** Hint level 1 waits this long without a key press before showing the hint. */
export const HESITATION_MS = 700;

const acc = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** One step up or down at most, so a single good session can't strip away all the help. */
export function nextGuidance(level: Guidance, recent: number[]): Guidance {
  const last = (n: number) => recent.slice(-n);
  // Struggling again: give one level of help back.
  if (level < 3 && recent.length >= 10 && acc(last(20)) < 0.9) return (level + 1) as Guidance;
  if (level === 3 && recent.length >= 30 && acc(last(30)) >= 0.95) return 2;
  // shortcut: "at a steady pace" from §5.4 is not checked yet; add a latency check if L2 fades too early in playtests.
  if (level === 2 && recent.length >= 50 && acc(last(50)) >= 0.95) return 1;
  if (level === 1 && recent.length >= 50 && acc(last(50)) >= 0.97) return 0;
  return level;
}

/** Re-evaluates the guidance level of the given keys. Never mutates the input. */
export function applyGuidance(progress: Progress, codes: Iterable<string>): Progress {
  const keys = { ...progress.keys };
  for (const code of codes) {
    const k = keys[code];
    if (k) keys[code] = { ...k, guidance: nextGuidance(k.guidance, k.recent) };
  }
  return { ...progress, keys };
}

/** The level to show for a key: the Settings override wins, otherwise the key's own level (new keys start at 3). */
export function guidanceFor(
  progress: Progress,
  code: string,
  override: Settings['guidanceOverride'],
): Guidance {
  return override === 'auto' ? (progress.keys[code]?.guidance ?? 3) : override;
}
