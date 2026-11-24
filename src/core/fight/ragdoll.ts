import { BONE_LIST, BONES, JOINTS, dist, type JointName, type Joints, type Vec } from './skeleton';

/**
 * Lightweight Verlet ragdoll on the same 12 joints as the skeleton. Plain data, so it stays deterministic and
 * serialisable with the rest of the fight state.
 */
export interface Ragdoll {
  pos: Joints;
  prev: Joints;
  /** Ticks since the ragdoll started. */
  t: number;
}

const DT = 1 / 60;
const GRAVITY = -16; // a bit above 9.8 m/s² reads as heavier on screen
const ITERATIONS = 8;
const GROUND_FRICTION = 0.55;
export const ARENA_HALF = 4;

/** Extra constraints that keep the torso and head from folding through themselves. */
const BRACES: readonly [JointName, JointName, number][] = [
  ['pelvis', 'neck', BONES.torso + BONES.neck],
  ['chest', 'head', BONES.neck + BONES.headR],
];

/**
 * Minimum distances: a knee or elbow can bend, but never fold flat, so limbs don't collapse through themselves.
 * Roughly a 35° minimum joint angle.
 */
const MIN_SPANS: readonly [JointName, JointName, number][] = [
  ['pelvis', 'footF', 0.3],
  ['pelvis', 'footB', 0.3],
  ['chest', 'handF', 0.17],
  ['chest', 'handB', 0.17],
  ['pelvis', 'head', BONES.torso + BONES.neck * 0.5],
];

/** Starts a ragdoll from the current joints and each joint's velocity (m/s). */
export function startRagdoll(joints: Joints, vel: Record<JointName, Vec>): Ragdoll {
  const pos = {} as Joints;
  const prev = {} as Joints;
  for (const k of JOINTS) {
    pos[k] = { ...joints[k] };
    prev[k] = { x: joints[k].x - vel[k].x * DT, y: joints[k].y - vel[k].y * DT };
  }
  return { pos, prev, t: 0 };
}

export function stepRagdoll(r: Ragdoll): void {
  r.t++;
  const keep = 0.995;
  for (const k of JOINTS) {
    const p = r.pos[k];
    const q = r.prev[k];
    const vx = (p.x - q.x) * keep;
    const vy = (p.y - q.y) * keep;
    q.x = p.x;
    q.y = p.y;
    p.x += vx;
    p.y += vy + GRAVITY * DT * DT;
  }
  for (let i = 0; i < ITERATIONS; i++) {
    for (const [a, b, len] of BONE_LIST) satisfy(r.pos[a], r.pos[b], len);
    for (const [a, b, len] of BRACES) satisfy(r.pos[a], r.pos[b], len);
    for (const [a, b, min] of MIN_SPANS) if (dist(r.pos[a], r.pos[b]) < min) satisfy(r.pos[a], r.pos[b], min);
    for (const k of JOINTS) {
      const p = r.pos[k];
      const floor = k === 'head' ? BONES.headR * 0.8 : 0.02;
      if (p.y < floor) {
        p.y = floor;
        // Friction: bleed off horizontal speed while touching the ground.
        const q = r.prev[k];
        q.x = p.x - (p.x - q.x) * GROUND_FRICTION;
        q.y = p.y;
      }
      p.x = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, p.x));
    }
  }
}

function satisfy(a: Vec, b: Vec, len: number) {
  const d = dist(a, b) || 1e-6;
  const k = ((d - len) / d) * 0.5;
  const dx = (b.x - a.x) * k;
  const dy = (b.y - a.y) * k;
  a.x += dx;
  a.y += dy;
  b.x -= dx;
  b.y -= dy;
}
