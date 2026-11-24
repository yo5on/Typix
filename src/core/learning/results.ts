import type { LayoutIndex } from '../layout/keys';
import { bigramResults, keyResults, recordSession } from '../stats/aggregate';
import type { Progress } from '../store/schema';
import type { TypingEvent } from '../typing/engine';
import { computeMetrics, PAUSE_MS, type Metrics } from '../typing/metrics';
import { fingerName } from './fingers';
import { applyGuidance } from './guidance';
import { lessonFocus, lessonLabel, type Lesson } from './lessons';

/** "Mastered" (PLAN §5.3): a badge only, it never blocks anything. */
export const MASTERY = { accuracy: 0.95, steadiness: 0.7 };
/** A key below this accuracy is called out in the summary and recommendations. */
const WEAK_ACCURACY = 0.9;
/** Most keys a summary lists, and most a "repeat with focus" targets. */
const MAX_KEYS = 6;
const MAX_FOCUS = 2;

export interface StepRun {
  target: string;
  events: TypingEvent[];
  correctChars: number;
}

export interface CombinedRun extends StepRun {
  /** Active typing time: gaps longer than a pause (reading the next step, a break) are left out. */
  durationMs: number;
}

/** Joins a lesson's typing steps into one run (one saved session per lesson), keeping event indices valid. */
export function combineRuns(runs: StepRun[]): CombinedRun {
  let target = '';
  const events: TypingEvent[] = [];
  let correctChars = 0;
  let durationMs = 0;
  for (const r of runs) {
    const offset = target ? target.length + 1 : 0;
    target = target ? `${target} ${r.target}` : r.target;
    r.events.forEach((e, i) =>
      events.push({ ...e, index: e.index + offset, intervalMs: i ? e.intervalMs : null }),
    );
    correctChars += r.correctChars;
    for (const e of r.events)
      if (e.intervalMs !== null && e.intervalMs <= PAUSE_MS) durationMs += e.intervalMs;
  }
  return { target, events, correctChars, durationMs };
}

export interface KeyOutcome {
  char: string;
  accuracy: number;
  presses: number;
}

export interface LessonOutcome {
  metrics: Metrics;
  /** The lesson's focus keys, in lesson order. */
  keys: KeyOutcome[];
  slowestPair: { pair: string; ms: number; averageMs: number } | null;
  mastered: boolean;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function lessonOutcome(lesson: Lesson, run: CombinedRun, focus?: string): LessonOutcome {
  const metrics = computeMetrics(run.events, run.correctChars, run.durationMs);
  const typed = run.events.filter((e) => e.kind !== 'backspace');
  let keys = [...new Set(lessonFocus(lesson, focus))]
    .map((char) => {
      const mine = typed.filter((e) => e.expected === char);
      const ok = mine.filter((e) => e.kind === 'correct').length;
      return { char, presses: mine.length, accuracy: mine.length ? ok / mine.length : 0 };
    })
    .filter((k) => k.presses > 0);
  // Wide-focus lessons (whole alphabet): only the weakest few keys are worth showing.
  if (keys.length > MAX_KEYS) {
    keys = keys
      .filter((k) => k.presses >= 3)
      .sort((a, b) => a.accuracy - b.accuracy || b.presses - a.presses)
      .slice(0, MAX_KEYS);
  }

  const pairs = [...bigramResults(run.events, run.target)]
    .filter(([, r]) => r.latencies.length >= 2)
    .map(([pair, r]) => ({ pair, ms: mean(r.latencies) }))
    .sort((a, b) => b.ms - a.ms);
  const averageMs = mean(
    typed.filter((e) => e.intervalMs !== null && e.intervalMs <= PAUSE_MS).map((e) => e.intervalMs!),
  );
  return {
    metrics,
    keys,
    slowestPair: pairs[0] ? { ...pairs[0], averageMs } : null,
    mastered: metrics.accuracy >= MASTERY.accuracy && metrics.consistency >= MASTERY.steadiness,
  };
}

/**
 * Saves a finished lesson: one session in the shared stats (scored lessons only), updated per-key
 * guidance levels, and the lesson's completed / mastered record. Never mutates the input.
 */
export function recordLesson(
  progress: Progress,
  lesson: Lesson,
  result: { run: CombinedRun; outcome: LessonOutcome } | null,
  layout: LayoutIndex,
  at = Date.now(),
  id: string = crypto.randomUUID(),
): Progress {
  let p = progress;
  if (lesson.scored && result && result.run.events.length) {
    const { run, outcome } = result;
    p = recordSession(p, {
      id,
      at,
      mode: 'learning',
      ref: lesson.id,
      pressure: 'calm',
      target: run.target,
      events: run.events,
      metrics: outcome.metrics,
      layout,
    });
    p = applyGuidance(p, keyResults(run.events, layout).keys());
  }
  const old = p.lessons[lesson.id] ?? { completed: false, mastered: false, best: 0, plays: 0 };
  const accuracy = result?.outcome.metrics.accuracy ?? 0;
  return {
    ...p,
    lessons: {
      ...p.lessons,
      [lesson.id]: {
        completed: true,
        mastered: old.mastered || (result?.outcome.mastered ?? false),
        best: Math.max(old.best, accuracy),
        plays: old.plays + 1,
      },
    },
  };
}

/** The first course lesson not yet completed, or null when the whole course is done. Nothing is ever locked. */
export function nextLesson(progress: Progress, lessons: readonly Lesson[]): Lesson | null {
  return lessons.find((l) => l.group === 'course' && !progress.lessons[l.id]?.completed) ?? null;
}

export type Recommendation =
  | { kind: 'repeat'; lessonId: string; focus?: string; label: string; detail: string }
  | { kind: 'next' | 'gym'; lessonId: string; label: string; detail: string }
  | { kind: 'practice'; label: string; detail: string };

const legend = (c: string) => (c === ' ' ? 'Space' : c.toUpperCase());
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** What to do after a lesson, best first (PLAN §4.5). Simple rules, no hidden scoring. */
export function recommend(
  lesson: Lesson,
  outcome: LessonOutcome | null,
  progress: Progress,
  lessons: readonly Lesson[],
  layout: LayoutIndex,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const order = lessons.filter((l) => l.group === lesson.group);
  const after =
    order[order.indexOf(lesson) + 1] ?? (lesson.group === 'gym' ? nextLesson(progress, lessons) : null);
  const next: Recommendation | null = after && {
    kind: 'next',
    lessonId: after.id,
    label: `Continue to ${lessonLabel(after)}`,
    detail: after.blurb,
  };

  // A key in this lesson that is weak over its last 50 presses, in any mode → that finger's gym drill.
  const weakCodes = [...new Set([...lesson.allowed].map((c) => layout.byChar.get(c)?.code))]
    .filter((code): code is string => !!code && code !== 'Space')
    .map((code) => ({ code, k: progress.keys[code] }))
    .filter(({ k }) => k && k.recent.length >= 20 && mean(k.recent) < WEAK_ACCURACY)
    .sort((a, b) => mean(a.k!.recent) - mean(b.k!.recent));
  const weakKey = weakCodes[0] && layout.byCode.get(weakCodes[0].code);
  const gymLesson = weakKey && lessons.find((l) => l.id === `gym.${weakKey.finger.toLowerCase()}`);
  const gym: Recommendation | null =
    gymLesson && gymLesson !== lesson
      ? {
          kind: 'gym',
          lessonId: gymLesson.id,
          label: lessonLabel(gymLesson),
          detail: `${legend(weakKey.base ?? '')} is below 90% over its last presses. This drill trains your ${fingerName(weakKey.finger)}.`,
        }
      : null;

  if (!outcome) {
    if (next) recs.push(next);
    return recs;
  }

  const weakNew = outcome.keys
    .filter((k) => k.presses >= 5 && k.accuracy < WEAK_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, MAX_FOCUS);
  if (weakNew.length) {
    const chars = weakNew.map((k) => k.char).join('');
    recs.push({
      kind: 'repeat',
      lessonId: lesson.id,
      focus: chars,
      label: `Repeat with focus on ${[...chars].map(legend).join(' and ')}`,
      detail:
        weakNew.map((k) => `${legend(k.char)} ${pct(k.accuracy)}`).join(', ') +
        '. One more pass helps it stick.',
    });
  } else if (outcome.metrics.accuracy < WEAK_ACCURACY) {
    recs.push({
      kind: 'repeat',
      lessonId: lesson.id,
      label: 'Repeat this lesson',
      detail: `Accuracy ${pct(outcome.metrics.accuracy)}. Slow down a little: accuracy first, speed comes by itself.`,
    });
  }
  if (gym && !outcome.mastered) recs.push(gym);
  if (next) recs.push(next);
  if (gym && outcome.mastered) recs.push(gym);
  if (!outcome.mastered && !recs.some((r) => r.kind === 'repeat')) {
    recs.push({
      kind: 'repeat',
      lessonId: lesson.id,
      label: 'Repeat to master it',
      detail: `Mastered means ${pct(MASTERY.accuracy)} accuracy with a steady rhythm. It's a badge, never a lock.`,
    });
  }
  recs.push({
    kind: 'practice',
    label: 'Free Practice with your keys',
    detail: 'A relaxed timed test using the letters you know.',
  });
  return recs;
}
