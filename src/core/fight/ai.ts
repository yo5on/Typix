import { seededRng } from '../textgen/generate';
import type { MoveId } from './moves';
import { telegraphing, type FighterId, type FightInput, type FightState } from './sim';

export type Difficulty = 'easy' | 'normal' | 'hard';

interface Level {
  /** Ticks between seeing an attack coming and reacting to it. */
  reaction: number;
  /** Chance to defend a telegraphed attack, and the share of those defences upgraded to a dodge. */
  defend: number;
  dodge: number;
  /** Ticks the AI spends charging an attack. It charges like a typist, so the player always sees it coming. */
  charge: number;
  /** Rest between attacks, in ticks. */
  rest: [number, number];
  /** Chance to punish right after its own block or dodge. */
  counter: number;
  /** Attack power, like a typist's accuracy (0.7–1). */
  power: number;
  /** Share of heavy moves. */
  heavy: number;
}

export const AI_LEVELS: Record<Difficulty, Level> = {
  easy: {
    reaction: 24,
    defend: 0.2,
    dodge: 0.2,
    charge: 100,
    rest: [80, 150],
    counter: 0.2,
    power: 0.8,
    heavy: 0.25,
  },
  normal: {
    reaction: 12,
    defend: 0.55,
    dodge: 0.4,
    charge: 65,
    rest: [35, 75],
    counter: 0.6,
    power: 0.95,
    heavy: 0.5,
  },
  hard: {
    reaction: 6,
    defend: 0.7,
    dodge: 0.5,
    charge: 55,
    rest: [25, 55],
    counter: 0.85,
    power: 1,
    heavy: 0.65,
  },
};

const LIGHT: MoveId[] = ['jab', 'cross'];
const HEAVY: MoveId[] = ['hook', 'frontKick', 'uppercut', 'roundhouse'];
/** Gives up holding a guard against a charge that never comes after this long. */
const PATIENCE = 150;

/**
 * A simple opponent. It only sends the same inputs a player can, and it is deterministic for a given seed and
 * fight, so AI fights replay exactly.
 *
 * - Attacks by charging then releasing, exactly like typing a word, so every attack is telegraphed.
 * - Reads the opponent's charge: after its reaction time it may raise its guard and hold it, and at the moment
 *   of release it may upgrade the guard to a dodge.
 * - After a successful block or dodge it may counterattack with a quick move.
 * - Distance is kept by the sim's footwork: the AI walks in after knockback or a dodge.
 *
 * Relaxed pacing: it charges 1.8× more slowly and rests 1.6× longer between attacks, so there is time to read
 * every attack and answer it.
 */
export class FightAi {
  private rng: () => number;
  private plan: { move: MoveId; t: number; dur: number } | null = null;
  private rest: number;
  private seen = 0;
  private defend: 'block' | 'dodge' | null = null;
  private guarded = 0;
  private counterRolled = false;

  constructor(
    readonly fighter: FighterId,
    readonly level: Difficulty,
    seed: number,
    readonly relaxed = false,
  ) {
    this.rng = seededRng(seed);
    this.rest = 60;
  }

  /** Call once per tick, before `step`; returns this tick's inputs. */
  think(s: Readonly<FightState>): FightInput[] {
    const me = s.fighters[this.fighter];
    const foe = s.fighters[this.fighter === 0 ? 1 : 0];
    if (s.winner !== null || s.hitstop > 0 || me.action.kind === 'ko') return [];
    const L = AI_LEVELS[this.level];
    const fighter = this.fighter;
    const out: FightInput[] = [];

    // Defence: notice the threat, react after a delay, hold the guard while it lasts.
    const threat = telegraphing(foe) && (foe.action.kind === 'attack' || (foe.prep?.charge ?? 0) >= 0.4);
    if (!threat) {
      this.seen = 0;
      this.defend = null;
      this.guarded = 0;
    } else if (++this.seen === L.reaction) {
      this.defend = this.rng() < L.defend ? (this.rng() < L.dodge ? 'dodge' : 'block') : null;
      if (this.defend && this.plan) {
        this.plan = null;
        out.push({ fighter, kind: 'cancel' });
      }
    }
    if (this.defend && ++this.guarded > PATIENCE) this.defend = null;
    if (this.defend) {
      const released = foe.action.kind === 'attack';
      out.push({ fighter, kind: released && this.defend === 'dodge' ? 'dodge' : 'block' });
      return out;
    }

    // Counter: a quick light move right after its own block or dodge.
    if (me.counter > 0 && !this.counterRolled && me.action.kind === 'idle') {
      this.counterRolled = true;
      if (this.rng() < L.counter) this.plan = { move: this.pick(LIGHT), t: 0, dur: 6 };
    }
    if (me.counter === 0) this.counterRolled = false;

    const idle = me.action.kind === 'idle';
    if (idle && this.rest > 0) this.rest--;
    if (!this.plan && idle && this.rest <= 0 && foe.action.kind !== 'ko') {
      const heavy = this.rng() < L.heavy;
      this.plan = {
        move: this.pick(heavy ? HEAVY : LIGHT),
        t: 0,
        dur: Math.round(
          L.charge * (this.relaxed ? 1.8 : 1) * (heavy ? 1.2 : 0.8) * (0.85 + this.rng() * 0.3),
        ),
      };
    }

    if (this.plan) {
      const p = this.plan;
      // Charging pauses while stunned, like a typist who keeps the word but can't throw it yet.
      if (idle) p.t++;
      if (p.t >= p.dur) {
        out.push({ fighter, kind: 'release', move: p.move, power: L.power });
        this.plan = null;
        const [lo, hi] = L.rest;
        this.rest = Math.round(lo + this.rng() * (hi - lo)) * (this.relaxed ? 1.6 : 1);
      } else out.push({ fighter, kind: 'charge', move: p.move, charge: p.t / p.dur });
    }
    return out;
  }

  private pick(from: MoveId[]): MoveId {
    return from[Math.floor(this.rng() * from.length)] ?? from[0]!;
  }
}
