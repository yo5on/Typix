import { BONES, dist, type Joints, type Vec } from './skeleton';

/** Closest distance between segments ab and cd. */
export function segmentDistance(a: Vec, b: Vec, c: Vec, d: Vec): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}

export function pointSegment(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

function segmentsCross(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const cross = (o: Vec, p: Vec, q: Vec) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export type HurtZone = 'head' | 'body';

export interface Capsule {
  zone: HurtZone;
  a: Vec;
  b: Vec;
  r: number;
}

/** Where a fighter can be hit: a head circle and a torso capsule. */
export function hurtboxes(j: Joints): Capsule[] {
  return [
    { zone: 'head', a: j.head, b: j.head, r: BONES.headR + 0.02 },
    { zone: 'body', a: j.pelvis, b: j.neck, r: 0.15 },
  ];
}

/**
 * Tests a hitbox swept from `from` to `to` (the limb tip last tick and this tick) against a fighter's hurtboxes.
 * Sweeping means a fast limb can't skip through a thin target between two ticks.
 * Returns the zone hit and the contact point, or null. Head wins over body when both overlap.
 */
export function sweepHit(
  from: Vec,
  to: Vec,
  radius: number,
  target: Joints,
): { zone: HurtZone; at: Vec } | null {
  let best: { zone: HurtZone; at: Vec } | null = null;
  for (const c of hurtboxes(target)) {
    if (segmentDistance(from, to, c.a, c.b) <= radius + c.r && (!best || c.zone === 'head')) {
      best = { zone: c.zone, at: { ...to } };
    }
  }
  return best;
}
