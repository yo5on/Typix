import type { Progress } from '../store/schema';
import type { Metrics } from '../typing/metrics';
import type { DrillSpec, Lesson } from './lessons';

/**
 * "I can type, place me" (PLAN §4.1): short typed stages, easiest first. Passing a stage marks its units
 * completed; the test stops at the first stage you don't pass. Completed only, never mastered.
 */
export interface PlacementStage {
  title: string;
  /** Units this stage places you past. */
  units: number[];
  /** The lesson whose keys the text uses. */
  lessonId: string;
  spec: DrillSpec;
}

/** Pass mark for a stage *(tune)*: accurate, and fast enough that the keys are clearly known. */
export const PLACEMENT_PASS = { accuracy: 0.93, wpm: 25 };

const drill = (style: DrillSpec['style'], count: number): DrillSpec => ({ kind: 'drill', style, count });

export const PLACEMENT: PlacementStage[] = [
  { title: 'Home row', units: [0, 1], lessonId: 'u1.l6', spec: drill('words', 8) },
  { title: 'Top row', units: [2], lessonId: 'u2.l6', spec: drill('words', 8) },
  { title: 'Bottom row', units: [3], lessonId: 'u3.l6', spec: drill('words', 8) },
  { title: 'Capitals and sentences', units: [4, 5], lessonId: 'u5.l4', spec: drill('sentences', 2) },
  { title: 'Punctuation', units: [6], lessonId: 'u6.l5', spec: drill('mixed', 8) },
  { title: 'Numbers', units: [7], lessonId: 'u7.l5', spec: drill('mixed', 8) },
  { title: 'Symbols', units: [8], lessonId: 'u8.l6', spec: drill('mixed', 8) },
];

export const passed = (m: Pick<Metrics, 'accuracy' | 'wpm'>) =>
  m.accuracy >= PLACEMENT_PASS.accuracy && m.wpm >= PLACEMENT_PASS.wpm;

/** Marks every course lesson in `units` completed, keeping any existing record. Never mutates the input. */
export function applyPlacement(progress: Progress, units: number[], lessons: readonly Lesson[]): Progress {
  const out = { ...progress.lessons };
  for (const l of lessons)
    if (l.group === 'course' && units.includes(l.unit) && !out[l.id]?.completed)
      out[l.id] = { mastered: false, best: 0, plays: 0, ...out[l.id], completed: true };
  return { ...progress, lessons: out };
}
/** Passed to `openLesson` to start the placement test instead of a lesson. */
export const PLACEMENT_ID = 'placement';
