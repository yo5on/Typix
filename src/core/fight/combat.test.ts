import { describe, expect, it } from 'vitest';
import { enCommonWords } from '../../content/words/en-common';
import { seededRng } from '../textgen/generate';
import { FightAi, type Difficulty } from './ai';
import { MOVES, type MoveId } from './moves';
import { ARENA_HALF, startRagdoll, stepRagdoll } from './ragdoll';
import {
  BLOCK_TICKS,
  createFight,
  MAX_HP,
  QUEUE_MAX,
  step,
  type FightEvent,
  type FightInput,
  type FightState,
} from './sim';
import { BONE_LIST, dist, JOINTS, v, type JointName, type Vec } from './skeleton';
import { TypingFighter, wordPickers } from './typingAttack';

const TICK_MS = 1000 / 60;

/** Steps until `done` (or `max` ticks), collecting every event. */
function runUntil(
  s: FightState,
  done: (s: FightState) => boolean,
  max: number,
  inputs?: (s: FightState) => FightInput[],
) {
  const events: FightEvent[] = [];
  for (let i = 0; i < max && !done(s); i++) {
    s = step(s, inputs?.(s) ?? []);
    events.push(...s.events);
  }
  return { s, events };
}

/**
 * A scripted human: types the current prompt at `msPerKey` (±20 %), makes a typo with probability `typo`, and
 * needs `reactionMs` to notice a new defence prompt. Keys arrive between ticks like real key events.
 */
function typist(tf: TypingFighter, seed: number, msPerKey: number, reactionMs: number, typo: number) {
  const rng = seededRng(seed);
  let nextAt = 0;
  let lastDefense: unknown = null;
  return (s: FightState): FightInput[] => {
    const out = tf.update(s);
    const now = s.tick * TICK_MS;
    if (tf.defense && tf.defense !== lastDefense) nextAt = Math.max(nextAt, now + reactionMs);
    lastDefense = tf.defense;
    if (s.winner === null && now >= nextAt) {
      const session = tf.defense?.session ?? tf.attack.session;
      const want = session.target[session.pos]!;
      const key = rng() < typo ? (want === 'q' ? 'z' : 'q') : want;
      out.push(...tf.key(key, now));
      nextAt = now + msPerKey * (0.8 + rng() * 0.4);
    }
    return out;
  };
}

interface DuelResult {
  winner: FightState['winner'];
  ticks: number;
  maxCombo: number;
  blocks: number;
  evades: number;
  counters: number;
  state: FightState;
}

/** The player (a scripted typist, fighter 0) against the AI (fighter 1), from the walk-in to the KO. */
function duel(
  level: Difficulty,
  seed: number,
  opts: { msPerKey?: number; relaxed?: boolean } = {},
): DuelResult {
  const words = wordPickers(enCommonWords, seededRng(seed * 7 + 1));
  const tf = new TypingFighter(0, words);
  const player = typist(tf, seed * 13 + 5, opts.msPerKey ?? 220, 350, 0.05);
  const ai = new FightAi(1, level, seed, opts.relaxed);
  let s = createFight({ gap: 2.6 });
  const r = { maxCombo: 0, blocks: 0, evades: 0, counters: 0 };
  const limit = 60 * 60 * 4;
  while (s.tick < limit && s.winner === null) {
    s = step(s, [...player(s), ...ai.think(s)]);
    for (const e of s.events) {
      if (e.kind === 'hit') {
        r.maxCombo = Math.max(r.maxCombo, e.combo);
        if (e.counter) r.counters++;
      }
      if (e.kind === 'block') r.blocks++;
      if (e.kind === 'evade') r.evades++;
    }
  }
  return { ...r, winner: s.winner, ticks: s.tick, state: s };
}

describe('defence', () => {
  /** Fighter 1 throws `move` at fighter 0, who sends `defend` every tick from the start. */
  function defended(defend: 'block' | 'dodge' | null, move: MoveId = 'cross') {
    let s = createFight();
    s = step(s, [{ fighter: 1, kind: 'attack', move }]);
    let sentDodge = false;
    return runUntil(
      s,
      (x) => x.tick > 80,
      200,
      (x) => {
        if (defend === 'block') return [{ fighter: 0, kind: 'block' }];
        // Dodge as the strike starts, like the typing defence does.
        if (defend === 'dodge' && !sentDodge && x.fighters[1].action.kind === 'attack') {
          const a = x.fighters[1].action;
          if (a.t >= MOVES[move].windupTicks - 1) {
            sentDodge = true;
            return [{ fighter: 0, kind: 'dodge' }];
          }
        }
        return [];
      },
    );
  }

  it('a held block turns a hit into chip damage and opens a counter window', () => {
    const { s, events } = defended('block');
    const block = events.find((e) => e.kind === 'block');
    expect(block).toBeDefined();
    expect(events.some((e) => e.kind === 'hit')).toBe(false);
    expect(s.fighters[0].hp).toBe(MAX_HP - Math.round(MOVES.cross.damage * 0.2));
  });

  it('a dodge slips the attack entirely', () => {
    const { s, events } = defended('dodge');
    expect(events.some((e) => e.kind === 'evade')).toBe(true);
    expect(s.fighters[0].hp).toBe(MAX_HP);
  });

  it('an undefended attack lands in full', () => {
    expect(defended(null).s.fighters[0].hp).toBe(MAX_HP - MOVES.cross.damage);
  });

  it('a counter after a block deals bonus damage', () => {
    const blocked = runUntil(
      createFight(),
      (x) => x.events.some((e) => e.kind === 'block'),
      200,
      (x) =>
        x.tick === 0 ? [{ fighter: 1, kind: 'attack', move: 'cross' }] : [{ fighter: 0, kind: 'block' }],
    ).s;
    expect(blocked.fighters[0].counter).toBeGreaterThan(0);
    // Let the guard drop (counter window still open), then strike back.
    const ready = runUntil(blocked, (x) => x.fighters[0].action.kind === 'idle', 60).s;
    const { events } = runUntil(
      step(ready, [{ fighter: 0, kind: 'release', move: 'jab', power: 1 }]),
      () => false,
      60,
    );
    expect(events.find((e) => e.kind === 'hit')).toMatchObject({
      counter: true,
      damage: Math.round(MOVES.jab.damage * 1.5),
    });
  });

  it('block input only holds the guard for a short while once it stops', () => {
    let s = step(createFight(), [{ fighter: 0, kind: 'block' }]);
    expect(s.fighters[0].action.kind).toBe('block');
    for (let i = 0; i < BLOCK_TICKS + 1; i++) s = step(s);
    expect(s.fighters[0].action.kind).toBe('idle');
  });
});

describe('queued attacks and combos', () => {
  it(`rapid releases queue up to ${QUEUE_MAX} attacks and fire them in order`, () => {
    const moves: MoveId[] = ['jab', 'cross', 'hook', 'uppercut', 'roundhouse'];
    const first = step(
      createFight(),
      moves.map((move) => ({ fighter: 0, kind: 'release', move, power: 1 })),
    );
    const { events } = runUntil(first, () => false, 240);
    const released = [...first.events, ...events].filter((e) => e.kind === 'release').map((e) => e.move);
    // One starts at once, QUEUE_MAX wait; the rest are dropped.
    expect(released).toEqual(moves.slice(0, QUEUE_MAX + 1));
    const hits = events.filter((e) => e.kind === 'hit');
    expect(hits.length).toBe(QUEUE_MAX + 1);
    expect(hits.map((e) => e.kind === 'hit' && e.combo)).toEqual([1, 2, 3, 4]);
  });

  it('a queued attack cuts the previous recovery short, so combos flow', () => {
    const first = step(createFight(), [
      { fighter: 0, kind: 'release', move: 'jab', power: 1 },
      { fighter: 0, kind: 'release', move: 'jab', power: 1 },
    ]);
    const second = runUntil(first, (x) => x.events.some((e) => e.kind === 'release'), 120).s;
    const { strikeTicks, holdTicks, recoverTicks } = MOVES.jab;
    // A released jab skips its windup, so without cancelling the second would start after the whole remainder.
    expect(second.tick - first.tick).toBeLessThan(strikeTicks + holdTicks + recoverTicks);
  });

  it('a whiff breaks the combo', () => {
    let s = createFight();
    s = runUntil(step(s, [{ fighter: 0, kind: 'release', move: 'jab', power: 1 }]), () => false, 40).s;
    expect(s.fighters[0].combo).toBe(1);
    s.fighters[1].x = 3.4; // out of reach, even with the step-in
    s = runUntil(step(s, [{ fighter: 0, kind: 'release', move: 'jab', power: 1 }]), () => false, 40).s;
    expect(s.fighters[0].combo).toBe(0);
  });

  it('a double knockout is a draw, not a win for either side', () => {
    let s = createFight();
    s.fighters[0].hp = 3;
    s.fighters[1].hp = 3;
    s = runUntil(
      step(s, [
        { fighter: 0, kind: 'release', move: 'jab', power: 1 },
        { fighter: 1, kind: 'release', move: 'jab', power: 1 },
      ]),
      (x) => x.winner !== null,
      60,
    ).s;
    expect(s.winner).toBe('draw');
  });
});

describe('AI opponent', () => {
  it('is deterministic for a seed', () => {
    const a = duel('normal', 3);
    const b = duel('normal', 3);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('approaches from the walk-in distance, attacks, blocks, dodges and counters', () => {
    const results = [1, 2, 3, 4, 5, 6].map((seed) => duel('hard', seed));
    expect(results.reduce((n, r) => n + r.blocks, 0)).toBeGreaterThan(0);
    expect(results.reduce((n, r) => n + r.evades, 0)).toBeGreaterThan(0);
    expect(results.reduce((n, r) => n + r.counters, 0)).toBeGreaterThan(0);
    // Walked in from 2.6 m apart and kept fighting distance (never stuck at the walls).
    for (const r of results) for (const f of r.state.fighters) expect(Math.abs(f.x)).toBeLessThan(ARENA_HALF);
  }, 60_000);

  const SEEDS = Array.from({ length: 8 }, (_, i) => i + 1);
  const outcome = (level: Difficulty, opts?: { msPerKey?: number; relaxed?: boolean }) => {
    const rs = SEEDS.map((seed) => duel(level, seed, opts));
    return { rs, wins: rs.filter((r) => r.winner === 0).length };
  };

  it('every sustained fight ends in a knockout well within four minutes, and harder levels win more', () => {
    const levels = (['easy', 'normal', 'hard'] as const).map((l) => outcome(l));
    for (const { rs } of levels)
      for (const r of rs) {
        expect(r.winner).not.toBeNull();
        expect(r.ticks).toBeLessThan(60 * 60 * 4);
      }
    const [easy, normal, hard] = levels.map((l) => l.wins);
    expect(easy).toBeGreaterThanOrEqual(normal!);
    expect(normal).toBeGreaterThanOrEqual(hard!);
    expect(easy).toBeGreaterThan(hard!);
  }, 120_000);

  it('relaxed pacing gives a slow typist (≈30 WPM) a fair chance', () => {
    const relaxed = outcome('normal', { msPerKey: 400, relaxed: true }).wins;
    const realtime = outcome('normal', { msPerKey: 400 }).wins;
    expect(relaxed).toBeGreaterThan(realtime);
    expect(relaxed).toBeGreaterThan(0);
  }, 120_000);
});

describe('ragdoll stability', () => {
  const lengthOk = (pos: Record<JointName, Vec>) =>
    BONE_LIST.every(([a, b, len]) => Math.abs(dist(pos[a], pos[b]) - len) < len * 0.12);
  const finite = (pos: Record<JointName, Vec>) => JOINTS.every((k) => Number.isFinite(pos[k].x + pos[k].y));

  it('100 knockouts with varied moves, power and positions (walls included) all settle cleanly', () => {
    const rng = seededRng(99);
    const ids = Object.keys(MOVES) as MoveId[];
    for (let i = 0; i < 100; i++) {
      let s = createFight();
      const shift = (rng() - 0.5) * 2 * (ARENA_HALF - 1); // some fights right against a wall
      for (const f of s.fighters) {
        f.x += shift;
        for (const k of JOINTS) {
          f.joints[k] = v(f.joints[k].x + shift, f.joints[k].y);
          f.prevJoints[k] = f.joints[k];
        }
        f.feet.F.x += shift;
        f.feet.B.x += shift;
      }
      const loser = i % 2 === 0 ? 1 : 0;
      s.fighters[loser].hp = 1;
      const move = ids[i % ids.length]!;
      s = step(s, [{ fighter: loser === 1 ? 0 : 1, kind: 'release', move, power: 0.7 + rng() * 0.3 }]);
      s = runUntil(s, (x) => x.winner !== null, 120).s;
      expect(s.winner, `knockout ${i}`).toBe(loser === 1 ? 0 : 1);
      for (let t = 0; t < 480; t++) s = step(s);
      const body = s.fighters[loser];
      const r = body.ragdoll!;
      expect(finite(r.pos), `knockout ${i} finite`).toBe(true);
      expect(lengthOk(r.pos), `knockout ${i} bone lengths`).toBe(true);
      for (const k of JOINTS) {
        expect(r.pos[k].y).toBeGreaterThanOrEqual(0);
        expect(Math.abs(r.pos[k].x)).toBeLessThanOrEqual(ARENA_HALF);
      }
      // At rest after 8 s: nothing still sliding or twitching.
      const moving = Math.max(...JOINTS.map((k) => dist(body.joints[k], body.prevJoints[k])));
      expect(moving, `knockout ${i} at rest`).toBeLessThan(0.002);
      expect(body.joints.head.y).toBeLessThan(0.5);
    }
  }, 60_000);

  it('survives extreme launch velocities', () => {
    const rng = seededRng(5);
    const base = createFight().fighters[0].joints;
    for (let i = 0; i < 100; i++) {
      const vel = {} as Record<JointName, Vec>;
      for (const k of JOINTS) vel[k] = v((rng() - 0.5) * 60, (rng() - 0.3) * 40);
      const r = startRagdoll(base, vel);
      for (let t = 0; t < 600; t++) stepRagdoll(r);
      expect(finite(r.pos)).toBe(true);
      expect(lengthOk(r.pos)).toBe(true);
      for (const k of JOINTS) expect(r.pos[k].y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('animation smoothness', () => {
  it('outside strikes, hit snaps and knockouts, no joint jumps between ticks', () => {
    let worst = { d: 0, joint: '', action: '' };
    for (const seed of [1, 2, 3]) {
      const words = wordPickers(enCommonWords, seededRng(seed));
      const tf = new TypingFighter(0, words);
      const player = typist(tf, seed, 180, 300, 0.05);
      const ai = new FightAi(1, 'hard', seed);
      let s = createFight({ gap: 2.6 });
      while (s.winner === null && s.tick < 60 * 120) {
        s = step(s, [...player(s), ...ai.think(s)]);
        for (const f of s.fighters) {
          const a = f.action;
          const fast =
            f.ragdoll ||
            (a.kind === 'attack' && a.t < MOVES[a.move].windupTicks + MOVES[a.move].strikeTicks + 2) ||
            (a.kind === 'hitstun' && a.t < 5) ||
            Math.abs(f.vx) > 1;
          if (fast) continue;
          for (const k of JOINTS) {
            const d = dist(f.joints[k], f.prevJoints[k]);
            if (d > worst.d)
              worst = { d, joint: k, action: a.kind === 'attack' ? `${a.move}@${a.t}` : a.kind };
          }
        }
      }
    }
    // Kicks retract at up to ~0.19 m per tick; elbow and knee flips (the bug this guards) were 0.4–0.74 m.
    expect(worst.d, JSON.stringify(worst)).toBeLessThan(0.22);
  }, 60_000);
});
