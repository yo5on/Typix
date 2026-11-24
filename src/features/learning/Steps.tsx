import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { progress, settings } from '../../app/state';
import { enCommonWords } from '../../content/words/en-common';
import { describeReach, fingerName } from '../../core/learning/fingers';
import { guidanceFor, HESITATION_MS } from '../../core/learning/guidance';
import { drillText, type DrillSpec, type Lesson, type StepSpec } from '../../core/learning/lessons';
import type { StepRun } from '../../core/learning/results';
import { weakestKeys } from '../../core/stats/aggregate';
import { TypingSession } from '../../core/typing/engine';
import { Button } from '../../ui/components/controls';
import { TypingText } from '../../ui/typing/TypingText';
import { useTypingKeys } from '../../ui/typing/useTypingKeys';
import { charName, KeyboardWithHands, layout, unusedKeys, useStepKeys } from './shared';
import s from './learning.module.css';

export interface StepProps {
  lesson: Lesson;
  /** "Repeat with focus on U": favour these characters. */
  focus?: string;
  onDone: (run?: StepRun) => void;
  onExit: () => void;
  onRestart: () => void;
}

export function Step(props: StepProps & { spec: StepSpec }) {
  const { spec } = props;
  switch (spec.kind) {
    case 'intro':
      return <IntroStep {...props} spec={spec} />;
    case 'find':
      return <FindStep {...props} keys={spec.keys} title={spec.title} />;
    case 'demo':
      // On "repeat with focus", only demonstrate the keys being worked on.
      return (
        <DemoStep
          {...props}
          keys={[...spec.keys].filter((c) => props.focus?.includes(c)).join('') || spec.keys}
        />
      );
    case 'drill':
      return <DrillStep {...props} spec={spec} />;
  }
}

function ContinueHint({ extra }: { extra?: preact.ComponentChildren }) {
  return (
    <footer class={s.footer}>
      <span>
        <kbd>Space</kbd> continue
      </span>
      {extra}
      <span>
        <kbd>Esc</kbd> lessons
      </span>
    </footer>
  );
}

function IntroStep({ spec, onDone, onExit }: StepProps & { spec: Extract<StepSpec, { kind: 'intro' }> }) {
  useStepKeys({ space: () => onDone(), enter: () => onDone(), escape: onExit });
  return (
    <div class={s.step}>
      <section class={s.intro} aria-live="polite">
        <h2 class={s.introTitle}>{spec.title}</h2>
        {spec.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <Button variant="primary" icon="chevron" onClick={() => onDone()}>
          Continue
        </Button>
      </section>
      <KeyboardWithHands stroke={null} hint={false} mode="rest" />
      <ContinueHint />
    </div>
  );
}

/** Press each key in turn: the F/J bumps and the home position, one key at a time. */
function FindStep({ keys, title, onDone, onExit }: StepProps & { keys: string; title: string }) {
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const done = i >= keys.length;
  const target = keys[Math.min(i, keys.length - 1)]!;
  const stroke = layout.byChar.get(target)!;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onDone(), 450);
    return () => clearTimeout(t);
  }, [done]);

  useTypingKeys(!done, {
    onEscape: onExit,
    onKey(key) {
      if (key === target) {
        setWrong(null);
        setI((n) => n + 1);
      } else if (key !== 'Backspace') setWrong(key);
    },
  });

  return (
    <div class={s.step}>
      <section class={s.prompt}>
        <h2 class={s.promptTitle}>{title}</h2>
        <div class={s.sequence} aria-hidden="true">
          {[...keys].map((c, j) => (
            <span key={j} class={`${s.cap} ${j < i ? s.capDone : j === i ? s.capNow : ''}`}>
              {charName(c)}
            </span>
          ))}
        </div>
        <p class={s.reach} role="status">
          {done
            ? 'Well done.'
            : wrong
              ? `That was ${charName(wrong)}. Find ${charName(target)} with your ${fingerName(stroke.finger)}.`
              : describeReach(stroke.code, layout)}
        </p>
      </section>
      <KeyboardWithHands stroke={done ? null : stroke} hint={!done} mode="point" />
      <footer class={s.footer}>
        <span>Press the highlighted key</span>
        <span>
          <kbd>Esc</kbd> lessons
        </span>
      </footer>
    </div>
  );
}

/** Watch the hands press each new key. Enter replays, Space moves on. */
function DemoStep({ keys, lesson, onDone, onExit }: StepProps & { keys: string }) {
  const [i, setI] = useState(0);
  const [replay, setReplay] = useState(0);
  const c = keys[i]!;
  const stroke = layout.byChar.get(c)!;
  const next = () => (i + 1 < keys.length ? setI(i + 1) : onDone());
  useStepKeys({ space: next, enter: () => setReplay((n) => n + 1), escape: onExit });

  const shift = stroke.shiftCode
    ? ` Hold the ${stroke.shiftCode === 'ShiftLeft' ? 'left' : 'right'} Shift with your ${fingerName(stroke.shiftCode === 'ShiftLeft' ? 'L5' : 'R5')} at the same time.`
    : '';
  return (
    <div class={s.step}>
      <section class={s.prompt} aria-live="polite">
        <p class={s.eyebrow}>
          New key {i + 1} of {keys.length}
        </p>
        <span
          class={`${s.cap} ${s.capBig}`}
          style={{ '--finger': `var(--finger-${stroke.finger.toLowerCase()})` }}
        >
          {charName(c)}
        </span>
        <p class={s.reach}>
          {describeReach(stroke.code, layout)}
          {shift}
        </p>
        <div class={s.actions}>
          <Button variant="ghost" icon="reset" onClick={() => setReplay((n) => n + 1)}>
            Watch again
          </Button>
          <Button variant="primary" icon="chevron" onClick={next}>
            {i + 1 < keys.length ? 'Next key' : 'Start typing'}
          </Button>
        </div>
      </section>
      <KeyboardWithHands
        stroke={stroke}
        hint
        mode="animate"
        dim={unusedKeys(lesson.allowed)}
        replay={replay}
      />
      <ContinueHint
        extra={
          <span>
            <kbd>Enter</kbd> watch again
          </span>
        }
      />
    </div>
  );
}

const DRILL_NAMES: Record<DrillSpec['style'], string> = {
  single: 'One key at a time',
  pairs: 'Patterns',
  words: 'Words',
  review: 'Review',
  sentences: 'Sentences',
  fixed: 'Try it',
  mixed: 'Words and symbols',
};

const LEVEL_NAMES = ['no hint', 'hint when you pause', 'key and finger', 'full: hands and key'];

function DrillStep({ spec, lesson, focus, onDone, onExit, onRestart }: StepProps & { spec: DrillSpec }) {
  const text = useMemo(() => {
    // Review favours your weakest keys among this lesson's keys.
    const weak = weakestKeys(progress.value, 3)
      .map((code) => layout.byCode.get(code)?.base ?? '')
      .filter((c) => c && lesson.allowed.includes(c))
      .join('');
    const f = spec.style === 'review' ? weak || focus : focus;
    return drillText(spec, lesson, { rng: Math.random, words: enCommonWords, focus: f });
  }, []);
  const session = useMemo(() => new TypingSession(text, settings.value.errorMode), [text]);
  const missed = useRef(new Set<number>()).current;
  const [, rerender] = useState(0);
  const [hesitating, setHesitating] = useState(false);
  const [deadKey, setDeadKey] = useState(false);
  const finished = useRef(false);

  useTypingKeys(true, {
    onEscape: onExit,
    onTab: onRestart,
    onKey(key, t) {
      if (finished.current) return;
      if (key === 'Dead') return setDeadKey(true);
      const ev = session.input({ key, t });
      if (!ev) return;
      if (ev.kind === 'wrong') missed.add(ev.index);
      if (session.done) {
        finished.current = true;
        onDone({ target: session.target, events: session.events, correctChars: session.correctChars });
      } else rerender((n) => n + 1);
    },
  });

  // Hint level 1: the hint appears only after a pause.
  const pos = session.pos;
  const presses = session.events.length;
  useEffect(() => {
    setHesitating(false);
    const t = setTimeout(() => setHesitating(true), HESITATION_MS);
    return () => clearTimeout(t);
  }, [pos, presses]);

  const char = text[pos] ?? ' ';
  const stroke = layout.byChar.get(char)!;
  let level = guidanceFor(progress.value, stroke.code, settings.value.guidanceOverride);
  // Just missed this one: show where it is, whatever the level. Capitals keep the key + Shift hint, because
  // stats are kept per letter key, so a faded lowercase letter says nothing about using Shift.
  // shortcut: capitals never fade below level 2 in Auto; track Shift use per hand if that feels too helpful.
  const auto = settings.value.guidanceOverride === 'auto';
  if (missed.has(pos) || (auto && stroke.shiftCode)) level = Math.max(level, 2) as typeof level;
  const hint = level >= 2 || (level === 1 && hesitating);
  const chars = session.events.filter((e) => e.kind !== 'backspace');
  const accuracy = chars.length ? chars.filter((e) => e.kind === 'correct').length / chars.length : 1;

  return (
    <div class={s.step}>
      <div class={s.drillBar}>
        <span class={s.eyebrow}>{DRILL_NAMES[spec.style]}</span>
        <span class={`${s.drillStat} num`}>
          {chars.length ? `${Math.round(accuracy * 100)}% accuracy` : 'Type the text below. No timer.'}
        </span>
      </div>
      <div class={s.text}>
        <TypingText target={text} pos={pos} typed={session.typed} missed={missed} />
      </div>
      <p class={s.reach}>{hint ? `${charName(char)}: ${describeReach(stroke.code, layout)}` : ' '}</p>
      {deadKey && (
        <p class={s.warning} role="alert">
          Your keyboard sent a "dead key", which usually means a US-International or non-US layout. Typix
          expects a plain US layout, so quotes and some symbols may not register.
        </p>
      )}
      <KeyboardWithHands
        stroke={stroke}
        hint={hint}
        mode={level === 3 ? 'animate' : hint ? 'point' : 'rest'}
        dim={unusedKeys(lesson.allowed)}
      />
      <footer class={s.footer}>
        <span>
          <kbd>Tab</kbd> restart step
        </span>
        <span>
          <kbd>Esc</kbd> lessons
        </span>
        <span>
          Hint for {charName(char)}: {LEVEL_NAMES[level]}
          {settings.value.guidanceOverride === 'auto' ? ' (fades as you improve)' : ' (fixed in Settings)'}
        </span>
      </footer>
    </div>
  );
}
