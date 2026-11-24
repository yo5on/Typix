import { useEffect, useId, useMemo, useState } from 'preact/hooks';
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
const W = 15 * U;
const H = (KEYBOARD_ROWS + HANDS_BELOW) * U;

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
  const id = useId();
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
      viewBox={`0 0 ${W} ${H}`}
      width={15 * unit}
      height={(KEYBOARD_ROWS + HANDS_BELOW) * unit}
      style={{ '--hand-dur': `${dur}ms` }}
      aria-hidden="true"
      data-phase={phase}
    >
      <defs>
        {/* The wrists fade out instead of being cut off at the bottom edge. */}
        <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1={0} y1={6.05 * U} x2={0} y2={H}>
          <stop offset={0} stop-color="#fff" />
          <stop offset={1} stop-color="#000" />
        </linearGradient>
        <mask id={`${id}-wrist`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <rect width={W} height={H} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      {(['L', 'R'] as const).map((side) => {
        const palm = smoothPath(palmOutline(side, { x: 0, y: 0 }));
        const palmMove = { transform: `translate(${pose[side].shift.x * U}px, ${pose[side].shift.y * U}px)` };
        const fingers = FINGERS.filter((f) => f[0] === side).map((f) => {
          const p = pose[side].fingers[f]!;
          const restLen = Math.hypot(
            restTip(f, layout).x - rest[side].fingers[f]!.knuckle.x,
            restTip(f, layout).y - rest[side].fingers[f]!.knuckle.y,
          );
          return {
            f,
            shape: fingerShape(fingerWidth(f) * U, restLen * U, f[1] === '1'),
            style: {
              '--finger': fingerVar(f),
              transform: `translate(${p.knuckle.x * U}px, ${p.knuckle.y * U}px) rotate(${p.angle}deg) scale(1, ${p.stretch})`,
            },
            cls: `${s.finger} ${active.has(f) ? s.active : ''}`,
          };
        });
        // Two passes, so each hand is one silhouette: every outline first, then every fill on top. Only the
        // outer edge shows, with no seams where fingers meet the palm.
        return (
          <g key={side} class={s.hand} mask={`url(#${id}-wrist)`}>
            <g class={s.outline}>
              <path class={s.palm} d={palm} style={palmMove} />
              {fingers.map((x) => (
                <g key={x.f} class={x.cls} style={x.style}>
                  <path d={x.shape.body} />
                </g>
              ))}
            </g>
            <g class={s.fill}>
              <path class={s.palm} d={palm} style={palmMove} />
              {fingers.map((x) => (
                <g key={x.f} class={x.cls} style={x.style} data-finger={x.f}>
                  <path d={x.shape.body} />
                  <path class={s.crease} d={x.shape.creases} />
                  <path class={s.nail} d={x.shape.nail} />
                </g>
              ))}
            </g>
          </g>
        );
      })}
      {presses.map((p: Vec, i) => (
        <circle key={`${i}-${replay}`} class={s.press} cx={p.x * U} cy={p.y * U} r={U * 0.32} />
      ))}
    </svg>
  );
}

/**
 * One finger, drawn pointing up from its knuckle at (0, 0), with the fingertip pad centred at distance `L`:
 * a body that tapers towards a rounded tip, two knuckle creases (one on the thumb) and a nail.
 */
function fingerShape(w: number, L: number, thumb: boolean) {
  const base = w / 2;
  const tip = w * (thumb ? 0.46 : 0.41);
  const top = -L - w * 0.45;
  const cy = top + tip;
  const bottom = w * 0.3; // hidden inside the palm
  const body = `M${-base} ${bottom} C${-base} ${-L * 0.3} ${-tip} ${cy + w * 0.5} ${-tip} ${cy} A${tip} ${tip} 0 0 1 ${tip} ${cy} C${tip} ${cy + w * 0.5} ${base} ${-L * 0.3} ${base} ${bottom}Z`;
  const crease = (y: number, half: number) => `M${-half} ${y} Q0 ${y + w * 0.06} ${half} ${y}`;
  const creases = thumb
    ? crease(-L * 0.55, tip * 0.6)
    : `${crease(-L * 0.38, base * 0.55)} ${crease(-L * 0.72, tip * 0.6)}`;
  const nw = tip * 0.62;
  const nt = top + w * 0.08;
  const nb = nt + w * 0.42;
  const nail = `M${-nw} ${nb} L${-nw} ${nt + nw} A${nw} ${nw} 0 0 1 ${nw} ${nt + nw} L${nw} ${nb} Q0 ${nb + w * 0.08} ${-nw} ${nb}Z`;
  return { body, creases, nail };
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
