import type { LayoutIndex } from '../layout/keys';
import type { Progress } from '../store/schema';

/** Small seeded PRNG (mulberry32), so generated drills are reproducible in tests. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Words made only of allowed characters. */
export function filterWords(words: readonly string[], allowed: ReadonlySet<string>): string[] {
  return words.filter((w) => [...w].every((c) => allowed.has(c)));
}

export interface PickOptions {
  rng: () => number;
  /** Characters to practise: words containing them are favoured. */
  focus?: ReadonlySet<string>;
  /** Share of words drawn from the focus pool (default 0.7). */
  focusShare?: number;
}

/** Picks `count` words, never the same word twice in a row (when the pool allows it). */
export function pickWords(pool: readonly string[], count: number, opts: PickOptions): string[] {
  if (pool.length === 0) return [];
  const { rng, focus, focusShare = 0.7 } = opts;
  const focusPool = focus?.size ? pool.filter((w) => [...w].some((c) => focus.has(c))) : [];
  const out: string[] = [];
  while (out.length < count) {
    const from = focusPool.length && rng() < focusShare ? focusPool : pool;
    const word = from[Math.floor(rng() * from.length)]!;
    if (word === out.at(-1) && pool.length > 1) continue;
    out.push(word);
  }
  return out;
}

export const HOME_ROW = 'asdfghjkl';
/** Below this many words a source is too repetitive, and the caller should widen it. */
export const MIN_POOL = 15;

/**
 * Letters the player can be expected to know: the home row, plus any letter key typed
 * 20+ times with 90%+ recent accuracy.
 * shortcut: based on stats only; switch to completed Learning lessons once they exist (Phase 3).
 */
export function knownLetters(progress: Progress, layout: LayoutIndex): Set<string> {
  const letters = new Set(HOME_ROW);
  for (const [code, k] of Object.entries(progress.keys)) {
    const base = layout.byCode.get(code)?.base;
    if (!base || !/^[a-z]$/.test(base) || k.presses < 20 || k.recent.length === 0) continue;
    const acc = k.recent.reduce((a, b) => a + b, 0) / k.recent.length;
    if (acc >= 0.9) letters.add(base);
  }
  return letters;
}

const replacements: [RegExp, string][] = [
  [/[‘’‚′]/g, "'"],
  [/[“”„″]/g, '"'],
  [/[–—−]/g, '-'],
  [/…/g, '...'],
  [/\s+/g, ' '],
];

export const MAX_CUSTOM_LENGTH = 5000;

/** Cleans pasted text: typographic punctuation becomes ASCII, whitespace collapses, untypable characters go. */
export function normalizeCustomText(raw: string, layout: LayoutIndex): { text: string; removed: number } {
  let text = raw;
  for (const [re, to] of replacements) text = text.replace(re, to);
  const chars = [...text.trim()];
  const kept = chars.filter((c) => layout.byChar.has(c));
  return {
    text: kept.join('').replace(/ {2,}/g, ' ').slice(0, MAX_CUSTOM_LENGTH),
    removed: chars.length - kept.length,
  };
}
