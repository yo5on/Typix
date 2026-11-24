import { sweepHit, type HurtZone } from './collision';
import {
  DODGE,
  GUARD,
  MOVES,
  REACTIONS,
  STANCE,
  phases,
  type Limb,
  type MoveDef,
  type MoveId,
} from './moves';
import { ARENA_HALF, startRagdoll, stepRagdoll, type Ragdoll } from './ragdoll';
import {
  JOINTS,
  lerp,
  lerpPose,
  solvePose,
  toWorld,
  v,
  type JointName,
  type Joints,
  type Pose,
  type Vec,
} from './skeleton';

/**
 * The combat simulation: a pure, fixed-tick function of (state, inputs). No clocks, no randomness, no DOM.
 * Rendering speed, pause and frame-step only change how often `step` is called, never what it does.
 */
export const TICK_HZ = 60;
const DT = 1 / TICK_HZ;
export const MAX_HP = 100;

/** Preferred distance between fighters' roots, and the closest they may get. */
const GAP = 1.0;
const MIN_GAP = 0.5;
const WALK_SPEED = 1.4;
const STEP_TRIGGER = 0.12;
const STEP_TICKS = 8;
const STEP_HEIGHT = 0.09;
const KO_HITSTOP = 14;

/** A block holds this long after the last block input; holding the guard means re-sending it. */
export const BLOCK_TICKS = 20;
/** Ticks for the guard to come up; hits before that land in full. */
const BLOCK_UP = 3;
/** Share of damage and knockback that gets through a guard. */
const BLOCK_DAMAGE = 0.2;
const BLOCK_PUSH = 0.5;
export const DODGE_TICKS = 24;
/** Dodging is invulnerable for this many ticks from its start. */
const DODGE_INVULN = 16;
const DODGE_SPEED = 3.4;
/** After a block or dodge, an attack started within this window is a counter. */
const COUNTER_TICKS = 45;
const COUNTER_BONUS = 1.5;
/** Each hit in a combo adds this much damage, up to COMBO_CAP hits. */
const COMBO_STEP = 0.04;
const COMBO_CAP = 5;
/** Attacks typed while busy wait here; extras beyond this are dropped. */
export const QUEUE_MAX = 3;

export type FighterId = 0 | 1;

export type Action =
  | { kind: 'idle' }
  | {
      kind: 'attack';
      move: MoveId;
      t: number;
      hit: boolean;
      power: number;
      lunge: number;
      counter: boolean;
    }
  | { kind: 'hitstun'; t: number; dur: number; zone: HurtZone; strength: number }
  | { kind: 'block'; t: number; dur: number }
  | { kind: 'dodge'; t: number }
  | { kind: 'ko' };

/** A planted foot (world x) and, while stepping, where the step started. */
interface Foot {
  x: number;
  step: { from: number; t: number } | null;
}

interface QueuedAttack {
  move: MoveId;
  power: number;
  skipWindup: boolean;
}

export interface FighterState {
  id: FighterId;
  x: number;
  vx: number;
  facing: 1 | -1;
  hp: number;
  action: Action;
  /** Typing preparation: the move being charged and how far along (0–1). Survives being hit. */
  prep: { move: MoveId; charge: number } | null;
  /** Tremble left by a typo while charging (1 → 0). */
  wobble: number;
  /** Attacks that arrived while busy; they fire in order as soon as the fighter is free. */
  queue: QueuedAttack[];
  /** Hits landed in a row without whiffing, being blocked or being hit. */
  combo: number;
  /** Ticks left in which a new attack counts as a counter. */
  counter: number;
  /** Smoothed walking speed along the facing direction, m/s. Leans the body into the walk. */
  walk: number;
  /** Smoothed fighter-local pose. */
  pose: Pose;
  feet: { F: Foot; B: Foot };
  /** World-space joints this tick and last tick (renderers interpolate between them). */
  joints: Joints;
  prevJoints: Joints;
  ragdoll: Ragdoll | null;
}

export type FightEvent =
  | {
      kind: 'hit';
      attacker: FighterId;
      move: MoveId;
      zone: HurtZone;
      at: Vec;
      damage: number;
      heavy: boolean;
      /** Direction of the blow, +1 or -1 on x. */
      dir: 1 | -1;
      /** The attacker's combo count including this hit. */
      combo: number;
      counter: boolean;
    }
  | { kind: 'block'; fighter: FighterId; at: Vec; damage: number; dir: 1 | -1 }
  | { kind: 'evade'; fighter: FighterId }
  | { kind: 'ko'; fighter: FighterId }
  | { kind: 'release'; fighter: FighterId; move: MoveId };

export interface FightState {
  tick: number;
  /** Freeze ticks left after an impact. */
  hitstop: number;
  fighters: [FighterState, FighterState];
  /** Events produced by the latest step only. */
  events: FightEvent[];
  /** Set once someone is knocked out; 'draw' when both go down on the same tick. */
  winner: FighterId | 'draw' | null;
}

export type FightInput =
  /** A whole move including its windup (manual trigger). */
  | { fighter: FighterId; kind: 'attack'; move: MoveId; power?: number }
  /** Typing progress: anticipation toward `move`, 0–1. */
  | { fighter: FighterId; kind: 'charge'; move: MoveId; charge: number }
  | { fighter: FighterId; kind: 'typo' }
  /** Word finished: the windup was already shown by charging, so the strike starts immediately. */
  | { fighter: FighterId; kind: 'release'; move: MoveId; power: number }
  | { fighter: FighterId; kind: 'cancel' }
  /** Raise (or keep holding) the guard for BLOCK_TICKS. Only from idle or an existing block. */
  | { fighter: FighterId; kind: 'block' }
  /** Step back out of reach. Only from idle or a block. */
  | { fighter: FighterId; kind: 'dodge' };

function createFighter(id: FighterId, gap: number): FighterState {
  const facing = id === 0 ? 1 : -1;
  const x = -facing * (gap / 2);
  const joints = toWorld(solvePose(STANCE), x, facing);
  return {
    id,
    x,
    vx: 0,
    facing,
    hp: MAX_HP,
    action: { kind: 'idle' },
    prep: null,
    wobble: 0,
    queue: [],
    combo: 0,
    counter: 0,
    walk: 0,
    pose: structuredClone(STANCE),
    feet: { F: { x: joints.footF.x, step: null }, B: { x: joints.footB.x, step: null } },
    joints,
    prevJoints: joints,
    ragdoll: null,
  };
}

/** `gap`: starting distance between the fighters. Wider than fighting distance makes them walk in. */
export function createFight({ gap = GAP }: { gap?: number } = {}): FightState {
  return {
    tick: 0,
    hitstop: 0,
    fighters: [createFighter(0, gap), createFighter(1, gap)],
    events: [],
    winner: null,
  };
}

/** Advances the fight by one tick. Never mutates `prev`. */
export function step(prev: FightState, inputs: readonly FightInput[] = []): FightState {
  const s = structuredClone(prev);
  s.tick++;
  s.events = [];
  for (const input of inputs) applyInput(s, input);
  for (const f of s.fighters) f.prevJoints = f.joints;
  if (s.hitstop > 0) {
    s.hitstop--;
    return s;
  }
  const [a, b] = s.fighters;
  updateFighter(s, a, b);
  updateFighter(s, b, a);
  keepApart(a, b);
  a.joints = solveFighter(a);
  b.joints = solveFighter(b);
  resolveHits(s);
  return s;
}

function applyInput(s: FightState, i: FightInput) {
  const f = s.fighters[i.fighter];
  if (f.action.kind === 'ko' || s.winner !== null) return;
  const free = f.action.kind === 'idle' || f.action.kind === 'block';
  switch (i.kind) {
    case 'attack':
      queueAttack(s, f, i.move, i.power ?? 1, false);
      break;
    case 'charge':
      f.prep = { move: i.move, charge: Math.max(0, Math.min(1, i.charge)) };
      break;
    case 'typo':
      f.wobble = 1;
      break;
    case 'release':
      f.prep = null;
      queueAttack(s, f, i.move, i.power, true);
      break;
    case 'cancel':
      f.prep = null;
      break;
    case 'block':
      if (f.action.kind === 'block') f.action.dur = Math.max(f.action.dur, f.action.t + BLOCK_TICKS);
      else if (free) f.action = { kind: 'block', t: 0, dur: BLOCK_TICKS };
      break;
    case 'dodge':
      if (!free) break;
      f.action = { kind: 'dodge', t: 0 };
      f.vx = -f.facing * DODGE_SPEED;
      break;
  }
}

function queueAttack(s: FightState, f: FighterState, move: MoveId, power: number, skipWindup: boolean) {
  if (f.action.kind === 'idle') startAttack(s, f, move, power, skipWindup);
  else if (f.queue.length < QUEUE_MAX) f.queue.push({ move, power, skipWindup });
}

function startAttack(s: FightState, f: FighterState, move: MoveId, power: number, skipWindup: boolean) {
  // Step in further if knocked out of range, so an attack typed from too far away still lands.
  const o = s.fighters[f.id === 0 ? 1 : 0];
  const lunge = MOVES[move].lunge + Math.max(0, Math.min(0.8, Math.abs(o.x - f.x) - GAP));
  const counter = f.counter > 0;
  f.counter = 0;
  f.action = {
    kind: 'attack',
    move,
    t: skipWindup ? MOVES[move].windupTicks : 0,
    hit: false,
    power,
    lunge,
    counter,
  };
  s.events.push({ kind: 'release', fighter: f.id, move });
}

function updateFighter(s: FightState, f: FighterState, o: FighterState) {
  if (f.ragdoll) {
    stepRagdoll(f.ragdoll);
    return;
  }
  f.facing = o.x >= f.x ? 1 : -1;
  if (f.counter > 0) f.counter--;

  const idle = idlePose(s.tick, f);
  let target: Pose;
  let follow: number;
  const a = f.action;
  if (a.kind === 'attack') {
    const m = MOVES[a.move];
    const ph = phases(m);
    a.t++;
    if (a.t > ph.strikeAt && a.t <= ph.holdAt) f.x += (f.facing * a.lunge) / m.strikeTicks;
    [target, follow] = attackPose(m, a.t, idle);
    if (a.t >= ph.end) endAttack(f);
    else if (a.t >= ph.cancelAt && f.queue.length) endAttack(f);
  } else if (a.kind === 'hitstun') {
    a.t++;
    // Snap into the reaction in 3 ticks, then ease out of it.
    const r = (a.t < 3 ? a.t / 3 : Math.exp(-(a.t - 3) / (a.dur * 0.35))) * a.strength;
    target = lerpPose(idle, REACTIONS[a.zone], r);
    follow = 0.5;
    if (a.t >= a.dur) f.action = { kind: 'idle' };
  } else if (a.kind === 'block') {
    a.t++;
    target = lerpPose(idle, GUARD, Math.min(1, a.t / BLOCK_UP));
    follow = 0.3;
    if (a.t >= a.dur) f.action = { kind: 'idle' };
  } else if (a.kind === 'dodge') {
    a.t++;
    target = lerpPose(idle, DODGE, Math.sin(Math.PI * Math.min(1, a.t / DODGE_TICKS)) ** 0.6);
    follow = 0.5;
    if (a.t >= DODGE_TICKS) f.action = { kind: 'idle' };
  } else {
    target = f.prep ? chargePose(idle, f.prep.move, f.prep.charge) : idle;
    follow = f.prep ? 0.25 : 0.2;
  }

  if (f.action.kind === 'idle' && f.queue.length) {
    const q = f.queue.shift()!;
    startAttack(s, f, q.move, q.power, q.skipWindup);
  }

  if (f.wobble > 0) {
    const w = f.wobble * 0.025;
    target = {
      ...target,
      hip: v(target.hip.x, target.hip.y - w * 0.5),
      handF: v(target.handF.x + Math.sin(s.tick * 2.1) * w, target.handF.y + Math.cos(s.tick * 2.7) * w),
      handB: v(target.handB.x + Math.sin(s.tick * 2.5) * w, target.handB.y),
      head: target.head + Math.sin(s.tick * 1.9) * w * 2,
    };
    f.wobble = Math.max(0, f.wobble - 1 / 18);
  }

  f.pose = lerpPose(f.pose, target, follow);

  // Knockback slide, then walk back to fighting distance when free.
  f.x += f.vx * DT;
  f.vx *= 0.86;
  if (Math.abs(f.vx) < 0.02) f.vx = 0;
  let walked = 0;
  if (f.action.kind === 'idle' && !o.ragdoll) {
    const err = Math.abs(o.x - f.x) - GAP;
    if (Math.abs(err) > 0.02) walked = Math.sign(err) * Math.min(Math.abs(err) / 2, WALK_SPEED * DT);
    f.x += f.facing * walked;
  }
  f.walk = lerp(f.walk, walked / DT, 0.15);
  f.x = Math.max(-ARENA_HALF + 0.4, Math.min(ARENA_HALF - 0.4, f.x));
}

/** Leaves an attack; a whiff (no contact) breaks the combo. */
function endAttack(f: FighterState) {
  if (f.action.kind === 'attack' && !f.action.hit) f.combo = 0;
  f.action = { kind: 'idle' };
}

function keepApart(a: FighterState, b: FighterState) {
  if (a.ragdoll || b.ragdoll) return;
  const dx = b.x - a.x;
  if (Math.abs(dx) >= MIN_GAP) return;
  const push = (MIN_GAP - Math.abs(dx)) / 2;
  const dir = dx >= 0 ? 1 : -1;
  a.x -= dir * push;
  b.x += dir * push;
}

const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;
const easeOutCubic = (t: number) => 1 - (1 - Math.min(1, t)) ** 3;
const easeOutQuad = (t: number) => 1 - (1 - t) ** 2;

/** Target pose and how quickly the body follows it (1 = exactly, for a snappy strike). */
function attackPose(m: MoveDef, t: number, idle: Pose): [Pose, number] {
  const ph = phases(m);
  if (t < ph.strikeAt) return [lerpPose(idle, m.windup, easeInOut(t / ph.strikeAt)), 0.45];
  if (t < ph.holdAt) {
    const k = (t - ph.strikeAt) / m.strikeTicks;
    const p = lerpPose(m.windup, m.strike, easeOutCubic(k));
    if (m.arc) {
      const bulge = Math.sin(Math.PI * k);
      p[m.limb] = v(p[m.limb].x + m.arc.x * bulge, p[m.limb].y + m.arc.y * bulge);
    }
    // Not 1: a typed or chained strike starts from wherever the body is, and this closes that gap in a few ticks.
    return [p, 0.7];
  }
  if (t < ph.recoverAt) return [m.strike, 0.8];
  // Recovery eases back to guard; the follow rate ramps up so the end settles without a pop.
  const k = (t - ph.recoverAt) / m.recoverTicks;
  return [lerpPose(m.strike, idle, easeInOut(k)), 0.3 + 0.3 * k];
}

/** Bouncing on the toes, with the weight drifting between the feet and the hands trailing the body. */
function idlePose(tick: number, f: FighterState): Pose {
  const ph = tick * 0.16 + f.id * 1.7;
  const bob = Math.sin(ph);
  const sway = Math.sin(ph * 0.5);
  const lag = (d: number) => Math.sin(ph - d);
  // Walking leans into the direction of travel and settles the weight lower.
  const walk = Math.max(-1, Math.min(1, f.walk / WALK_SPEED));
  return {
    ...STANCE,
    hip: v(
      STANCE.hip.x + sway * 0.03 + walk * 0.04,
      STANCE.hip.y - 0.012 + bob * 0.018 - Math.abs(walk) * 0.02,
    ),
    lean: STANCE.lean + sway * 0.04 + walk * 0.08,
    head: STANCE.head - bob * 0.03 - walk * 0.04,
    handF: v(STANCE.handF.x + sway * 0.03, STANCE.handF.y + lag(0.6) * 0.02),
    handB: v(STANCE.handB.x + sway * 0.02, STANCE.handB.y + lag(0.9) * 0.016),
  };
}

/** Anticipation built by typing: the body coils toward the move's windup and sinks into its stance. */
function chargePose(idle: Pose, move: MoveId, charge: number): Pose {
  const c = easeOutQuad(charge);
  const p = lerpPose(idle, MOVES[move].windup, c);
  return { ...p, hip: v(p.hip.x, p.hip.y - 0.02 * c) };
}

/** Pose → world joints, with grounded feet kept planted and stepping when the body moves away from them. */
function solveFighter(f: FighterState): Joints {
  if (f.ragdoll) return structuredClone(f.ragdoll.pos);
  const p = { ...f.pose };
  // Skid on hard knockback; a dodge is a quick step, so its feet still step.
  const skid = Math.abs(f.vx) > 1 && f.action.kind !== 'dodge';
  let dip = 0;
  for (const side of ['F', 'B'] as const) {
    const key = side === 'F' ? 'footF' : 'footB';
    const foot = f.feet[side];
    const other = f.feet[side === 'F' ? 'B' : 'F'];
    const local = p[key];
    const desired = f.x + f.facing * local.x;
    if (local.y > 0.04) {
      // The pose lifts this foot (a kick): it follows the pose and re-plants wherever it lands.
      foot.x = desired;
      foot.step = null;
      continue;
    }
    if (skid) foot.x += f.vx * DT;
    if (!foot.step && !other.step && Math.abs(desired - foot.x) > STEP_TRIGGER)
      foot.step = { from: foot.x, t: 0 };
    let x = foot.x;
    let y = 0;
    if (foot.step) {
      const k = ++foot.step.t / STEP_TICKS;
      x = lerp(foot.step.from, desired, easeInOut(k));
      y = Math.sin(Math.PI * Math.min(1, k)) * STEP_HEIGHT;
      dip = Math.max(dip, y * 0.25);
      if (k >= 1) {
        foot.x = desired;
        foot.step = null;
      }
    }
    p[key] = v((x - f.x) * f.facing, y);
  }
  // The pelvis drops a little while a foot is in the air, so steps carry weight.
  if (dip) p.hip = v(p.hip.x, p.hip.y - dip);
  return toWorld(solvePose(p), f.x, f.facing);
}

function resolveHits(s: FightState) {
  // Detect both sides first, so simultaneous hits trade instead of favouring fighter 0.
  const hits: {
    f: FighterState;
    o: FighterState;
    m: MoveDef;
    id: MoveId;
    zone: HurtZone;
    at: Vec;
    power: number;
    counter: boolean;
    blocked: boolean;
  }[] = [];
  for (const f of s.fighters) {
    const a = f.action;
    if (a.kind !== 'attack' || a.hit) continue;
    const m = MOVES[a.move];
    const ph = phases(m);
    if (a.t < ph.activeFrom || a.t >= ph.activeTo) continue;
    const o = s.fighters[1 - f.id]!;
    if (o.ragdoll) continue;
    if (o.action.kind === 'dodge' && o.action.t <= DODGE_INVULN) {
      // Slipped (through the attack or out of its reach): it's spent, and the defender gets a counter window.
      a.hit = true;
      f.combo = 0;
      o.counter = COUNTER_TICKS;
      s.events.push({ kind: 'evade', fighter: o.id });
      continue;
    }
    const hit = sweepHit(f.prevJoints[m.limb], f.joints[m.limb], m.hitRadius, o.joints);
    if (!hit) continue;
    a.hit = true;
    const blocked = o.action.kind === 'block' && o.action.t >= BLOCK_UP;
    hits.push({
      f,
      o,
      m,
      id: a.move,
      zone: hit.zone,
      at: hit.at,
      power: a.power,
      counter: a.counter,
      blocked,
    });
  }
  for (const { f, o, m, id, zone, at, power, counter, blocked } of hits) {
    if (blocked && o.action.kind === 'block') {
      // Chip damage never knocks out.
      const damage = Math.min(Math.round(m.damage * power * BLOCK_DAMAGE), o.hp - 1);
      o.hp -= Math.max(0, damage);
      o.vx = f.facing * m.knockback.x * power * BLOCK_PUSH;
      o.action.t = BLOCK_UP;
      o.action.dur = Math.max(o.action.dur, BLOCK_UP + 14);
      o.counter = COUNTER_TICKS;
      f.combo = 0;
      s.hitstop = Math.max(s.hitstop, 3);
      s.events.push({ kind: 'block', fighter: o.id, at, damage: Math.max(0, damage), dir: f.facing });
      continue;
    }
    const bonus = (1 + Math.min(f.combo, COMBO_CAP) * COMBO_STEP) * (counter ? COUNTER_BONUS : 1);
    const damage = Math.round(m.damage * power * bonus);
    f.combo++;
    o.combo = 0;
    o.hp = Math.max(0, o.hp - damage);
    o.vx = f.facing * m.knockback.x * power;
    // Being hit interrupts a guard or dodge, and drops anything queued.
    o.queue = [];
    s.hitstop = Math.max(s.hitstop, m.hitstop + (counter ? 3 : 0));
    s.events.push({
      kind: 'hit',
      attacker: f.id,
      move: id,
      zone,
      at,
      damage,
      heavy: m.heavy || counter,
      dir: f.facing,
      combo: f.combo,
      counter,
    });
    if (o.hp > 0) {
      o.action = { kind: 'hitstun', t: 0, dur: m.hitstun, zone, strength: (m.heavy ? 1 : 0.7) * power };
      continue;
    }
    knockOut(o, f.facing * m.knockback.x * power, m.knockback.y * power, zone === 'head' ? 'head' : 'chest');
    s.hitstop = Math.max(s.hitstop, KO_HITSTOP);
    s.events.push({ kind: 'ko', fighter: o.id });
  }
  const [a, b] = s.fighters;
  if (s.winner === null && (a.hp <= 0 || b.hp <= 0)) s.winner = a.hp <= 0 ? (b.hp <= 0 ? 'draw' : 1) : 0;
}

function knockOut(o: FighterState, kx: number, ky: number, struck: JointName) {
  o.action = { kind: 'ko' };
  o.prep = null;
  o.queue = [];
  const vel = {} as Record<JointName, Vec>;
  for (const k of JOINTS) {
    const boost = k === struck ? 1.4 : k === 'neck' || k === 'chest' ? 0.9 : 0.45;
    vel[k] = v(
      (o.joints[k].x - o.prevJoints[k].x) * TICK_HZ + kx * boost,
      (o.joints[k].y - o.prevJoints[k].y) * TICK_HZ + ky * boost,
    );
  }
  o.ragdoll = startRagdoll(o.joints, vel);
}

/** True while `f` is visibly preparing an attack: charging one by typing, or in a manual windup. */
export function telegraphing(f: FighterState): boolean {
  const a = f.action;
  if (a.kind === 'attack') return !a.hit && a.t < phases(MOVES[a.move]).activeFrom;
  return f.prep !== null && a.kind !== 'ko';
}

/** For renderers and debug overlays: the attacking limb and whether its hitbox is live. */
export function attackInfo(
  f: FighterState,
): { limb: Limb; radius: number; live: boolean; striking: boolean } | null {
  const a = f.action;
  if (a.kind !== 'attack') return null;
  const m = MOVES[a.move];
  const ph = phases(m);
  return {
    limb: m.limb,
    radius: m.hitRadius,
    live: !a.hit && a.t >= ph.activeFrom && a.t < ph.activeTo,
    striking: a.t >= ph.strikeAt && a.t < ph.recoverAt,
  };
}
