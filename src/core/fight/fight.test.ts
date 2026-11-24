import { describe, expect, it } from 'vitest';
import { pointSegment, segmentDistance, sweepHit } from './collision';
import { MOVE_IDS, MOVES, moveForWord, phases, type MoveId } from './moves';
import { BONES, dist, solveIK, solvePose, v } from './skeleton';
import { DODGE, GUARD, REACTIONS, STANCE } from './moves';
import { createFight, MAX_HP, step, type FightInput, type FightState } from './sim';
import { TypingAttack, powerFor } from './typingAttack';

type Script = Record<number, FightInput[]>;

function run(script: Script, ticks: number, from = createFight()): FightState {
  let s = from;
  for (let i = 0; i < ticks; i++) s = step(s, script[s.tick + 1] ?? []);
  return s;
}

/** Runs one attack from fighter 0 and returns every event it produced. */
function attackEvents(move: MoveId, ticks = 90) {
  let s = createFight();
  const events = [];
  for (let i = 0; i < ticks; i++) {
    s = step(s, i === 0 ? [{ fighter: 0, kind: 'attack', move }] : []);
    events.push(...s.events);
  }
  return { s, events };
}

describe('skeleton', () => {
  it('IK keeps bone lengths and reaches reachable targets', () => {
    const root = v(0, 1);
    const target = v(0.4, 0.6);
    const { mid, end } = solveIK(root, target, 0.45, 0.45, 1);
    expect(dist(root, mid)).toBeCloseTo(0.45, 5);
    expect(dist(mid, end)).toBeCloseTo(0.45, 5);
    expect(dist(end, target)).toBeLessThan(1e-4);
    expect(mid.x).toBeGreaterThan(0.2); // bends toward the preferred side
  });

  it('IK clamps unreachable targets to a straight limb', () => {
    const { end } = solveIK(v(0, 0), v(5, 0), 0.3, 0.3, -1);
    expect(dist(v(0, 0), end)).toBeCloseTo(0.6, 3);
  });

  it('every move pose solves to valid bone lengths', () => {
    for (const id of MOVE_IDS) {
      for (const p of [MOVES[id].windup, MOVES[id].strike]) {
        const j = solvePose(p);
        expect(dist(j.chest, j.elbowF)).toBeCloseTo(BONES.upperArm, 4);
        expect(dist(j.pelvis, j.kneeB)).toBeCloseTo(BONES.thigh, 4);
      }
    }
  });

  it('every pose keeps the hands clear of the shoulder, so elbows never spin around', () => {
    const poses = [STANCE, GUARD, DODGE, ...Object.values(REACTIONS)];
    for (const id of MOVE_IDS) poses.push(MOVES[id].windup, MOVES[id].strike);
    for (const p of poses) {
      const j = solvePose(p);
      expect(dist(j.chest, p.handF)).toBeGreaterThan(0.15);
      expect(dist(j.chest, p.handB)).toBeGreaterThan(0.15);
    }
  });
});

describe('collision', () => {
  it('measures segment distances', () => {
    expect(pointSegment(v(0, 1), v(-1, 0), v(1, 0))).toBeCloseTo(1);
    expect(pointSegment(v(3, 0), v(-1, 0), v(1, 0))).toBeCloseTo(2);
    expect(segmentDistance(v(-1, -1), v(1, 1), v(-1, 1), v(1, -1))).toBe(0); // crossing
    expect(segmentDistance(v(0, 0), v(1, 0), v(0, 2), v(1, 2))).toBeCloseTo(2);
  });

  const target = solvePose(STANCE);

  it('hits the head and the body, and misses outside reach', () => {
    expect(sweepHit(v(1, target.head.y), v(target.head.x + 0.15, target.head.y), 0.05, target)?.zone).toBe(
      'head',
    );
    expect(sweepHit(v(1, 1.1), v(target.pelvis.x + 0.15, 1.1), 0.05, target)?.zone).toBe('body');
    expect(sweepHit(v(1, 1.1), v(0.6, 1.1), 0.05, target)).toBeNull();
    expect(sweepHit(v(0, 0.2), v(0.2, 0.2), 0.05, target)).toBeNull(); // below the hurtboxes
  });

  it('a fast limb that passes through the target between ticks still hits (no tunnelling)', () => {
    // 1.6 m in one tick is faster than any move; both endpoints are clear of the torso.
    expect(sweepHit(v(-0.8, 1.1), v(0.8, 1.1), 0.05, target)).not.toBeNull();
  });
});

describe('combat sim', () => {
  it('is deterministic: the same inputs give the same state', () => {
    const script: Script = {
      3: [{ fighter: 0, kind: 'attack', move: 'cross' }],
      20: [{ fighter: 1, kind: 'attack', move: 'jab' }],
      40: [{ fighter: 0, kind: 'charge', move: 'roundhouse', charge: 0.5 }],
      55: [{ fighter: 0, kind: 'typo' }],
      70: [{ fighter: 0, kind: 'release', move: 'roundhouse', power: 0.9 }],
    };
    const a = run(script, 240);
    const b = run(script, 240);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(run({}, 240))).not.toBe(JSON.stringify(a));
  });

  it('never mutates the previous state', () => {
    const s0 = createFight();
    const before = JSON.stringify(s0);
    step(s0, [{ fighter: 0, kind: 'attack', move: 'jab' }]);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it.each(MOVE_IDS)('%s connects at fighting distance, exactly once', (move) => {
    const { s, events } = attackEvents(move);
    const hits = events.filter((e) => e.kind === 'hit');
    expect(hits).toHaveLength(1);
    expect(s.fighters[1].hp).toBe(MAX_HP - MOVES[move].damage);
  });

  it('punches land on the head, front kicks on the body', () => {
    const zone = (m: MoveId) => attackEvents(m).events.find((e) => e.kind === 'hit');
    expect(zone('jab')).toMatchObject({ zone: 'head' });
    expect(zone('cross')).toMatchObject({ zone: 'head' });
    expect(zone('frontKick')).toMatchObject({ zone: 'body' });
  });

  it('steps in to land an attack started a little out of range', () => {
    let s = createFight();
    s.fighters[0].x -= 0.5;
    s = step(s, [{ fighter: 0, kind: 'attack', move: 'jab' }]);
    for (let i = 0; i < 40; i++) s = step(s);
    expect(s.fighters[1].hp).toBe(MAX_HP - MOVES.jab.damage);
  });

  it('hits only during active frames', () => {
    const m = MOVES.cross;
    const ph = phases(m);
    let s = createFight();
    let hitTick = -1;
    for (let i = 0; i < 90 && hitTick < 0; i++) {
      s = step(s, i === 0 ? [{ fighter: 0, kind: 'attack', move: 'cross' }] : []);
      const a = s.fighters[0].action;
      if (s.events.some((e) => e.kind === 'hit') && a.kind === 'attack') hitTick = a.t;
    }
    expect(hitTick).toBeGreaterThanOrEqual(ph.activeFrom);
    expect(hitTick).toBeLessThan(ph.activeTo);
  });

  it('misses when the defender is out of reach', () => {
    let s = createFight();
    s.fighters[1].x = 3;
    s.fighters[1].joints = Object.fromEntries(
      Object.entries(s.fighters[1].joints).map(([k, p]) => [k, v(p.x + 2.45, p.y)]),
    ) as (typeof s.fighters)[1]['joints'];
    s = step(s, [{ fighter: 0, kind: 'attack', move: 'jab' }]);
    for (let i = 0; i < 20; i++) s = step(s);
    expect(s.fighters[1].hp).toBe(MAX_HP);
  });

  it('impacts freeze both fighters (hitstop), then knock the defender back', () => {
    let s = createFight();
    s = step(s, [{ fighter: 0, kind: 'attack', move: 'cross' }]);
    while (!s.events.some((e) => e.kind === 'hit')) s = step(s);
    expect(s.hitstop).toBe(MOVES.cross.hitstop);
    const frozen = JSON.stringify(s.fighters);
    const x1 = s.fighters[1].x;
    s = step(s);
    expect(JSON.stringify(s.fighters.map((f) => f.joints))).toBe(
      JSON.stringify((JSON.parse(frozen) as FightState['fighters']).map((f) => f.joints)),
    );
    for (let i = 0; i < MOVES.cross.hitstop + 5; i++) s = step(s);
    expect(s.fighters[1].x).toBeGreaterThan(x1);
    expect(s.fighters[1].action.kind).toBe('hitstun');
  });

  it('a knockout turns the loser into a ragdoll that falls and comes to rest', () => {
    let s = createFight();
    s.fighters[1].hp = 5;
    s = step(s, [{ fighter: 0, kind: 'attack', move: 'uppercut' }]);
    for (let i = 0; i < 400; i++) s = step(s);
    const loser = s.fighters[1];
    expect(s.winner).toBe(0);
    expect(loser.ragdoll).not.toBeNull();
    expect(loser.joints.head.y).toBeLessThan(0.4); // lying down
    for (const p of Object.values(loser.joints)) expect(p.y).toBeGreaterThanOrEqual(0);
  });
});

describe('typing integration', () => {
  it('picks heavier moves for longer words', () => {
    expect(moveForWord('a')).toBe('jab');
    expect(moveForWord('word')).toBe('cross');
    expect(moveForWord('anticipate')).toBe('roundhouse');
  });

  it('every correct key raises the charge, typos never lower it, the last key releases', () => {
    const t = new TypingAttack('fight', 0);
    const charges: number[] = [];
    let release: FightInput | undefined;
    for (const [i, key] of ['f', 'i', 'x', 'g', 'h', 'q', 't'].entries()) {
      for (const input of t.key(key, i * 100)) {
        if (input.kind === 'charge') charges.push(input.charge);
        if (input.kind === 'release') release = input;
      }
    }
    expect(charges).toEqual([0.2, 0.4, 0.6, 0.8]);
    expect(t.mistakes).toBe(2);
    expect(release).toMatchObject({ kind: 'release', move: 'hook' });
    expect(release?.kind === 'release' && release.power).toBeCloseTo(powerFor(5 / 7));
    expect(powerFor(1)).toBe(1);
    expect(powerFor(0)).toBeGreaterThanOrEqual(0.7);
  });

  it('a typed word strikes with the charged move and accuracy-scaled damage', () => {
    let s = createFight();
    const t = new TypingAttack('hello', 0); // 5 letters → hook
    const keys = ['h', 'e', 'z', 'l', 'l', 'o'];
    for (const [i, key] of keys.entries()) {
      s = step(s, t.key(key, i * 120));
      for (let k = 0; k < 6; k++) s = step(s);
    }
    for (let i = 0; i < 60; i++) s = step(s);
    expect(s.fighters[1].hp).toBe(MAX_HP - Math.round(MOVES.hook.damage * powerFor(5 / 6)));
  });
});
