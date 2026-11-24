import { useEffect, useMemo, useState } from 'preact/hooks';
import type { LayoutIndex } from '../../core/layout/keys';
import type { FingerId, KeyStroke } from '../../core/layout/types';
import type { Settings } from '../../core/store/schema';
import { fingerVar } from './Keyboard';
import {
  FINGERS,
  fingerWidth,
  palmOutline,
  restPose,
  restTip,
  strokePose,
  strokeTargets,
  type Pose,
  type Vec,
} from './handRig';
import s from './Hands.module.css';

/** How far below the keyboard (in key units) the hands are drawn before they are cut off. */
export const HANDS_BELOW = 1.8;
const KEYBOARD_ROWS = 5;
const U = 100; // SVG user units per key unit

/** home → reach → press → return, then a pause before the next demonstration (PLAN §9.2). */
const REACH_MS = 180;
const PRESS_MS = 160;
const RETURN_MS = 220;
const LOOP_MS = 1500;

export type HandsMode =
  /** Full guidance: the finger travels to the key and presses it, on a loop. */
  | 'animate'
  /** Hands at home with the finger(s) to use highlighted, no movement. */
  | 'point'
  /** Hands resting at home, no hint. */
  | 'rest';

type Phase = 'home' | 'reach' | 'press' | 'return';

const fingersOf = (stroke: KeyStroke) =>
  new Set<FingerId>([
    stroke.finger,
    ...(stroke.shiftCode ? [stroke.shiftCode === 'ShiftLeft' ? 'L5' : 'R5'] : []),
  ] as FingerId[]);

/**
 * Semi-transparent top-down hands drawn over the on-screen keyboard. Place it in the same
 * positioned box as the Keyboard, with the same `unit`.
 * Motion uses CSS transform transitions only, so the app's reduced-motion rule turns it into
 * static poses; with `reduced`, the hands simply hold the pose for the key.
 */
export function Hands({
  layout,
  stroke,
  mode,
  unit,
  tone,
  reduced,
  replay = 0,
}: {
  layout: LayoutIndex;
  stroke: KeyStroke | null;
  mode: HandsMode;
  unit: number;
  tone: Settings['handTone'];
  reduced: boolean;
  /** Change it to restart the demonstration. */
  replay?: number;
}) {
  const [phase, setPhase] = useState<Phase>('home');
  const rest = useMemo(() => restPose(layout), [layout]);
  const animate = mode === 'animate' && stroke !== null;

  useEffect(() => {
    setPhase('home');
    if (!animate) return;
    if (reduced) return setPhase('press');
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = (at: number) => {
      timers.push(setTimeout(() => setPhase('reach'), at));
      timers.push(setTimeout(() => setPhase('press'), at + REACH_MS));
      timers.push(setTimeout(() => setPhase('return'), at + REACH_MS + PRESS_MS));
    };
    cycle(60);
    const loop = setInterval(() => cycle(0), LOOP_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [animate, reduced, stroke?.code, stroke?.shiftCode, replay]);

  const atKey = animate && (phase === 'reach' || phase === 'press');
  const pose: Pose = atKey && stroke ? strokePose(stroke, layout) : rest;
  const active = stroke && mode !== 'rest' ? fingersOf(stroke) : new Set<FingerId>();
  const presses = animate && phase === 'press' && stroke ? Object.values(strokeTargets(stroke, layout)) : [];
  const dur = phase === 'reach' ? REACH_MS : RETURN_MS;

  return (
    <svg
      class={`${s.hands} ${s[tone]}`}
      viewBox={`0 0 ${15 * U} ${(KEYBOARD_ROWS + HANDS_BELOW) * U}`}
      width={15 * unit}
      height={(KEYBOARD_ROWS + HANDS_BELOW) * unit}
      style={{ '--hand-dur': `${dur}ms` }}
      aria-hidden="true"
      data-phase={phase}
    >
      {(['L', 'R'] as const).map((side) => (
        <g key={side} class={s.hand}>
          <path
            class={s.palm}
            d={smoothPath(palmOutline(side, { x: 0, y: 0 }))}
            style={{ transform: `translate(${pose[side].shift.x * U}px, ${pose[side].shift.y * U}px)` }}
          />
          {FINGERS.filter((f) => f[0] === side).map((f) => {
            const p = pose[side].fingers[f]!;
            const w = fingerWidth(f) * U;
            const restLen = Math.hypot(
              restTip(f, layout).x - rest[side].fingers[f]!.knuckle.x,
              restTip(f, layout).y - rest[side].fingers[f]!.knuckle.y,
            );
            const L = restLen * U;
            return (
              <g
                key={f}
                class={`${s.finger} ${active.has(f) ? s.active : ''}`}
                data-finger={f}
                style={{
                  '--finger': fingerVar(f),
                  transform: `translate(${p.knuckle.x * U}px, ${p.knuckle.y * U}px) rotate(${p.angle}deg) scale(1, ${p.stretch})`,
                }}
              >
                {/* Drawn pointing up from the knuckle; the tip pad centre sits at distance L. */}
                <rect x={-w / 2} y={-L - w * 0.45} width={w} height={L + w * 0.75} rx={w / 2} />
                <ellipse class={s.nail} cx={0} cy={-L - w * 0.05} rx={w * 0.27} ry={w * 0.32} />
              </g>
            );
          })}
        </g>
      ))}
      {presses.map((p: Vec, i) => (
        <circle key={`${i}-${replay}`} class={s.press} cx={p.x * U} cy={p.y * U} r={U * 0.32} />
      ))}
    </svg>
  );
}

/** A closed outline through the points, rounded with quadratic curves between edge midpoints. */
function smoothPath(points: Vec[]): string {
  const mid = (a: Vec, b: Vec) => ({ x: ((a.x + b.x) / 2) * U, y: ((a.y + b.y) / 2) * U });
  const n = points.length;
  const start = mid(points[n - 1]!, points[0]!);
  let d = `M${start.x} ${start.y}`;
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    const m = mid(p, points[(i + 1) % n]!);
    d += ` Q${p.x * U} ${p.y * U} ${m.x} ${m.y}`;
  }
  return d + 'Z';
}
