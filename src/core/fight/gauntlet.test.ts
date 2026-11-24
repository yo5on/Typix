import { describe, expect, it } from 'vitest';
import { AI_LEVELS, scaleLevel } from './ai';
import { enemyHp, KO_BONUS, pointsFor, tierFor, weaponFor, weaponPower } from './gauntlet';
import { MAX_HP } from './sim';

describe('gauntlet', () => {
  it('scores player damage and knockouts, never the enemy’s', () => {
    const at = { x: 0, y: 1 };
    expect(
      pointsFor([
        { kind: 'hit', attacker: 0, move: 'jab', zone: 'head', at, damage: 8, heavy: false, dir: 1, combo: 1, counter: false },
        { kind: 'hit', attacker: 1, move: 'jab', zone: 'head', at, damage: 9, heavy: false, dir: -1, combo: 1, counter: false },
        { kind: 'block', fighter: 1, at, damage: 2, dir: 1 },
        { kind: 'ko', fighter: 1 },
        { kind: 'ko', fighter: 0 },
      ]),
    ).toBe(8 + 2 + KO_BONUS);
  });

  it('gets stronger every 100 points, and arms enemies at higher tiers', () => {
    expect([0, 99, 100, 250].map(tierFor)).toEqual([0, 0, 1, 2]);
    expect(enemyHp(0)).toBe(MAX_HP);
    expect(enemyHp(3)).toBeGreaterThan(enemyHp(1));
    expect([0, 1, 2, 3, 4, 9].map(weaponFor)).toEqual([null, null, 'stick', 'stick', 'sword', 'sword']);
    expect(weaponPower(4)).toBeGreaterThan(weaponPower(2));
    const base = AI_LEVELS.normal;
    const t5 = scaleLevel(base, 5);
    expect(t5.power).toBeGreaterThan(base.power);
    expect(t5.charge).toBeLessThan(base.charge);
    expect(scaleLevel(base, 0)).toEqual({ ...base, power: base.power });
    expect(scaleLevel(base, 99).power).toBeLessThanOrEqual(1.8);
  });
});
