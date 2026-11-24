import { describe, expect, it } from 'vitest';
import { enCommonWords } from '../../content/words/en-common';
import { findLesson, LESSONS } from '../../content/curriculum';
import { indexLayout } from '../layout/keys';
import { usQwerty } from '../layout/us-qwerty';
import { emptyKeyStat } from '../stats/aggregate';
import { defaultProgress } from '../store/schema';
import { seededRng } from '../textgen/generate';
import { TypingSession } from '../typing/engine';
import { describeReach, HOME_KEY } from './fingers';
import { applyGuidance, guidanceFor, nextGuidance } from './guidance';
import { drillText, type Lesson } from './lessons';
import { combineRuns, lessonOutcome, nextLesson, recommend, recordLesson, type StepRun } from './results';

const layout = indexLayout(usQwerty);

/** Types `text` into a session: `wrong` maps an index to a wrong key pressed first. 150 ms per key. */
function typeRun(text: string, wrong: Record<number, string> = {}, t0 = 1000): StepRun {
  const s = new TypingSession(text, 'stop');
  let t = t0;
  for (let i = 0; i < text.length; i++) {
    if (wrong[i]) s.input({ key: wrong[i]!, t: (t += 150) });
    s.input({ key: text[i]!, t: (t += 150) });
  }
  return { target: text, events: s.events, correctChars: s.correctChars };
}

describe('curriculum', () => {
  it('has unique ids and only typable, allowed characters in its key lists', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LESSONS) {
      for (const c of l.allowed) expect(layout.byChar.has(c), `${l.id} ${c}`).toBe(true);
      for (const c of l.newKeys + (l.focus ?? '')) expect(l.allowed, `${l.id} ${c}`).toContain(c);
      expect(l.steps.length).toBeGreaterThan(0);
    }
  });

  it('every generated text uses only the lesson’s allowed keys, across many seeds', () => {
    for (const l of LESSONS) {
      const allowed = new Set(l.allowed + ' ');
      for (let seed = 1; seed <= 40; seed++) {
        for (const step of l.steps) {
          if (step.kind !== 'drill') continue;
          const text = drillText(step, l, { rng: seededRng(seed), words: enCommonWords });
          expect(text.trim().length, `${l.id} ${step.style}`).toBeGreaterThan(0);
          const bad = [...text].filter((c) => !allowed.has(c));
          expect(bad, `${l.id} ${step.style} seed ${seed}: "${text}"`).toEqual([]);
          expect(text).not.toMatch(/ {2}|^ | $/);
        }
      }
    }
  });

  it('every demo and find step only shows keys the layout can type', () => {
    for (const l of LESSONS)
      for (const s of l.steps)
        if (s.kind === 'demo' || s.kind === 'find')
          for (const c of s.keys) expect(layout.byChar.has(c), `${l.id} ${c}`).toBe(true);
  });

  it('focuses drills on the new keys', () => {
    const l = findLesson('u2.l2')!; // R and U
    const text = drillText({ kind: 'drill', style: 'words', count: 200 }, l, {
      rng: seededRng(7),
      words: enCommonWords,
    });
    const withFocus = text.split(' ').filter((w) => /[ru]/.test(w)).length;
    expect(withFocus / 200).toBeGreaterThan(0.6);
  });

  it('a focus override steers the text (repeat with focus on U)', () => {
    const l = findLesson('u2.l2')!;
    const text = drillText({ kind: 'drill', style: 'single' }, l, {
      rng: seededRng(3),
      words: enCommonWords,
      focus: 'u',
    });
    expect(text).toMatch(/^uuu uuu /);
    expect(text).not.toContain('r');
  });

  it('pairs capitals with their lower-case letter in single-key drills', () => {
    const l = findLesson('u4.l1')!;
    const text = drillText({ kind: 'drill', style: 'single' }, l, {
      rng: seededRng(1),
      words: enCommonWords,
    });
    expect(text.startsWith('Jj Hh')).toBe(true);
  });
});

describe('fingers', () => {
  it('home keys belong to their finger', () => {
    for (const [finger, code] of Object.entries(HOME_KEY)) {
      if (code !== 'Space') expect(layout.byCode.get(code)!.finger).toBe(finger);
    }
  });

  it('describes reaches in plain words', () => {
    expect(describeReach('KeyF', layout)).toBe(
      'Left index finger. This is its home key: feel for the small bump.',
    );
    expect(describeReach('KeyR', layout)).toContain('Reach up from F to the top row');
    expect(describeReach('KeyG', layout)).toContain('Reach in toward the middle from F');
    expect(describeReach('KeyN', layout)).toContain(
      'Right index finger. Reach down and in toward the middle from J',
    );
    expect(describeReach('Semicolon', layout)).toContain('Right pinky. This is its home key');
  });
});

describe('guidance levels (PLAN §5.4)', () => {
  const ok = (n: number) => new Array<number>(n).fill(1);
  it('fades one level at a time as accuracy holds', () => {
    expect(nextGuidance(3, ok(29))).toBe(3);
    expect(nextGuidance(3, ok(30))).toBe(2);
    expect(nextGuidance(2, ok(49))).toBe(2);
    expect(nextGuidance(2, ok(50))).toBe(1);
    expect(nextGuidance(1, [...ok(48), 0, 1])).toBe(0); // 98%
    expect(nextGuidance(1, [...ok(47), 0, 0, 1])).toBe(1); // 96% < 97%
  });

  it('gives help back when accuracy drops below 90%', () => {
    const shaky = [...ok(40), ...new Array<number>(4).fill(0), ...ok(6)];
    expect(nextGuidance(0, shaky)).toBe(1);
    expect(nextGuidance(2, shaky)).toBe(3);
    expect(nextGuidance(3, shaky)).toBe(3);
  });

  it('applies to the given keys and respects the Settings override', () => {
    const p = defaultProgress(0);
    p.keys.KeyF = { ...emptyKeyStat(), recent: ok(30) };
    const next = applyGuidance(p, ['KeyF']);
    expect(next.keys.KeyF!.guidance).toBe(2);
    expect(p.keys.KeyF.guidance).toBe(3); // not mutated
    expect(guidanceFor(next, 'KeyF', 'auto')).toBe(2);
    expect(guidanceFor(next, 'KeyQ', 'auto')).toBe(3); // never typed: full help
    expect(guidanceFor(next, 'KeyF', 0)).toBe(0);
  });
});

describe('lesson results', () => {
  const lesson = findLesson('u2.l2')!; // R and U

  it('joins steps into one run with valid indices and active time only', () => {
    const a = typeRun('ru ur');
    const b = typeRun('rug', {}, 60_000); // a long break between steps is not counted
    const run = combineRuns([a, b]);
    expect(run.target).toBe('ru ur rug');
    expect(run.events.map((e) => e.index)).toEqual([0, 1, 2, 3, 4, 6, 7, 8]);
    expect(run.events[5]!.intervalMs).toBeNull();
    expect(run.durationMs).toBe(150 * 6);
    expect(run.correctChars).toBe(8);
  });

  it('reports per-key accuracy, the slowest pair and mastery', () => {
    const run = combineRuns([typeRun('ru ru ru ru ru', { 0: 'e', 3: 'e' })]);
    const out = lessonOutcome(lesson, run);
    expect(out.keys).toEqual([
      { char: 'r', presses: 7, accuracy: 5 / 7 },
      { char: 'u', presses: 5, accuracy: 1 },
    ]);
    expect(out.mastered).toBe(false);
    expect(out.slowestPair?.pair).toBe('ru');
    const clean = lessonOutcome(lesson, combineRuns([typeRun('ru ur ru ur')]));
    expect(clean.mastered).toBe(true);
  });

  it('records one learning session, updates guidance and the lesson record', () => {
    const run = combineRuns([typeRun('ru ur ru ur'), typeRun('rug urn')]);
    const outcome = lessonOutcome(lesson, run);
    const p = recordLesson(defaultProgress(0), lesson, { run, outcome }, layout, 5, 'id1');
    expect(p.sessions).toHaveLength(1);
    expect(p.sessions[0]).toMatchObject({ mode: 'learning', ref: 'u2.l2', id: 'id1' });
    expect(p.lessons['u2.l2']).toEqual({ completed: true, mastered: true, best: 1, plays: 1 });
    expect(p.keys.KeyR!.presses).toBe(6);
    const again = recordLesson(
      p,
      lesson,
      { run, outcome: { ...outcome, mastered: false } },
      layout,
      6,
      'id2',
    );
    expect(again.lessons['u2.l2']).toMatchObject({ mastered: true, plays: 2 }); // mastery is kept
  });

  it('orientation lessons are completed without recording any stats', () => {
    const p = recordLesson(defaultProgress(0), findLesson('u0.l2')!, null, layout);
    expect(p.sessions).toHaveLength(0);
    expect(p.lessons['u0.l2']!.completed).toBe(true);
  });

  it('next lesson is the first course lesson not completed; nothing is locked', () => {
    const p = defaultProgress(0);
    expect(nextLesson(p, LESSONS)!.id).toBe('u0.l1');
    p.lessons['u0.l1'] = { completed: true, mastered: false, best: 0, plays: 1 };
    p.lessons['u1.l3'] = { completed: true, mastered: false, best: 0, plays: 1 }; // skipped ahead: fine
    expect(nextLesson(p, LESSONS)!.id).toBe('u0.l2');
  });
});

describe('recommendations (PLAN §4.5)', () => {
  const lesson = findLesson('u2.l2')!;
  const outcomeOf = (text: string, wrong: Record<number, string> = {}) =>
    lessonOutcome(lesson, combineRuns([typeRun(text, wrong)]));

  it('a weak new key → repeat with focus on it first', () => {
    const out = outcomeOf('ru ru ru ru ru ru', { 4: 'e', 7: 'e', 10: 'y' }); // U: 3 misses on 6 presses
    const recs = recommend(lesson, out, defaultProgress(0), LESSONS, layout);
    expect(recs[0]).toMatchObject({ kind: 'repeat', focus: 'u', label: 'Repeat with focus on U' });
    expect(recs.some((r) => r.kind === 'next' && r.lessonId === 'u2.l3')).toBe(true);
  });

  it('a mastered lesson → continue first', () => {
    const recs = recommend(lesson, outcomeOf('ru ur ru ur'), defaultProgress(0), LESSONS, layout);
    expect(recs[0]).toMatchObject({ kind: 'next', lessonId: 'u2.l3' });
    expect(recs.at(-1)!.kind).toBe('practice');
  });

  it('a key weak over its last presses → that finger’s gym drill', () => {
    const p = defaultProgress(0);
    p.keys.KeyE = {
      ...emptyKeyStat(),
      presses: 30,
      recent: [...new Array(20).fill(1), ...new Array(10).fill(0)],
    };
    const out = { ...outcomeOf('ru ur ru ur'), mastered: false };
    const recs = recommend(lesson, out, p, LESSONS, layout);
    expect(recs.find((r) => r.kind === 'gym')).toMatchObject({ lessonId: 'gym.l3' });
  });

  it('orientation → just the next lesson', () => {
    const recs = recommend(findLesson('u0.l1')!, null, defaultProgress(0), LESSONS, layout);
    expect(recs).toEqual([expect.objectContaining({ kind: 'next', lessonId: 'u0.l2' })]);
  });

  it('the last lesson of a unit points at the next unit, and gym drills lead on', () => {
    const last = LESSONS.filter((l: Lesson) => l.group === 'course').at(-1)!;
    expect(recommend(last, null, defaultProgress(0), LESSONS, layout)).toEqual([]);
    const gym = recommend(findLesson('gym.l5')!, null, defaultProgress(0), LESSONS, layout);
    expect(gym[0]).toMatchObject({ lessonId: 'gym.l4' });
  });
});

describe('wide-focus summaries', () => {
  it('list only the weakest few keys, and repeat-with-focus targets at most two', () => {
    const lesson = findLesson('u5.l1')!; // focus: the whole alphabet
    const text = Array(3).fill('the quick brown fox jumps over the lazy dog the lazy fox').join(' ');
    const misses: Record<number, string> = {};
    [...text].forEach((c, i) => {
      if ('xyz'.includes(c)) misses[i] = ';';
    });
    const out = lessonOutcome(lesson, combineRuns([typeRun(text, misses)]));
    expect(out.keys.length).toBeLessThanOrEqual(6);
    expect(
      out.keys
        .slice(0, 3)
        .map((k) => k.char)
        .sort(),
    ).toEqual(['x', 'y', 'z']);
    const recs = recommend(lesson, out, defaultProgress(0), LESSONS, layout);
    expect(recs[0]!.kind).toBe('repeat');
    expect((recs[0] as { focus?: string }).focus!.length).toBeLessThanOrEqual(2);
  });
});
