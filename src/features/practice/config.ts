import { enCommonWords } from '../../content/words/en-common';
import { indexLayout } from '../../core/layout/keys';
import { usQwerty } from '../../core/layout/us-qwerty';
import type { Progress } from '../../core/store/schema';
import { weakestKeys } from '../../core/stats/aggregate';
import { filterWords, knownLetters, MIN_POOL, pickWords } from '../../core/textgen/generate';

export const layout = indexLayout(usQwerty);

export type TestConfig =
  | { kind: 'time'; seconds: number; source: Source }
  | { kind: 'words'; count: number; source: Source }
  | { kind: 'weak' }
  | { kind: 'custom'; text: string };

export type Source = 'yours' | 'full';

export const TIME_OPTIONS = [30, 60, 180, 300];
export const WORD_OPTIONS = [25, 50, 100];
const WEAK_DRILL_WORDS = 50;
/** Timed tests start with this many words and add more as you near the end. */
const TIME_CHUNK = 40;

export interface PreparedTest {
  text: string;
  /** More text for timed tests, or null when the text is fixed. */
  more: (() => string) | null;
  /** Shown above the text, e.g. which keys a drill targets. */
  note: string | null;
}

export type Prepared = { ok: true; test: PreparedTest } | { ok: false; reason: string };

/** Characters of the given key codes, as typed without Shift. */
const charsOf = (codes: string[]) =>
  new Set(codes.map((c) => layout.byCode.get(c)?.base).filter((c): c is string => !!c));

export function describeConfig(c: TestConfig): string {
  switch (c.kind) {
    case 'time':
      return `${c.seconds < 60 ? `${c.seconds}s` : `${c.seconds / 60} min`} · ${c.source === 'yours' ? 'your keys' : 'full keyboard'}`;
    case 'words':
      return `${c.count} words · ${c.source === 'yours' ? 'your keys' : 'full keyboard'}`;
    case 'weak':
      return 'weak-key drill';
    case 'custom':
      return 'custom text';
  }
}

/** Builds the text for a test. `rng` is injectable for tests; Math.random in the app. */
export function prepareTest(c: TestConfig, progress: Progress, rng: () => number = Math.random): Prepared {
  if (c.kind === 'custom') {
    return c.text.length
      ? { ok: true, test: { text: c.text, more: null, note: null } }
      : { ok: false, reason: 'Paste some text first.' };
  }

  if (c.kind === 'weak') {
    const weak = weakestKeys(progress, 4);
    const focus = charsOf(weak);
    if (focus.size === 0) {
      return {
        ok: false,
        reason: 'Not enough data yet. Finish a test or two and your weak keys will appear here.',
      };
    }
    const words = pickWords(enCommonWords, WEAK_DRILL_WORDS, { rng, focus, focusShare: 0.8 });
    return {
      ok: true,
      test: {
        text: words.join(' '),
        more: null,
        note: `Focus: ${[...focus].map((k) => k.toUpperCase()).join(' ')}`,
      },
    };
  }

  let pool: readonly string[] = enCommonWords;
  let note: string | null = null;
  if (c.source === 'yours') {
    const known = knownLetters(progress, layout);
    const filtered = filterWords(enCommonWords, known);
    if (filtered.length >= MIN_POOL) pool = filtered;
    else note = 'Not enough words with your keys yet, so this test uses the full keyboard.';
  }

  if (c.kind === 'words') {
    return { ok: true, test: { text: pickWords(pool, c.count, { rng }).join(' '), more: null, note } };
  }
  return {
    ok: true,
    test: {
      text: pickWords(pool, TIME_CHUNK, { rng }).join(' '),
      more: () => ' ' + pickWords(pool, TIME_CHUNK, { rng }).join(' '),
      note,
    },
  };
}
