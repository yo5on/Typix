import type { LayoutIndex } from '../../core/layout/keys';
import type { FingerId, KeyDef, KeyStroke } from '../../core/layout/types';
import { HOME_KEY } from '../../core/learning/fingers';

// Top-down hand rig over the on-screen keyboard, in key units (1 = one letter key, y grows downward).
// Poses are derived from the layout: the finger's tip goes to the key, its knuckle and the wrist follow a
// little, and the neighbouring fingers lift along with the hand. No per-key pose tables to maintain.

export interface Vec {
  x: number;
  y: number;
}

export interface FingerPose {
  knuckle: Vec;
  tip: Vec;
  /** Degrees clockwise from pointing straight up (away from the typist). */
  angle: number;
  /** Apparent length ÷ resting length: < 1 is a curl (bottom row), > 1 a stretch (top rows). */
  stretch: number;
}

export interface HandPose {
  /** Wrist / palm offset from the resting position. */
  shift: Vec;
  fingers: Partial<Record<FingerId, FingerPose>>;
}

export type Pose = Record<'L' | 'R', HandPose>;

/** Mirror line between F and J, so the right hand is the left hand flipped. */
const MIRROR_X = 6.75;
const flip = (v: Vec): Vec => ({ x: 2 * MIRROR_X - v.x, y: v.y });

/** Left-hand knuckles and finger widths. Fingertips rest on the home keys. */
const LEFT: Record<'5' | '4' | '3' | '2' | '1', { knuckle: Vec; width: number }> = {
  '5': { knuckle: { x: 2.75, y: 4.75 }, width: 0.6 },
  '4': { knuckle: { x: 3.55, y: 5.0 }, width: 0.68 },
  '3': { knuckle: { x: 4.4, y: 5.05 }, width: 0.72 },
  '2': { knuckle: { x: 5.2, y: 4.95 }, width: 0.72 },
  '1': { knuckle: { x: 5.55, y: 6.0 }, width: 0.82 },
};
/** Thumb tip resting on the space bar (the layout's home for both thumbs is the whole bar). */
const LEFT_THUMB_TIP: Vec = { x: 6.1, y: 4.6 };

/** Palm outline of the left hand at rest. The right palm is its mirror image. */
export const LEFT_PALM: Vec[] = [
  { x: 2.35, y: 4.85 },
  { x: 3.9, y: 4.7 },
  { x: 5.7, y: 4.85 },
  { x: 6.05, y: 6.1 },
  { x: 5.75, y: 7.6 },
  { x: 2.6, y: 7.6 },
  { x: 2.2, y: 6.1 },
];

export const FINGERS: FingerId[] = ['L5', 'L4', 'L3', 'L2', 'L1', 'R1', 'R2', 'R3', 'R4', 'R5'];

export const fingerWidth = (f: FingerId) => LEFT[f[1] as keyof typeof LEFT].width;

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const len = (a: Vec) => Math.hypot(a.x, a.y);

/** The point of a key a fingertip aims for: its centre, or for wide keys (Shift, Enter, Space) the near end. */
export function keyPoint(key: KeyDef, fromX: number): Vec {
  const y = key.row + 0.5;
  if (key.w <= 1.25) return { x: key.x + key.w / 2, y };
  return { x: Math.min(Math.max(fromX, key.x + 0.5), key.x + key.w - 0.5), y };
}

function restKnuckle(f: FingerId): Vec {
  const k = LEFT[f[1] as keyof typeof LEFT].knuckle;
  return f[0] === 'L' ? k : flip(k);
}

/** Where a fingertip rests. */
export function restTip(f: FingerId, layout: LayoutIndex): Vec {
  if (f === 'L1') return LEFT_THUMB_TIP;
  if (f === 'R1') return flip(LEFT_THUMB_TIP);
  const k = layout.byCode.get(HOME_KEY[f])!;
  return keyPoint(k, k.x + k.w / 2);
}

function fingerPose(f: FingerId, knuckle: Vec, tip: Vec, layout: LayoutIndex): FingerPose {
  const d = sub(tip, knuckle);
  const rest = len(sub(restTip(f, layout), restKnuckle(f)));
  return { knuckle, tip, angle: (Math.atan2(d.x, -d.y) * 180) / Math.PI, stretch: len(d) / rest };
}

function handPose(side: 'L' | 'R', targets: Partial<Record<FingerId, Vec>>, layout: LayoutIndex): HandPose {
  // The hand follows a long reach (a third of it) and barely moves for a short one.
  let shift: Vec = { x: 0, y: 0 };
  for (const [f, t] of Object.entries(targets) as [FingerId, Vec][]) {
    const reach = sub(t, restTip(f, layout));
    shift = add(shift, mul(reach, len(reach) > 1.2 ? 0.3 : 0.1));
  }
  const fingers: HandPose['fingers'] = {};
  for (const f of FINGERS.filter((x) => x[0] === side)) {
    const knuckle = add(restKnuckle(f), shift);
    // Neighbouring fingers stay near home but lift slightly with the hand.
    const tip = targets[f] ?? add(restTip(f, layout), mul(shift, 0.7));
    fingers[f] = fingerPose(f, knuckle, tip, layout);
  }
  return { shift, fingers };
}

export function restPose(layout: LayoutIndex): Pose {
  return { L: handPose('L', {}, layout), R: handPose('R', {}, layout) };
}

/** Where each finger goes to type one character: the key's own finger, plus the opposite pinky on Shift. */
export function strokeTargets(stroke: KeyStroke, layout: LayoutIndex): Partial<Record<FingerId, Vec>> {
  const key = layout.byCode.get(stroke.code)!;
  const targets: Partial<Record<FingerId, Vec>> = {
    [stroke.finger]: keyPoint(key, restTip(stroke.finger, layout).x),
  };
  if (stroke.shiftCode) {
    const shift = layout.byCode.get(stroke.shiftCode)!;
    const pinky: FingerId = stroke.shiftCode === 'ShiftLeft' ? 'L5' : 'R5';
    targets[pinky] = keyPoint(shift, restTip(pinky, layout).x);
  }
  return targets;
}

export function strokePose(stroke: KeyStroke, layout: LayoutIndex): Pose {
  const t = strokeTargets(stroke, layout);
  const side = (s: 'L' | 'R') =>
    Object.fromEntries(Object.entries(t).filter(([f]) => f[0] === s)) as Partial<Record<FingerId, Vec>>;
  return { L: handPose('L', side('L'), layout), R: handPose('R', side('R'), layout) };
}

/** Palm outline (key units) for a hand at a given wrist offset. */
export function palmOutline(side: 'L' | 'R', shift: Vec): Vec[] {
  return LEFT_PALM.map((p) => add(side === 'L' ? p : flip(p), shift));
}
