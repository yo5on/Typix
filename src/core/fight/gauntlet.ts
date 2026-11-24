import { MAX_HP, type FightEvent } from './sim';

/**
 * Gauntlet rules: enemies keep coming until the player is knocked out. Points come from damage dealt plus a bonus
 * per knockout, and every POINTS_PER_TIER points the next enemy is one tier stronger.
 */
export const POINTS_PER_TIER = 100;
export const KO_BONUS = 50;
/** HP the player gets back between enemies. */
export const HEAL = 20;
/** Ticks between an enemy's knockout and the next one walking in. */
export const NEXT_ENEMY_TICKS = 120;

export type Weapon = 'stick' | 'sword';
/** Stronger enemies come armed: a staff from tier 2, a sword from tier 4. */
export const weaponFor = (tier: number): Weapon | null => (tier >= 4 ? 'sword' : tier >= 2 ? 'stick' : null);
/** Extra hitting power a weapon gives. */
export const weaponPower = (tier: number) => ({ sword: 1.25, stick: 1.12, none: 1 })[weaponFor(tier) ?? 'none'];

export const tierFor =(score: number) => Math.floor(score / POINTS_PER_TIER);
export const enemyHp = (tier: number) => MAX_HP + 15 * Math.min(tier, 10);

/** Points the player (fighter 0) earns from one tick's events. */
export function pointsFor(events: readonly FightEvent[]): number {
  let n = 0;
  for (const e of events) {
    if (e.kind === 'hit' && e.attacker === 0) n += e.damage;
    else if (e.kind === 'block' && e.fighter === 1) n += e.damage;
    else if (e.kind === 'ko' && e.fighter === 1) n += KO_BONUS;
  }
  return n;
}
