import { hurtboxes } from '../../core/fight/collision';
import { BONE_LIST, JOINTS, lerpV, type Joints, type Vec } from '../../core/fight/skeleton';
import { attackInfo, type FighterId, type FightState } from '../../core/fight/sim';
import { seededRng } from '../../core/textgen/generate';
import { toScreen, type Camera, type FighterView, type Particle, type Skin } from './skin';
import { asciiSkin } from './skins/ascii';
import { classicSkin } from './skins/classic';

export const SKINS: readonly Skin[] = [classicSkin, asciiSkin];

export interface RenderOptions {
  skin: Skin;
  /** Debug overlays. */
  skeleton: boolean;
  hitboxes: boolean;
  /** 0–1 from settings (0 when reduced motion is on). */
  shake: number;
  flash: number;
}

const TRAIL_LEN = 7;

/**
 * Draws a fight state with a skin and owns every presentation-only effect: camera, shake, zoom punch, hit flash,
 * trails and particles. It reads the sim state and never writes it.
 */
export class FightRenderer {
  private trauma = 0;
  private punch = 0;
  private screenFlash = 0;
  private flash: Record<FighterId, number> = { 0: 0, 1: 0 };
  private trails: Record<FighterId, Vec[]> = { 0: [], 1: [] };
  private particles: Particle[] = [];
  private camX = 0;
  private rng = seededRng(7);

  /** Call once per sim tick, after `step`. Effects advance with the sim, so pause and frame-step freeze them too. */
  tick(s: Readonly<FightState>) {
    for (const e of s.events) {
      if (e.kind === 'hit') {
        this.trauma = Math.min(1, this.trauma + (e.heavy ? 0.6 : 0.32));
        if (e.heavy) this.punch = 1;
        this.flash[e.attacker === 0 ? 1 : 0] = 1;
        const n = e.heavy ? 16 : 9;
        for (let i = 0; i < n; i++) {
          const a = (this.rng() - 0.5) * 1.6;
          const speed = 2 + this.rng() * (e.heavy ? 7 : 4);
          this.add(
            'spark',
            e.at,
            e.dir * Math.cos(a) * speed,
            Math.sin(a) * speed + 1,
            10 + this.rng() * 8,
            0,
            e.zone,
          );
        }
        this.add('ring', e.at, 0, 0, 12, e.heavy ? 0.55 : 0.32, e.zone);
      } else if (e.kind === 'block') {
        // A dull clack: few short sparks bouncing back toward the attacker, a small ring, little shake.
        this.trauma = Math.min(1, this.trauma + 0.15);
        for (let i = 0; i < 5; i++) {
          const a = (this.rng() - 0.5) * 2.4;
          const speed = 1.5 + this.rng() * 2;
          this.add('spark', e.at, -e.dir * Math.cos(a) * speed, Math.sin(a) * speed + 0.5, 8, 0, null);
        }
        this.add('ring', e.at, 0, 0, 8, 0.2, null);
      } else if (e.kind === 'evade') {
        const f = s.fighters[e.fighter];
        this.add('dust', f.joints.footB, -f.facing * 0.8, 0.3, 22, 0.05, null);
        this.add('dust', f.joints.footF, -f.facing * 0.5, 0.2, 18, 0.04, null);
      } else if (e.kind === 'ko') {
        this.trauma = 1;
        this.punch = 1;
        this.screenFlash = 1;
      }
    }
    const frozen = s.hitstop > 0;
    this.trauma = Math.max(0, this.trauma - (frozen ? 0.01 : 0.04));
    this.punch *= 0.88;
    this.screenFlash = Math.max(0, this.screenFlash - 0.08);
    for (const id of [0, 1] as const) this.flash[id] = Math.max(0, this.flash[id] - 0.1);

    for (const f of s.fighters) {
      // Dust from skidding feet and from ragdoll joints hitting the floor.
      if (Math.abs(f.vx) > 1.5 && s.tick % 2 === 0)
        this.add('dust', f.joints.footF, -f.vx * 0.1, 0.4, 20, 0.05, null);
      if (f.ragdoll) {
        for (const k of JOINTS) {
          const fell = f.prevJoints[k].y - f.joints[k].y;
          if (f.joints[k].y < 0.06 && fell > 0.03)
            this.add('dust', f.joints[k], 0, 0.6, 24, 0.06 + fell, null);
        }
      }
      if (frozen) continue;
      const info = attackInfo(f);
      const trail = this.trails[f.id];
      if (info?.striking) trail.push({ ...f.joints[info.limb] });
      else trail.shift();
      if (trail.length > TRAIL_LEN) trail.shift();
    }

    for (const p of this.particles) {
      p.life--;
      p.x += p.vx / 60;
      p.y = Math.max(0, p.y + p.vy / 60);
      if (p.kind === 'spark') p.vy -= 0.25;
      if (p.kind === 'dust') p.vx *= 0.92;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    const mid = (s.fighters[0].joints.pelvis.x + s.fighters[1].joints.pelvis.x) / 2;
    this.camX += (mid - this.camX) * 0.08;
  }

  private add(
    kind: Particle['kind'],
    at: Vec,
    vx: number,
    vy: number,
    life: number,
    size: number,
    zone: Particle['zone'],
  ) {
    this.particles.push({ kind, x: at.x, y: at.y, vx, vy, life, max: life, size, zone });
  }

  /** `alpha` (0–1) interpolates between the last two ticks, so slow motion stays smooth. */
  draw(ctx: CanvasRenderingContext2D, s: Readonly<FightState>, alpha: number, o: RenderOptions) {
    const { width: w, height: h } = ctx.canvas;
    const amp = this.trauma ** 2 * 0.035 * h * o.shake;
    const t = s.tick + alpha;
    const cam: Camera = {
      cx: this.camX,
      scale: (h / 2.6) * (1 + 0.05 * this.punch * o.shake),
      w,
      h,
      groundY: h * 0.86,
      ox: amp * Math.sin(t * 2.9) * Math.cos(t * 1.3),
      oy: amp * Math.cos(t * 3.7),
    };
    ctx.save();
    o.skin.background(ctx, cam, s.tick);
    for (const p of this.particles) if (p.kind === 'dust') o.skin.particle(ctx, cam, p);

    // The attacker is drawn last so its strike overlaps the defender.
    const order = [...s.fighters].sort(
      (a, b) => Number(a.action.kind === 'attack') - Number(b.action.kind === 'attack'),
    );
    for (const f of order) {
      let joints = interpolate(f.prevJoints, f.joints, alpha);
      if (s.hitstop > 0 && this.flash[f.id] > 0) joints = offset(joints, Math.sin(s.tick * 2.3) * 0.015);
      if (this.trails[f.id].length > 1) o.skin.trail(ctx, cam, this.trails[f.id], f.id);
      const view: FighterView = {
        id: f.id,
        joints,
        facing: f.facing,
        action: f.action.kind,
        flash: this.flash[f.id] * o.flash,
      };
      o.skin.fighter(ctx, cam, view);
    }
    for (const p of this.particles) if (p.kind !== 'dust') o.skin.particle(ctx, cam, p);

    if (o.skeleton || o.hitboxes) drawDebug(ctx, cam, s, alpha, o);
    if (this.screenFlash > 0 && o.flash > 0) {
      ctx.fillStyle = `rgb(255 255 255 / ${this.screenFlash * 0.3 * o.flash})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
}

function interpolate(a: Joints, b: Joints, t: number): Joints {
  const out = {} as Joints;
  for (const k of JOINTS) out[k] = lerpV(a[k], b[k], t);
  return out;
}

function offset(j: Joints, dx: number): Joints {
  const out = {} as Joints;
  for (const k of JOINTS) out[k] = { x: j[k].x + dx, y: j[k].y };
  return out;
}

/** Skin-independent overlays: bones and joints, hurtboxes (green) and hitboxes (red when live). */
function drawDebug(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  s: Readonly<FightState>,
  alpha: number,
  o: RenderOptions,
) {
  ctx.lineWidth = 1.5;
  for (const f of s.fighters) {
    const j = interpolate(f.prevJoints, f.joints, alpha);
    if (o.skeleton) {
      ctx.strokeStyle = '#5cc8b8';
      for (const [a, b] of BONE_LIST) {
        const p = toScreen(cam, j[a]);
        const q = toScreen(cam, j[b]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffcb6b';
      for (const k of JOINTS) {
        const p = toScreen(cam, j[k]);
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
    }
    if (o.hitboxes && !f.ragdoll) {
      ctx.strokeStyle = '#7cc495';
      for (const c of hurtboxes(f.joints)) capsule(ctx, cam, c.a, c.b, c.r);
      const info = attackInfo(f);
      if (info) {
        ctx.strokeStyle = info.live ? '#e5776f' : '#6b727d';
        const tip = f.joints[info.limb];
        capsule(ctx, cam, f.prevJoints[info.limb], tip, info.radius);
      }
    }
  }
}

function capsule(ctx: CanvasRenderingContext2D, cam: Camera, a: Vec, b: Vec, r: number) {
  const p = toScreen(cam, a);
  const q = toScreen(cam, b);
  const rp = r * cam.scale;
  const ang = Math.atan2(q.y - p.y, q.x - p.x);
  ctx.beginPath();
  ctx.arc(q.x, q.y, rp, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.arc(p.x, p.y, rp, ang + Math.PI / 2, ang + (Math.PI * 3) / 2);
  ctx.closePath();
  ctx.stroke();
}
