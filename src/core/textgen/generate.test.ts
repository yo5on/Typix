import { describe, expect, it } from 'vitest';
import { enCommonWords } from '../../content/words/en-common';
import { indexLayout } from '../layout/keys';
import { usQwerty } from '../layout/us-qwerty';
import { defaultProgress } from '../store/schema';
import { emptyKeyStat } from '../stats/aggregate';
import {
  filterWords,
  HOME_ROW,
  knownLetters,
  MIN_POOL,
  normalizeCustomText,
  pickWords,
  seededRng,
} from './generate';

const layout = indexLayout(usQwerty);

describe('word list', () => {
  it('is lowercase a–z only and has enough home-row words for a beginner', () => {
    for (const w of enCommonWords) expect(w).toMatch(/^[a-z]+$/);
    expect(filterWords(enCommonWords, new Set(HOME_ROW)).length).toBeGreaterThanOrEqual(MIN_POOL * 2);
    expect(enCommonWords.length).toBeGreaterThan(800);
  });
});

describe('pickWords', () => {
  it('never emits characters outside the allowed set, across many seeds and key sets', () => {
    const sets = [HOME_ROW, HOME_ROW + 'ei', HOME_ROW + 'eirutyo', 'abcdefghijklmnopqrstuvwxyz'];
    for (const keys of sets) {
      const allowed = new Set(keys);
      const pool = filterWords(enCommonWords, allowed);
      for (let seed = 1; seed <= 50; seed++) {
        const words = pickWords(pool, 40, { rng: seededRng(seed), focus: new Set('k') });
        expect(words).toHaveLength(40);
        expect(
          [...words.join('')].filter((c) => !allowed.has(c)),
          `seed ${seed}, keys ${keys}`,
        ).toEqual([]);
      }
    }
  });

  it('is reproducible with the same seed and avoids immediate repeats', () => {
    const pool = filterWords(enCommonWords, new Set(HOME_ROW));
    const a = pickWords(pool, 200, { rng: seededRng(7) });
    expect(a).toEqual(pickWords(pool, 200, { rng: seededRng(7) }));
    for (let i = 1; i < a.length; i++) expect(a[i]).not.toBe(a[i - 1]);
  });

  it('favours words containing focus characters', () => {
    const words = pickWords(enCommonWords, 2000, { rng: seededRng(3), focus: new Set('z') });
    const withZ = words.filter((w) => w.includes('z')).length / words.length;
    expect(withZ).toBeGreaterThan(0.6);
  });

  it('returns nothing from an empty pool', () => {
    expect(pickWords([], 5, { rng: seededRng(1) })).toEqual([]);
  });
});

describe('knownLetters', () => {
  it('starts with the home row and adds well-practised letters only', () => {
    const p = defaultProgress();
    expect([...knownLetters(p, layout)].sort().join('')).toBe(HOME_ROW.split('').sort().join(''));
    p.keys.KeyE = { ...emptyKeyStat(), presses: 30, recent: new Array(30).fill(1) };
    p.keys.KeyR = { ...emptyKeyStat(), presses: 30, recent: new Array(30).fill(0) };
    p.keys.KeyT = { ...emptyKeyStat(), presses: 5, recent: new Array(5).fill(1) };
    const known = knownLetters(p, layout);
    expect(known.has('e')).toBe(true);
    expect(known.has('r')).toBe(false);
    expect(known.has('t')).toBe(false);
  });
});

describe('normalizeCustomText', () => {
  it('converts typographic punctuation and collapses whitespace', () => {
    const r = normalizeCustomText('  “It’s” — fine…\n\n\tok  ', layout);
    expect(r).toEqual({ text: '"It\'s" - fine... ok', removed: 0 });
  });

  it('removes characters a US keyboard cannot type and counts them', () => {
    expect(normalizeCustomText('café 😀 ok', layout)).toEqual({ text: 'caf ok', removed: 2 });
  });

  it('limits length', () => {
    expect(normalizeCustomText('a'.repeat(9000), layout).text).toHaveLength(5000);
  });
});
