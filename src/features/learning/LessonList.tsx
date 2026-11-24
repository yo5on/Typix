import { progress } from '../../app/state';
import { CODE_TRACKS, GYM, LESSONS, UNITS } from '../../content/curriculum';
import { lessonLabel, type Lesson, type Unit } from '../../core/learning/lessons';
import { nextLesson } from '../../core/learning/results';
import { Icon } from '../../ui/components/Icon';
import { fingerVar } from '../../ui/keyboard/Keyboard';
import { useFocusOnMount } from './shared';
import s from './learning.module.css';

const keysOf = (l: Lesson) =>
  [...(l.newKeys || l.focus || '')].map((c) => c.toUpperCase()).filter((c, i, a) => a.indexOf(c) === i);

/** Every lesson, always playable. The recommended one is marked, nothing is locked. */
export function LessonList({ onStart }: { onStart: (l: Lesson) => void }) {
  useFocusOnMount();
  const p = progress.value;
  const next = nextLesson(p, LESSONS);
  const done = LESSONS.filter((l) => l.group === 'course' && p.lessons[l.id]?.completed).length;
  const total = LESSONS.filter((l) => l.group === 'course').length;

  return (
    <div class={s.list}>
      {next ? (
        <button type="button" class={s.continue} onClick={() => onStart(next)} data-autofocus>
          <span class={s.eyebrow}>{done === 0 ? 'Start here' : 'Recommended next'}</span>
          <span class={s.continueTitle}>{lessonLabel(next)}</span>
          <span class={s.continueDetail}>{next.blurb}</span>
          <span class={s.continueAction}>
            Enter <Icon name="chevron" size={16} />
          </span>
        </button>
      ) : (
        <p class={s.allDone} data-autofocus tabIndex={-1}>
          You have completed the whole course. Replay any lesson, or keep your fingers sharp in the Finger
          Gym.
        </p>
      )}
      <p class={`${s.progressLine} num`}>
        {done} of {total} lessons completed · every lesson is open, skip ahead whenever you like
      </p>

      {[...UNITS, ...CODE_TRACKS, GYM].map((u) => (
        <UnitSection key={u.id} unit={u} next={next} onStart={onStart} />
      ))}
    </div>
  );
}

function UnitSection({
  unit,
  next,
  onStart,
}: {
  unit: Unit;
  next: Lesson | null;
  onStart: (l: Lesson) => void;
}) {
  const p = progress.value;
  const group = unit.lessons[0]?.group;
  const gym = group === 'gym';
  return (
    <section class={s.unit} aria-labelledby={`unit-${unit.id}`}>
      <header class={s.unitHead}>
        <h2 id={`unit-${unit.id}`} class={s.unitTitle}>
          {gym ? unit.title : group === 'code' ? `Code · ${unit.title}` : `Unit ${unit.id} · ${unit.title}`}
        </h2>
        <p class={s.unitBlurb}>{unit.blurb}</p>
      </header>
      <ul class={s.cards}>
        {unit.lessons.map((l) => {
          const rec = p.lessons[l.id];
          const finger = gym && /^gym\.[lr]\d$/.test(l.id) ? l.id.slice(4).toUpperCase() : null;
          const status = rec?.mastered
            ? 'Mastered'
            : rec?.completed
              ? 'Completed'
              : l === next
                ? 'Recommended'
                : '';
          return (
            <li key={l.id}>
              <button
                type="button"
                class={`${s.card} ${l === next ? s.cardNext : ''}`}
                style={finger ? { '--finger': fingerVar(finger) } : undefined}
                data-finger={finger ? true : undefined}
                onClick={() => onStart(l)}
                aria-label={`${lessonLabel(l)}. ${l.blurb}${status ? `. ${status}` : ''}`}
              >
                <span class={`${s.cardNum} num`}>
                  {gym ? '' : group === 'code' ? l.index : `${l.unit}.${l.index}`}
                </span>
                <span class={s.cardTitle}>{l.title}</span>
                <span class={s.cardKeys}>
                  {keysOf(l).length > 0 && keysOf(l).length <= 6
                    ? keysOf(l).map((k) => (
                        <span class={s.miniCap} key={k}>
                          {k}
                        </span>
                      ))
                    : l.blurb}
                </span>
                {status && (
                  <span
                    class={`${s.status} ${rec?.mastered ? s.statusMastered : rec?.completed ? s.statusDone : s.statusNext}`}
                  >
                    {rec?.completed && <Icon name="check" size={14} />}
                    {status}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
