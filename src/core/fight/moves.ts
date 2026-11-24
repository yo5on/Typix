import { v, type Pose, type Vec } from './skeleton';

/**
 * Move definitions are plain data: key poses, phase lengths in ticks (60 per second) and hit properties.
 * The sim reads nothing else, so tuning a move never needs code changes.
 * All numbers are starting values to tune by playtesting.
 */

/** Orthodox fighting stance, facing +x: knees bent, lead hand forward, rear hand by the chin. */
export const STANCE: Pose = {
  hip: v(0.02, 0.78),
  lean: 0.12,
  head: 0.12,
  handF: v(0.32, 1.42),
  handB: v(0.24, 1.4),
  footF: v(0.3, 0),
  footB: v(-0.27, 0),
};

export const pose = (over: Partial<Pose>): Pose => ({ ...STANCE, ...over });

export type Limb = 'handF' | 'handB' | 'footF' | 'footB';
export type Reaction = 'head' | 'body';

export interface MoveDef {
  id: string;
  name: string;
  /** The limb whose tip carries the hitbox. */
  limb: Limb;
  /** End of anticipation (the pose typing builds toward) and full extension. */
  windup: Pose;
  strike: Pose;
  windupTicks: number;
  strikeTicks: number;
  holdTicks: number;
  recoverTicks: number;
  /** Forward step of the root during the strike, metres. */
  lunge: number;
  /** Extra offset of the striking limb at mid-strike, so hooks, uppercuts and kicks travel on curves. */
  arc?: Vec;
  hitRadius: number;
  damage: number;
  /** Knockback velocity given to the defender, m/s (x away from the attacker, y up; y only matters on KO). */
  knockback: { x: number; y: number };
  hitstun: number;
  /** Freeze frames on impact, for both fighters. */
  hitstop: number;
  heavy: boolean;
  /** Typing: words with at least this many letters pick this move (the highest match wins). */
  minLetters: number;
}

const hands = { handF: v(0.3, 1.44), handB: v(0.2, 1.38) };

export const MOVES = {
  jab: {
    id: 'jab',
    name: 'Jab',
    limb: 'handF',
    windup: pose({ hip: v(-0.02, 0.77), lean: 0.06, handF: v(0.2, 1.39) }),
    strike: pose({ hip: v(0.1, 0.77), lean: 0.24, head: 0.05, handF: v(0.8, 1.52), handB: v(0.3, 1.42) }),
    windupTicks: 6,
    strikeTicks: 4,
    holdTicks: 3,
    recoverTicks: 10,
    lunge: 0.16,
    hitRadius: 0.07,
    damage: 5,
    knockback: { x: 1.2, y: 0.5 },
    hitstun: 14,
    hitstop: 4,
    heavy: false,
    minLetters: 1,
  },
  cross: {
    id: 'cross',
    name: 'Cross',
    limb: 'handB',
    windup: pose({
      hip: v(-0.07, 0.75),
      lean: -0.06,
      head: 0.18,
      handB: v(0.06, 1.4),
      handF: v(0.36, 1.44),
    }),
    strike: pose({
      hip: v(0.16, 0.75),
      lean: 0.38,
      head: 0.02,
      handB: v(0.86, 1.52),
      handF: v(0.18, 1.38),
      footB: v(-0.22, 0),
    }),
    windupTicks: 9,
    strikeTicks: 5,
    holdTicks: 4,
    recoverTicks: 13,
    lunge: 0.14,
    hitRadius: 0.08,
    damage: 9,
    knockback: { x: 2.2, y: 1 },
    hitstun: 18,
    hitstop: 6,
    heavy: false,
    minLetters: 4,
  },
  hook: {
    id: 'hook',
    name: 'Hook',
    limb: 'handF',
    windup: pose({ hip: v(-0.05, 0.72), lean: -0.12, head: 0.2, handF: v(-0.02, 1.5), handB: hands.handB }),
    strike: pose({ hip: v(0.16, 0.74), lean: 0.42, head: 0.1, handF: v(0.72, 1.56), handB: v(0.18, 1.37) }),
    windupTicks: 11,
    strikeTicks: 5,
    holdTicks: 3,
    recoverTicks: 14,
    lunge: 0.14,
    arc: v(-0.06, 0.16),
    hitRadius: 0.1,
    damage: 11,
    knockback: { x: 2.6, y: 1.2 },
    hitstun: 20,
    hitstop: 7,
    heavy: true,
    minLetters: 5,
  },
  frontKick: {
    id: 'frontKick',
    name: 'Front kick',
    limb: 'footF',
    windup: pose({ hip: v(-0.06, 0.82), lean: -0.18, head: 0.2, footF: v(0.32, 0.42), ...hands }),
    strike: pose({ hip: v(0.02, 0.84), lean: -0.32, head: 0.28, footF: v(0.98, 0.87), handF: v(0.25, 1.37) }),
    windupTicks: 10,
    strikeTicks: 5,
    holdTicks: 4,
    recoverTicks: 14,
    lunge: 0.08,
    arc: v(-0.14, 0.14),
    hitRadius: 0.1,
    damage: 10,
    knockback: { x: 4, y: 0.8 },
    hitstun: 20,
    hitstop: 6,
    heavy: false,
    minLetters: 6,
  },
  uppercut: {
    id: 'uppercut',
    name: 'Uppercut',
    limb: 'handB',
    windup: pose({ hip: v(-0.05, 0.64), lean: 0.3, head: 0.1, handB: v(0.12, 0.94), handF: v(0.3, 1.32) }),
    strike: pose({ hip: v(0.2, 0.84), lean: 0.12, head: -0.1, handB: v(0.78, 1.54), handF: v(0.44, 1.5) }),
    windupTicks: 12,
    strikeTicks: 5,
    holdTicks: 4,
    recoverTicks: 16,
    lunge: 0.18,
    arc: v(0.14, -0.16),
    hitRadius: 0.1,
    damage: 13,
    knockback: { x: 1.6, y: 4.5 },
    hitstun: 24,
    hitstop: 8,
    heavy: true,
    minLetters: 7,
  },
  roundhouse: {
    id: 'roundhouse',
    name: 'Roundhouse',
    limb: 'footB',
    windup: pose({
      hip: v(-0.1, 0.78),
      lean: -0.12,
      head: 0.2,
      footB: v(-0.05, 0.34),
      handB: v(0.25, 1.27),
      handF: v(0.4, 1.42),
    }),
    strike: pose({
      hip: v(0.08, 0.84),
      lean: -0.6,
      head: 0.5,
      footB: v(0.98, 1.42),
      handB: v(-0.4, 1.07),
      handF: v(0.3, 1.42),
    }),
    windupTicks: 13,
    strikeTicks: 6,
    holdTicks: 4,
    recoverTicks: 22,
    lunge: 0.1,
    arc: v(-0.2, 0.22),
    hitRadius: 0.11,
    damage: 16,
    knockback: { x: 5, y: 2.5 },
    hitstun: 26,
    hitstop: 9,
    heavy: true,
    minLetters: 8,
  },
} satisfies Record<string, MoveDef>;

export type MoveId = keyof typeof MOVES;
export const MOVE_IDS = Object.keys(MOVES) as MoveId[];

/** Poses held while reacting to a hit (blended in and out by the sim). */
export const REACTIONS: Record<Reaction, Pose> = {
  head: pose({
    hip: v(-0.1, 0.76),
    lean: -0.42,
    head: -0.55,
    handF: v(0.2, 1.54),
    handB: v(-0.12, 1.28),
  }),
  body: pose({
    hip: v(-0.08, 0.66),
    lean: 0.55,
    head: 0.35,
    handF: v(0.3, 0.92),
    handB: v(0.18, 0.87),
  }),
};

/** High guard: knees sink, forearms cover the head and body. */
export const GUARD = pose({
  hip: v(-0.03, 0.73),
  lean: 0.22,
  head: 0.32,
  handF: v(0.3, 1.5),
  handB: v(0.25, 1.44),
});

/** Evasion: a quick step back with the upper body swaying away. */
export const DODGE = pose({
  hip: v(-0.16, 0.72),
  lean: -0.36,
  head: -0.12,
  handF: v(0.14, 1.4),
  handB: v(0.04, 1.33),
});

/** The move a typed word releases: longer words unlock heavier attacks. */
export function moveForWord(word: string): MoveId {
  let best: MoveId = 'jab';
  for (const id of MOVE_IDS)
    if (word.length >= MOVES[id].minLetters && MOVES[id].minLetters >= MOVES[best].minLetters) best = id;
  return best;
}

/** Phase boundaries of a move, in ticks from its start. */
export function phases(m: MoveDef) {
  const strikeAt = m.windupTicks;
  const holdAt = strikeAt + m.strikeTicks;
  const recoverAt = holdAt + m.holdTicks;
  return {
    strikeAt,
    holdAt,
    recoverAt,
    end: recoverAt + m.recoverTicks,
    /** Hitbox is live from mid-strike to the end of the hold. */
    activeFrom: strikeAt + Math.floor(m.strikeTicks / 2),
    activeTo: recoverAt,
    /** A queued attack may cut the recovery short from here, so typed combos flow into each other. */
    cancelAt: recoverAt + Math.ceil(m.recoverTicks * 0.4),
  };
}
