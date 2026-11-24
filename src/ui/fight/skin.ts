import type { HurtZone } from '../../core/fight/collision';
import type { Joints, Vec } from '../../core/fight/skeleton';
import type { Weapon } from '../../core/fight/gauntlet';
import type { Action, FighterId } from '../../core/fight/sim';

/**
 * A skin only decides how things look. It receives read-only, already-simulated data (joints, effects) and draws
 * it; it cannot reach the sim, so every skin plays identically.
 *
 * Planned skins (Ink Duel, Shadow Fighters, Cyberpunk, Elemental, Paper Puppet, Samurai, Robots) implement this
 * same interface: per-bone styling via `fighter`, scenery via `background`, and their own trail and spark looks.
 */
export interface Skin {
  id: string;
  name: string;
  background(ctx: CanvasRenderingContext2D, cam: Camera, tick: number): void;
  fighter(ctx: CanvasRenderingContext2D, cam: Camera, f: FighterView): void;
  /** Motion trail of an attacking limb tip, oldest point first. */
  trail(ctx: CanvasRenderingContext2D, cam: Camera, points: readonly Vec[], fighter: FighterId): void;
  particle(ctx: CanvasRenderingContext2D, cam: Camera, p: Readonly<Particle>): void;
}

export interface Camera {
  /** World x at the centre of the screen. */
  cx: number;
  /** Pixels per metre. */
  scale: number;
  w: number;
  h: number;
  /** Screen y of the ground line. */
  groundY: number;
  /** Shake offset in pixels. */
  ox: number;
  oy: number;
}

export interface FighterView {
  id: FighterId;
  joints: Joints;
  facing: 1 | -1;
  action: Action['kind'];
  /** 1 right after being hit, fading to 0. */
  flash: number;
  /** Body colour (FIGHTER_COLORS unless overridden). */
  color: string;
  /** Interpolated sim tick, for idle cloth motion. */
  tick: number;
  /** Held in the lead hand (gauntlet enemies at higher tiers). */
  weapon?: Weapon;
}

export interface Particle {
  kind: 'spark' | 'dust' | 'ring';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Ticks left and total. */
  life: number;
  max: number;
  size: number;
  zone: HurtZone | null;
}

export const toScreen = (c: Camera, p: Vec) => ({
  x: c.w / 2 + (p.x - c.cx) * c.scale + c.ox,
  y: c.groundY - p.y * c.scale + c.oy,
});

/** Bones in draw order: far-side (rear) limbs first, so near limbs overlap them. */
export const DRAW_ORDER = [
  ['chest', 'elbowB', 'far'],
  ['elbowB', 'handB', 'far'],
  ['pelvis', 'kneeB', 'far'],
  ['kneeB', 'footB', 'far'],
  ['pelvis', 'chest', 'near'],
  ['chest', 'neck', 'near'],
  ['pelvis', 'kneeF', 'near'],
  ['kneeF', 'footF', 'near'],
  ['chest', 'elbowF', 'near'],
  ['elbowF', 'handF', 'near'],
] as const;

/** Player colours shared by skins that don't define their own. */
export const FIGHTER_COLORS: Record<FighterId, string> = { 0: '#e8eaed', 1: '#ff8a3d' };
