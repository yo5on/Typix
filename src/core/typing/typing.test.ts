import { describe, expect, it } from 'vitest';
import { TypingSession, type ErrorMode } from './engine';
import { computeMetrics, consistency, wpmBySecond } from './metrics';

/** Plays [key, time] pairs into a new session. */
function play(target: string, mode: ErrorMode, strokes: [string, number][]) {
  const s = new TypingSession(target, mode);
  for (const [key, t] of strokes) s.input({ key, t });
  return s;
}

/** Evenly spaced strokes: one key every `gap` ms starting at t=0. */
const even = (keys: string, gap: number): [string, number][] => [...keys].map((k, i) => [k, i * gap]);

describe('TypingSession', () => {
  it('advances on correct keys and finishes at the end', () => {
    const s = play('abc', 'stop', even('abc', 100));
    expect(s.done).toBe(true);
    expect(s.correctChars).toBe(3);
    expect(s.events.map((e) => e.kind)).toEqual(['correct', 'correct', 'correct']);
    expect(s.events.map((e) => e.intervalMs)).toEqual([null, 100, 100]);
  });

  it('stop mode waits on a wrong key and ignores Backspace', () => {
    const s = play('ab', 'stop', [
      ['a', 0],
      ['x', 100],
      ['Backspace', 150],
      ['b', 200],
    ]);
    expect(s.events.map((e) => e.kind)).toEqual(['correct', 'wrong', 'correct']);
    expect(s.pos).toBe(2);
    expect(s.correctChars).toBe(2);
  });

  it('continue mode moves past errors and Backspace can fix them', () => {
    const s = play('ab', 'continue', [
      ['x', 0],
      ['Backspace', 100],
      ['a', 200],
      ['b', 300],
    ]);
    expect(s.events.map((e) => e.kind)).toEqual(['wrong', 'backspace', 'correct', 'correct']);
    expect(s.done).toBe(true);
    expect(s.correctChars).toBe(2);
  });

  it('continue mode counts uncorrected errors as not correct', () => {
    const s = play('abc', 'continue', even('axc', 100));
    expect(s.done).toBe(true);
    expect(s.correctChars).toBe(2);
  });

  it('ignores non-character keys, Backspace at the start, and input after the end', () => {
    const s = play('a', 'continue', [
      ['Backspace', 0],
      ['Shift', 10],
      ['ArrowLeft', 20],
      ['a', 30],
      ['b', 40],
    ]);
    expect(s.events).toHaveLength(1);
    expect(s.events[0]!.intervalMs).toBeNull();
  });

  it('supports appending text', () => {
    const s = play('a', 'stop', [['a', 0]]);
    expect(s.done).toBe(true);
    s.append('b');
    expect(s.done).toBe(false);
    s.input({ key: 'b', t: 100 });
    expect(s.correctChars).toBe(2);
  });
});

describe('metrics', () => {
  it('golden fixture: 60 correct characters in 12 s', () => {
    // 59 characters plus a final period = 60 keys, one every 200 ms.
    const text = 'the quick brown fox jumps over the lazy dog and then sleeps';
    expect(text).toHaveLength(59);
    const s = play(text + '.', 'stop', even(text + '.', 200));
    const m = computeMetrics(s.events, s.correctChars, 12_000);
    expect(m).toEqual({
      wpm: 60, // (60 / 5) / 0.2 min
      rawWpm: 60,
      accuracy: 1,
      consistency: 1, // perfectly even rhythm
      correctChars: 60,
      keystrokes: 60,
      errors: 0,
      durationMs: 12_000,
    });
  });

  it('golden fixture with errors and a correction', () => {
    // target "hello", continue mode: h e x(backspace) l l o — 6 character keys, 1 error, 5 correct chars.
    const s = play('hello', 'continue', [
      ['h', 0],
      ['e', 200],
      ['x', 400],
      ['Backspace', 600],
      ['l', 800],
      ['l', 1000],
      ['o', 1200],
    ]);
    const m = computeMetrics(s.events, s.correctChars, 6000);
    expect(m.correctChars).toBe(5);
    expect(m.keystrokes).toBe(6);
    expect(m.errors).toBe(1);
    expect(m.accuracy).toBeCloseTo(5 / 6);
    expect(m.wpm).toBeCloseTo(10); // (5/5) / 0.1 min
    expect(m.rawWpm).toBeCloseTo(12);
  });

  it('handles zero duration and no input without dividing by zero', () => {
    expect(computeMetrics([], 0, 0)).toMatchObject({ wpm: 0, rawWpm: 0, accuracy: 0, consistency: 1 });
    const s = play('a', 'stop', [['a', 0]]);
    expect(computeMetrics(s.events, 1, 0).wpm).toBe(0);
  });

  it('all-error runs have zero accuracy and zero wpm', () => {
    const s = play('aaa', 'continue', even('bbb', 100));
    const m = computeMetrics(s.events, s.correctChars, 300);
    expect(m.accuracy).toBe(0);
    expect(m.wpm).toBe(0);
    expect(m.rawWpm).toBeGreaterThan(0);
  });

  it('consistency drops with uneven rhythm and ignores pauses', () => {
    const steady = play('abcde', 'stop', even('abcde', 150));
    const uneven = play('abcde', 'stop', [
      ['a', 0],
      ['b', 50],
      ['c', 400],
      ['d', 450],
      ['e', 900],
    ]);
    const paused = play('abcde', 'stop', [
      ['a', 0],
      ['b', 150],
      ['c', 300],
      ['d', 5300], // 5 s pause: excluded
      ['e', 5450],
    ]);
    expect(consistency(steady.events)).toBe(1);
    expect(consistency(uneven.events)).toBeLessThan(0.5);
    expect(consistency(paused.events)).toBe(1);
  });

  it('wpmBySecond accumulates correct characters per second', () => {
    const s = play('aaaaaaaaaa', 'stop', even('aaaaaaaaaa', 200)); // 5 per second
    expect(wpmBySecond(s.events, 0, 2000)).toEqual([60, 60]);
  });
});
