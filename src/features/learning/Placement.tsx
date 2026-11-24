import { useState } from 'preact/hooks';
import { progress } from '../../app/state';
import { findLesson, LESSONS } from '../../content/curriculum';
import { lessonLabel, type Lesson } from '../../core/learning/lessons';
import { applyPlacement, passed, PLACEMENT, PLACEMENT_PASS } from '../../core/learning/placement';
import { combineRuns, nextLesson, type StepRun } from '../../core/learning/results';
import { computeMetrics, type Metrics } from '../../core/typing/metrics';
import { Button } from '../../ui/components/controls';
import { Step } from './Steps';
import { useFocusOnMount, useStepKeys } from './shared';
import s from './learning.module.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** "I can type, place me": short stages, easiest first, stopping at the first one below the pass mark. */
export function Placement({ onStart, onList }: { onStart: (l: Lesson) => void; onList: () => void }) {
  const [stage, setStage] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Metrics[]>([]);
  const [done, setDone] = useState(false);

  function finish(all: Metrics[]) {
    const units = PLACEMENT.slice(0, all.filter(passed).length).flatMap((st) => st.units);
    progress.value = applyPlacement(progress.value, units, LESSONS);
    setDone(true);
  }

  function next(run?: StepRun) {
    if (!run || stage === null) return;
    const r = combineRuns([run]);
    const all = [...results, computeMetrics(r.events, r.correctChars, r.durationMs)];
    setResults(all);
    if (!passed(all.at(-1)!) || stage + 1 >= PLACEMENT.length) finish(all);
    else setStage(stage + 1);
  }

  if (done) return <PlacementResult results={results} onStart={onStart} onList={onList} />;
  if (stage === null) return <PlacementIntro onBegin={() => setStage(0)} onList={onList} />;

  const st = PLACEMENT[stage]!;
  return (
    <div class={s.runner}>
      <div class={s.progress}>
        <span class={`${s.progressText} num`}>
          Placement · {st.title} · stage {stage + 1} of {PLACEMENT.length}
        </span>
      </div>
      <Step
        key={`${stage}-${attempt}`}
        spec={st.spec}
        lesson={findLesson(st.lessonId)!}
        onDone={next}
        onExit={onList}
        onRestart={() => setAttempt((n) => n + 1)}
      />
    </div>
  );
}

function PlacementIntro({ onBegin, onList }: { onBegin: () => void; onList: () => void }) {
  useStepKeys({ space: onBegin, enter: onBegin, escape: onList });
  useFocusOnMount();
  return (
    <div class={s.step}>
      <section class={s.intro}>
        <h2 class={s.introTitle}>Placement test</h2>
        <p>
          A few short passages, easiest first: home row, top row, bottom row, then capitals, punctuation,
          numbers and symbols. It takes about two minutes and stops as soon as a stage feels new.
        </p>
        <p>
          A stage counts when you type it at {pct(PLACEMENT_PASS.accuracy)} accuracy and at least{' '}
          {PLACEMENT_PASS.wpm} WPM. Those units are marked completed; you can still replay any lesson.
        </p>
        <div class={s.actions}>
          <Button variant="ghost" onClick={onList}>
            Skip
          </Button>
          <Button variant="primary" icon="chevron" onClick={onBegin} data-autofocus>
            Start
          </Button>
        </div>
      </section>
    </div>
  );
}

function PlacementResult({
  results,
  onStart,
  onList,
}: {
  results: Metrics[];
  onStart: (l: Lesson) => void;
  onList: () => void;
}) {
  useStepKeys({ escape: onList });
  useFocusOnMount();
  const placed = results.filter(passed).length;
  const units = PLACEMENT.slice(0, placed).flatMap((st) => st.units);
  const next = nextLesson(progress.value, LESSONS);
  return (
    <div class={s.summary}>
      <header class={s.summaryHead} aria-live="polite">
        <p class={s.eyebrow}>Placement test</p>
        <h2 class={s.summaryTitle}>Placement done</h2>
      </header>
      <p class={s.masteryNote}>
        {placed === 0
          ? 'The course starts from the beginning for you. Every lesson stays open if you want to skip ahead.'
          : `Units ${units[0]}–${units.at(-1)} are marked completed. You can still replay any of their lessons.`}
      </p>
      <dl class={s.stats}>
        {results.map((m, i) => (
          <div key={i}>
            <dt>
              {PLACEMENT[i]!.title} · {Math.round(m.wpm)} WPM {passed(m) ? '✓' : ''}
            </dt>
            <dd class="num">{pct(m.accuracy)}</dd>
          </div>
        ))}
      </dl>
      <section class={s.recs} aria-label="Recommended next">
        {next && (
          <button
            type="button"
            class={`${s.rec} ${s.recPrimary}`}
            onClick={() => onStart(next)}
            data-autofocus
          >
            <span class={s.recLabel}>Start {lessonLabel(next)}</span>
            <span class={s.recDetail}>{next.blurb}</span>
            <kbd>Enter</kbd>
          </button>
        )}
        <div class={s.actions}>
          <Button variant="ghost" onClick={onList}>
            All lessons
          </Button>
        </div>
      </section>
    </div>
  );
}
