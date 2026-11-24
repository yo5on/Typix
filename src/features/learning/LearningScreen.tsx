import { useState } from 'preact/hooks';
import { navigate } from '../../app/router';
import { pendingLesson, progress } from '../../app/state';
import { findLesson, LESSONS } from '../../content/curriculum';
import { lessonLabel, type Lesson } from '../../core/learning/lessons';
import {
  combineRuns,
  lessonOutcome,
  recommend,
  recordLesson,
  type LessonOutcome,
  type Recommendation,
  type StepRun,
} from '../../core/learning/results';
import { Screen } from '../../ui/components/Screen';
import { PLACEMENT_ID } from '../../core/learning/placement';
import { LessonList } from './LessonList';
import { Placement } from './Placement';
import { Step } from './Steps';
import { Summary } from './Summary';
import { layout } from './shared';
import s from './learning.module.css';

type Phase =
  | { name: 'list' }
  | { name: 'placement' }
  | { name: 'lesson'; lesson: Lesson; focus?: string; run: number }
  | {
      name: 'summary';
      lesson: Lesson;
      outcome: LessonOutcome | null;
      recs: Recommendation[];
      focus?: string;
    };

/** Learning Mode: a calm, guided course. No timers, no fail states, no locks. */
export function LearningScreen() {
  const [phase, setPhase] = useState<Phase>(() => {
    // Opened from a recommendation, the Continue card or onboarding: go straight into that lesson.
    const want = pendingLesson.peek();
    pendingLesson.value = null;
    if (want?.id === PLACEMENT_ID) return { name: 'placement' };
    const lesson = want ? findLesson(want.id) : undefined;
    return want && lesson ? { name: 'lesson', lesson, focus: want.focus, run: Date.now() } : { name: 'list' };
  });

  const start = (lesson: Lesson, focus?: string) =>
    setPhase({ name: 'lesson', lesson, focus, run: Date.now() });

  function finish(lesson: Lesson, runs: StepRun[], focus?: string) {
    let outcome: LessonOutcome | null = null;
    if (lesson.scored && runs.length) {
      const run = combineRuns(runs);
      outcome = lessonOutcome(lesson, run, focus);
      progress.value = recordLesson(progress.value, lesson, { run, outcome }, layout);
    } else {
      progress.value = recordLesson(progress.value, lesson, null, layout);
    }
    const recs = recommend(lesson, outcome, progress.value, LESSONS, layout);
    setPhase({ name: 'summary', lesson, outcome, recs, focus });
  }

  function pick(r: Recommendation) {
    if (r.kind === 'practice') return navigate('practice');
    const l = findLesson(r.lessonId);
    if (l) start(l, r.kind === 'repeat' ? r.focus : undefined);
  }

  const toList = () => setPhase({ name: 'list' });
  const title =
    phase.name === 'list'
      ? 'Learn Typing'
      : phase.name === 'placement'
        ? 'Placement test'
        : lessonLabel(phase.lesson);

  return (
    <Screen title={title} onBack={() => (phase.name === 'list' ? navigate('menu') : toList())}>
      {phase.name === 'list' && (
        <LessonList onStart={(l) => start(l)} onPlacement={() => setPhase({ name: 'placement' })} />
      )}
      {phase.name === 'placement' && <Placement onStart={(l) => start(l)} onList={toList} />}
      {phase.name === 'lesson' && (
        <LessonRunner
          key={phase.run}
          lesson={phase.lesson}
          focus={phase.focus}
          onExit={toList}
          onDone={(runs) => finish(phase.lesson, runs, phase.focus)}
        />
      )}
      {phase.name === 'summary' && (
        <Summary
          lesson={phase.lesson}
          outcome={phase.outcome}
          recs={phase.recs}
          onPick={pick}
          onList={toList}
        />
      )}
    </Screen>
  );
}

function LessonRunner({
  lesson,
  focus,
  onDone,
  onExit,
}: {
  lesson: Lesson;
  focus?: string;
  onDone: (runs: StepRun[]) => void;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [runs] = useState<StepRun[]>([]);
  const step = lesson.steps[i]!;

  function next(run?: StepRun) {
    if (run) runs.push(run);
    if (i + 1 < lesson.steps.length) setI(i + 1);
    else onDone(runs);
  }

  return (
    <div class={s.runner}>
      <div class={s.progress} aria-label={`Step ${i + 1} of ${lesson.steps.length}`} role="img">
        {lesson.steps.map((_, j) => (
          <span key={j} class={`${s.dot} ${j < i ? s.dotDone : j === i ? s.dotNow : ''}`} />
        ))}
        <span class={`${s.progressText} num`}>
          Step {i + 1} of {lesson.steps.length}
          {focus ? ` · focus on ${[...focus].map((c) => c.toUpperCase()).join(' ')}` : ''}
        </span>
      </div>
      <Step
        key={`${i}-${attempt}`}
        spec={step}
        lesson={lesson}
        focus={focus}
        onDone={next}
        onExit={onExit}
        onRestart={() => setAttempt((n) => n + 1)}
      />
    </div>
  );
}
