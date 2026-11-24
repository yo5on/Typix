/**
 * The shared stick-figure skeleton. Every skin draws these same joints, and every hitbox is computed from them,
 * so a skin can never change gameplay.
 *
 * Units are metres. Fighter-local space: x points the way the fighter faces, y points up, origin on the ground
 * under the fighter's root.
 */
export type Vec = { x: number; y: number };

export const v = (x: number, y: number): Vec => ({ x, y });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Bone lengths. Height ≈ 1.75 m. */
export const BONES = {
  thigh: 0.45,
  shin: 0.45,
  torso: 0.52,
  neck: 0.1,
  headR: 0.12,
  upperArm: 0.3,
  forearm: 0.29,
} as const;

/** A pose: where the pelvis, hands and feet want to be, plus torso and head angles. Limbs are solved with IK. */
export interface Pose {
  hip: Vec;
  /** Torso angle from vertical in radians, positive = leaning forward. */
  lean: number;
  /** Head tilt relative to the torso, positive = chin forward/down. */
  head: number;
  /** Lead (front) hand and rear hand. */
  handF: Vec;
  handB: Vec;
  /** Lead and rear foot. */
  footF: Vec;
  footB: Vec;
}

export const JOINTS = [
  'head',
  'neck',
  'chest',
  'pelvis',
  'elbowF',
  'handF',
  'elbowB',
  'handB',
  'kneeF',
  'footF',
  'kneeB',
  'footB',
] as const;
export type JointName = (typeof JOINTS)[number];
export type Joints = Record<JointName, Vec>;

/** Bones as joint pairs, with rest length. Used by the ragdoll and by skins. */
export const BONE_LIST: readonly [JointName, JointName, number][] = [
  ['pelvis', 'chest', BONES.torso],
  ['chest', 'neck', BONES.neck],
  ['neck', 'head', BONES.headR],
  ['chest', 'elbowF', BONES.upperArm],
  ['elbowF', 'handF', BONES.forearm],
  ['chest', 'elbowB', BONES.upperArm],
  ['elbowB', 'handB', BONES.forearm],
  ['pelvis', 'kneeF', BONES.thigh],
  ['kneeF', 'footF', BONES.shin],
  ['pelvis', 'kneeB', BONES.thigh],
  ['kneeB', 'footB', BONES.shin],
];

/**
 * Two-bone IK: the middle joint (elbow/knee) for a chain from `root` reaching for `target`.
 * The middle joint always sits on the same side of the root→target line (`side` 1 = counter-clockwise), so it
 * rotates smoothly with the limb instead of flipping when the limb swings past a fixed direction.
 * Unreachable targets are clamped, so the limb stretches straight toward them.
 */
export function solveIK(
  root: Vec,
  target: Vec,
  l1: number,
  l2: number,
  side: 1 | -1,
): { mid: Vec; end: Vec } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const dd = Math.min(Math.max(len, Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4);
  const ux = dx / len;
  const uy = dy / len;
  // Law of cosines: distance along the root→target line to the foot of the mid joint, and its offset from it.
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const px = -uy * side;
  const py = ux * side;
  const mid = v(root.x + ux * a + px * h, root.y + uy * a + py * h);
  const end = v(root.x + ux * dd, root.y + uy * dd);
  return { mid, end };
}

/** Facing +x: knees bend forward of the hip→foot line, elbows below the shoulder→hand line. */
const KNEE = 1;
const ELBOW = -1;

const SHOULDER_CLEAR = 0.16;

/**
 * Right at the shoulder the elbow direction is undefined, so hand targets keep a small minimum reach.
 */
function clearOfShoulder(chest: Vec, hand: Vec): Vec {
  const d = dist(chest, hand);
  if (d >= SHOULDER_CLEAR) return hand;
  if (d < 1e-6) return v(chest.x + SHOULDER_CLEAR, chest.y);
  const k = SHOULDER_CLEAR / d;
  return v(chest.x + (hand.x - chest.x) * k, chest.y + (hand.y - chest.y) * k);
}

/** Fighter-local pose → local joint positions. */
export function solvePose(p: Pose): Joints {
  const pelvis = p.hip;
  const s = Math.sin(p.lean);
  const c = Math.cos(p.lean);
  const chest = v(pelvis.x + s * BONES.torso, pelvis.y + c * BONES.torso);
  const neck = v(chest.x + s * BONES.neck, chest.y + c * BONES.neck);
  const ha = p.lean + p.head;
  const head = v(neck.x + Math.sin(ha) * BONES.headR, neck.y + Math.cos(ha) * BONES.headR);
  const armF = solveIK(chest, clearOfShoulder(chest, p.handF), BONES.upperArm, BONES.forearm, ELBOW);
  const armB = solveIK(chest, clearOfShoulder(chest, p.handB), BONES.upperArm, BONES.forearm, ELBOW);
  const legF = solveIK(pelvis, p.footF, BONES.thigh, BONES.shin, KNEE);
  const legB = solveIK(pelvis, p.footB, BONES.thigh, BONES.shin, KNEE);
  return {
    head,
    neck,
    chest,
    pelvis,
    elbowF: armF.mid,
    handF: armF.end,
    elbowB: armB.mid,
    handB: armB.end,
    kneeF: legF.mid,
    footF: legF.end,
    kneeB: legB.mid,
    footB: legB.end,
  };
}

const chestOf = (hip: Vec, lean: number) =>
  v(hip.x + Math.sin(lean) * BONES.torso, hip.y + Math.cos(lean) * BONES.torso);

/** Blends point `pa` (around centre `ca`) toward `pb` (around `cb`) on an arc around the blended centre `c`. */
function arcLerp(pa: Vec, ca: Vec, pb: Vec, cb: Vec, c: Vec, t: number): Vec {
  const aa = Math.atan2(pa.y - ca.y, pa.x - ca.x);
  const ab = Math.atan2(pb.y - cb.y, pb.x - cb.x);
  const turn = ((((ab - aa + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const ang = aa + turn * t;
  const r = lerp(dist(pa, ca), dist(pb, cb), t);
  return v(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r);
}

/**
 * Blends two poses. Hands swing on arcs around the shoulder and feet around the hip (angle and reach blended,
 * not x and y), the way limbs actually move, so a hand or foot never cuts straight past the body and whips the
 * elbow or knee around.
 */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const hip = lerpV(a.hip, b.hip, t);
  const lean = lerp(a.lean, b.lean, t);
  const ca = chestOf(a.hip, a.lean);
  const cb = chestOf(b.hip, b.lean);
  const c = chestOf(hip, lean);
  return {
    hip,
    lean,
    head: lerp(a.head, b.head, t),
    handF: arcLerp(a.handF, ca, b.handF, cb, c, t),
    handB: arcLerp(a.handB, ca, b.handB, cb, c, t),
    footF: arcLerp(a.footF, a.hip, b.footF, b.hip, hip, t),
    footB: arcLerp(a.footB, a.hip, b.footB, b.hip, hip, t),
  };
}

/** Local joints → world, given the fighter's root x and facing (+1 right, -1 left). */
export function toWorld(j: Joints, x: number, facing: 1 | -1): Joints {
  const out = {} as Joints;
  for (const k of JOINTS) out[k] = v(x + j[k].x * facing, j[k].y);
  return out;
}
