import { describe, expect, it } from 'vitest';
import { TypingSession } from '../typing/engine';
import { computeMetrics } from '../typing/metrics';
import { indexLayout } from '../layout/keys';
import { usQwerty } from '../layout/us-qwerty';
import { defaultProgress, MAX_SESSIONS } from '../store/schema';
import { isProgress } from '../store/validate';
import { bigramResults, keyResults, localDay, recordSession, RECENT_WINDOW, weakestKeys } from './aggregate';

const layout = indexLayout(usQwerty);

function session(target: string, keys: string, gap = 200, mode: 'stop' | 'continue' = 'stop') {
  const s = new TypingSession(target, mode);
  [...keys].forEach((key, i) => s.input({ key, t: i * gap }));
  return s;
}

function record(
  progress = defaultProgress(),
  target = 'sad lad',
  keys = target,
  pressure: 'calm' | 'pressure' = 'calm',
) {
  const s = session(target, keys);
  return recordSession(progress, {
    id: 'x',
    at: new Date(2026, 10, 24, 10).getTime(),
    mode: 'practice',
    ref: 'test',
    pressure,
    target,
    events: s.events,
    metrics: computeMetrics(s.events, s.correctChars, 60_000),
    layout,
  });
}

describe('keyResults', () => {
  it('attributes errors to the key that should have been pressed', () => {
    const s = session('ab', 'axb'); // stop mode: x is a wrong press aimed at b
    const r = keyResults(s.events, layout);
    expect(r.get('KeyA')).toMatchObject({ presses: 1, errors: 0, results: [1] });
    expect(r.get('KeyB')).toMatchObject({ presses: 2, errors: 1, results: [0, 1] });
  });

  it('maps capitals and space to their physical keys', () => {
    const r = keyResults(session('A a', 'A a').events, layout);
    expect(r.get('KeyA')?.presses).toBe(2);
    expect(r.get('Space')?.presses).toBe(1);
  });

  it('scores the opposite-hand Shift for every capital and shifted symbol', () => {
    const r = keyResults(session('Aj?', 'Aj?').events, layout);
    expect(r.get('ShiftRight')).toMatchObject({ presses: 1, errors: 0 }); // A: left hand → right Shift
    expect(r.get('ShiftLeft')).toMatchObject({ presses: 1, errors: 0 }); // ? (Shift + /): right hand → left Shift
    expect(r.has('KeyJ') && !r.get('KeyJ')!.errors).toBe(true);
  });

  it('a forgotten Shift counts against Shift, not the letter', () => {
    const r = keyResults(session('A', 'aA').events, layout);
    expect(r.get('KeyA')).toMatchObject({ presses: 2, errors: 0 });
    expect(r.get('ShiftRight')).toMatchObject({ presses: 2, errors: 1, results: [0, 1] });
  });

  it('a capital typed with the same-hand Shift counts against Shift only', () => {
    const s = new TypingSession('AJ', 'stop');
    s.input({ key: 'A', t: 0, shift: 'ShiftLeft' }); // wrong side
    s.input({ key: 'J', t: 200, shift: 'ShiftLeft' }); // right side
    const r = keyResults(s.events, layout);
    expect(r.get('KeyA')).toMatchObject({ errors: 0 });
    expect(r.get('ShiftRight')).toMatchObject({ presses: 1, errors: 1 });
    expect(r.get('ShiftLeft')).toMatchObject({ presses: 1, errors: 0 });
  });

  it('excludes pauses from key latency', () => {
    const s = new TypingSession('ab', 'stop');
    s.input({ key: 'a', t: 0 });
    s.input({ key: 'b', t: 9000 });
    expect(keyResults(s.events, layout).get('KeyB')?.latencies).toEqual([]);
  });
});

describe('bigramResults', () => {
  it('times letter pairs inside words only', () => {
    const r = bigramResults(session('ab cd', 'ab cd', 150).events, 'ab cd');
    expect([...r.keys()].sort()).toEqual(['ab', 'cd']);
    expect(r.get('ab')).toEqual({ n: 1, latencies: [150], errors: 0 });
  });
});

describe('recordSession', () => {
  it('produces valid progress and does not mutate its input', () => {
    const before = defaultProgress();
    const snapshot = JSON.stringify(before);
    const after = record(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(isProgress(after)).toBe(true);
    expect(after.sessions).toHaveLength(1);
    expect(after.keys.KeyS).toMatchObject({ presses: 1, errors: 0, recent: [1] });
    expect(after.keys.KeyS!.byMode.calm.presses).toBe(1);
    expect(after.keys.KeyS!.byMode.pressure.presses).toBe(0);
  });

  it('accumulates across sessions and keeps the recent window bounded', () => {
    let p = defaultProgress();
    for (let i = 0; i < 30; i++) p = record(p, 'aa', 'aa');
    expect(p.keys.KeyA!.presses).toBe(60);
    expect(p.keys.KeyA!.recent).toHaveLength(RECENT_WINDOW);
  });

  it('caps stored sessions but keeps daily totals', () => {
    let p = defaultProgress();
    for (let i = 0; i < MAX_SESSIONS + 5; i++) p = record(p, 'a', 'a');
    expect(p.sessions).toHaveLength(MAX_SESSIONS);
    expect(p.daily[localDay(new Date(2026, 10, 24, 10).getTime())]!.minutes).toBeCloseTo(MAX_SESSIONS + 5);
  });

  it('tracks calm and pressure speed separately per day', () => {
    const p = record(record(defaultProgress(), 'a', 'a', 'calm'), 'a', 'a', 'pressure');
    const day = p.daily['2026-11-24']!;
    expect(day.wpmCalm).toBeDefined();
    expect(day.wpmPressure).toBeDefined();
  });
});

describe('weakestKeys', () => {
  it('ranks keys by recent error rate and ignores rarely typed keys', () => {
    let p = defaultProgress();
    // "f" always right; in every other session the cursor gets stuck on "j" and all later keys are misses on it.
    for (let i = 0; i < 6; i++) p = record(p, 'fj fj', i % 2 ? 'fj fj' : 'fx fx');
    p = record(p, 'q', 'w'); // q: 1 press only
    expect(weakestKeys(p)[0]).toBe('KeyJ');
    expect(weakestKeys(p)).not.toContain('KeyQ');
  });
});
