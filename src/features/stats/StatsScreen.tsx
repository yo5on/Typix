import { useState } from 'preact/hooks';
import { navigate } from '../../app/router';
import { openLesson, progress } from '../../app/state';
import { LESSONS } from '../../content/curriculum';
import { fingerName } from '../../core/learning/fingers';
import { overviewRecommendations, type Recommendation } from '../../core/learning/results';
import { indexLayout } from '../../core/layout/keys';
import { usQwerty } from '../../core/layout/us-qwerty';
import {
  daysSinceLastSession,
  fightRecord,
  fingerStats,
  shiftStats,
  isPressure,
  recentHeat,
  sessionsInRange,
  summarize,
  wpmByDay,
  type ModeSummary,
  type StatsRange,
} from '../../core/stats/dashboard';
import { Segmented } from '../../ui/components/controls';
import { Icon } from '../../ui/components/Icon';
import { LineChart } from '../../ui/components/LineChart';
import { Screen } from '../../ui/components/Screen';
import { fingerVar, Keyboard } from '../../ui/keyboard/Keyboard';
import s from './stats.module.css';

const layout = indexLayout(usQwerty);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const RANGE_LABEL: Record<StatsRange, string> = {
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  all: 'all time',
};

/** One dashboard for every mode (PLAN §2.5, §3.8). Ranged numbers come from session summaries; keys and fingers are lifetime. */
export function StatsScreen() {
  const [range, setRange] = useState<StatsRange>('7d');
  const p = progress.value;
  const now = Date.now();
  const inRange = sessionsInRange(p.sessions, range, now);
  const calm = inRange.filter((x) => !isPressure(x));
  const pressure = inRange.filter(isPressure);
  const days = wpmByDay(calm);
  const fingers = fingerStats(p, layout);
  const course = LESSONS.filter((l) => l.group === 'course');
  const done = course.filter((l) => p.lessons[l.id]?.completed).length;
  const mastered = course.filter((l) => p.lessons[l.id]?.mastered).length;
  const fights = fightRecord(p);
  const recs = overviewRecommendations(p, LESSONS, layout, daysSinceLastSession(p, now));

  const open = (r: Recommendation) => (r.kind === 'practice' ? navigate('practice') : openLesson(r.lessonId));

  return (
    <Screen
      title="Stats & Progress"
      onBack={() => navigate('menu')}
      aside={
        <div class={s.range}>
          <span id="range-label" class="visually-hidden">
            Time range
          </span>
          <Segmented
            id="range"
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
      }
    >
      <div class={s.grid}>
        <section class={s.panel} aria-labelledby="speed-h">
          <h2 id="speed-h" class={s.title}>
            Speed, {RANGE_LABEL[range]}
          </h2>
          <ModeTile name="Calm" hint="Learning and Practice" sum={summarize(calm)} />
          <ModeTile name="Under pressure" hint="Fight" sum={summarize(pressure)} empty="No fights yet." />
        </section>

        <section class={s.panel} aria-labelledby="trend-h">
          <h2 id="trend-h" class={s.title}>
            Calm WPM by day
          </h2>
          {days.length < 2 ? (
            <p class={s.muted}>Practise on two different days to see a trend.</p>
          ) : (
            <LineChart
              values={days.map((d) => Math.round(d.wpm))}
              unit="WPM"
              caption={`${days.length} days`}
              label={`Calm words per minute over ${days.length} days, from ${Math.round(days[0]!.wpm)} on ${days[0]!.day} to ${Math.round(days.at(-1)!.wpm)} on ${days.at(-1)!.day}.`}
            />
          )}
        </section>

        <section class={`${s.panel} ${s.wide}`} aria-labelledby="keys-h">
          <h2 id="keys-h" class={s.title}>
            Key mastery <span class={s.note}>last 50 presses per key</span>
          </h2>
          <div class={s.keys}>
            <div class={s.keyboardWrap}>
              <Keyboard
                layout={usQwerty}
                unit={34}
                heat={recentHeat(p)}
                label="Keyboard shaded by each key’s error rate over its last 50 presses. Keys show their error percentage."
              />
            </div>
            <table class={s.fingers}>
              <caption class={s.note}>Fingers, all time</caption>
              <thead>
                <tr>
                  <th scope="col">Finger</th>
                  <th scope="col">Accuracy</th>
                  <th scope="col">Speed</th>
                </tr>
              </thead>
              <tbody>
                {fingers.map((f) => (
                  <tr key={f.finger}>
                    <th scope="row">
                      <span class={s.dot} style={{ background: fingerVar(f.finger) }} />
                      {f.finger} <span class={s.muted}>{fingerName(f.finger)}</span>
                    </th>
                    {f.presses ? (
                      <>
                        <td class="num">
                          <span class={s.bar} style={{ '--v': f.accuracy }} />
                          {pct(f.accuracy)}
                        </td>
                        <td class="num">{f.meanMs ? `${Math.round(f.meanMs)} ms` : '–'}</td>
                      </>
                    ) : (
                      <td colSpan={2} class={s.muted}>
                        Not typed yet
                      </td>
                    )}
                  </tr>
                ))}
                {shiftStats(p).map((k) => (
                  <tr key={k.code}>
                    <th scope="row">{k.label}</th>
                    {k.accuracy !== null ? (
                      <td class="num" colSpan={2}>
                        <span class={s.bar} style={{ '--v': k.accuracy }} />
                        {pct(k.accuracy)} <span class={s.muted}>last capitals, opposite hand</span>
                      </td>
                    ) : (
                      <td colSpan={2} class={s.muted}>
                        No capitals yet
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section class={s.panel} aria-labelledby="course-h">
          <h2 id="course-h" class={s.title}>
            Progress
          </h2>
          <dl class={s.facts}>
            <dt>Course</dt>
            <dd>
              <progress
                max={course.length}
                value={done}
                class={s.progress}
                aria-label="Course lessons completed"
              />
              <span class="num">
                {done} / {course.length} lessons · {mastered} mastered
              </span>
            </dd>
            <dt>Fights</dt>
            <dd class="num">
              {fights.wins + fights.losses ? `${fights.wins} won · ${fights.losses} lost` : 'No fights yet'}
            </dd>
          </dl>
        </section>

        <section class={s.panel} aria-labelledby="recs-h">
          <h2 id="recs-h" class={s.title}>
            Recommended
          </h2>
          <ul class={s.recs}>
            {recs.map((r, i) => (
              <li key={i}>
                <button type="button" class={s.rec} onClick={() => open(r)}>
                  <span>
                    <span class={s.recLabel}>{r.label}</span>
                    <span class={s.muted}>{r.detail}</span>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              </li>
            ))}
            {recs.length === 0 && <li class={s.muted}>Nothing to suggest. Everything looks solid.</li>}
          </ul>
        </section>
      </div>
    </Screen>
  );
}

function ModeTile({
  name,
  hint,
  sum,
  empty,
}: {
  name: string;
  hint: string;
  sum: ModeSummary | null;
  empty?: string;
}) {
  return (
    <div class={s.tile}>
      <p class={s.tileName}>
        {name} <span class={s.muted}>{hint}</span>
      </p>
      {sum ? (
        <dl class={s.tileStats}>
          <div>
            <dt>WPM</dt>
            <dd class="num">{Math.round(sum.wpm)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd class="num">{pct(sum.accuracy)}</dd>
          </div>
          <div>
            <dt>Best</dt>
            <dd class="num">{Math.round(sum.bestWpm)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd class="num">{Math.round(sum.minutes)} min</dd>
          </div>
        </dl>
      ) : (
        <p class={s.muted}>{empty ?? 'No sessions in this range.'}</p>
      )}
    </div>
  );
}
