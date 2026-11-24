import { lessonLabel, type Lesson } from '../../core/learning/lessons';
import { MASTERY, type LessonOutcome, type Recommendation } from '../../core/learning/results';
import { Button } from '../../ui/components/controls';
import { charName, useFocusOnMount, useStepKeys } from './shared';
import s from './learning.module.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Summary({
  lesson,
  outcome,
  recs,
  onPick,
  onList,
}: {
  lesson: Lesson;
  outcome: LessonOutcome | null;
  recs: Recommendation[];
  onPick: (r: Recommendation) => void;
  onList: () => void;
}) {
  useStepKeys({ escape: onList });
  useFocusOnMount();
  const m = outcome?.metrics;
  const [first, ...rest] = recs;

  return (
    <div class={s.summary}>
      <header class={s.summaryHead} aria-live="polite">
        <p class={s.eyebrow}>{lessonLabel(lesson)}</p>
        <h2 class={s.summaryTitle}>{outcome?.mastered ? 'Lesson mastered' : 'Lesson complete'}</h2>
      </header>

      {m && outcome && (
        <>
          <dl class={s.stats}>
            <div>
              <dt>Accuracy</dt>
              <dd class="num">{pct(m.accuracy)}</dd>
            </div>
            <div>
              <dt>Steadiness</dt>
              <dd class="num">{pct(m.consistency)}</dd>
            </div>
            <div>
              <dt>Speed (not scored)</dt>
              <dd class="num">{Math.round(m.wpm)} WPM</dd>
            </div>
          </dl>
          <p class={s.masteryNote}>
            {outcome.mastered
              ? 'Mastered: accurate and steady. Well done.'
              : `Mastered means ${pct(MASTERY.accuracy)} accuracy and ${pct(MASTERY.steadiness)} steadiness. Steadiness is an even rhythm between keys; it grows with practice.`}
          </p>

          {outcome.keys.length > 0 && (
            <section class={s.keyBars} aria-label="Accuracy for this lesson's keys">
              {outcome.keys.map((k) => (
                <div class={s.keyBar} key={k.char}>
                  <span class={s.keyBarLabel}>{charName(k.char)}</span>
                  <span class={s.bar}>
                    <span style={{ width: pct(k.accuracy) }} class={k.accuracy < 0.9 ? s.barWeak : ''} />
                  </span>
                  <span class={`${s.keyBarValue} num`}>{pct(k.accuracy)}</span>
                </div>
              ))}
            </section>
          )}
          {outcome.slowestPair && outcome.slowestPair.ms > outcome.slowestPair.averageMs * 1.2 && (
            <p class={s.masteryNote}>
              Slowest pair: “{outcome.slowestPair.pair}”, {Math.round(outcome.slowestPair.ms)} ms (your
              average is {Math.round(outcome.slowestPair.averageMs)} ms).
            </p>
          )}
        </>
      )}
      {!m && (
        <p class={s.masteryNote}>Orientation lessons are not scored. You are ready for the next step.</p>
      )}

      <section class={s.recs} aria-label="Recommended next">
        <h3 class={s.recsTitle}>Recommended next</h3>
        {first && (
          <button
            type="button"
            class={`${s.rec} ${s.recPrimary}`}
            onClick={() => onPick(first)}
            data-autofocus
          >
            <span class={s.recLabel}>{first.label}</span>
            <span class={s.recDetail}>{first.detail}</span>
            <kbd>Enter</kbd>
          </button>
        )}
        {rest.map((r) => (
          <button type="button" class={s.rec} key={r.label} onClick={() => onPick(r)}>
            <span class={s.recLabel}>{r.label}</span>
            <span class={s.recDetail}>{r.detail}</span>
          </button>
        ))}
        <div class={s.actions}>
          <Button variant="ghost" onClick={onList}>
            All lessons
          </Button>
        </div>
      </section>
    </div>
  );
}
