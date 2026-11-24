import { BONES, type JointName, type Vec } from '../../../core/fight/skeleton';
import { DRAW_ORDER, FIGHTER_COLORS, toScreen, type Camera, type Skin } from '../skin';

/** Outlined fighters with gloves, headband and shoes, in a night-time rooftop arena. */

/** Limb thickness in metres, per bone. */
const WIDTH: Record<string, number> = {
  'pelvis-chest': 0.15,
  'chest-neck': 0.08,
  'pelvis-kneeF': 0.1,
  'pelvis-kneeB': 0.1,
  'kneeF-footF': 0.08,
  'kneeB-footB': 0.08,
  'chest-elbowF': 0.075,
  'chest-elbowB': 0.075,
  'elbowF-handF': 0.065,
  'elbowB-handB': 0.065,
};
const OUTLINE = '#0a0712';
const ACCENT: Record<0 | 1, string> = { 0: '#e5483f', 1: '#2b2836' };

/** Darkens a #rrggbb colour by factor k (0–1). */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k);
  return `rgb(${c(16)} ${c(8)} ${c(0)})`;
}

/** Deterministic 0–1 hash, so the skyline and stars stay put between frames. */
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function skyline(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  gy: number,
  o: { parallax: number; width: number; min: number; max: number; color: string; seed: number; lit: boolean },
) {
  const s = cam.scale;
  const origin = cam.w / 2 - cam.cx * o.parallax * s + cam.ox * o.parallax;
  const first = Math.floor(-origin / (o.width * s)) - 1;
  const last = Math.ceil((cam.w - origin) / (o.width * s)) + 1;
  ctx.beginPath(); // windows collect here; fillRect below doesn't touch the path
  ctx.fillStyle = o.color;
  for (let i = first; i <= last; i++) {
    const r = hash(i + o.seed);
    const x = origin + i * o.width * s;
    const bw = o.width * s * (0.8 + 0.2 * hash(i * 3 + o.seed));
    const bh = (o.min + r * (o.max - o.min)) * s;
    ctx.fillRect(x, gy - bh, bw + 1, bh);
    if (r > 0.75) ctx.fillRect(x + bw * 0.45, gy - bh - 0.18 * s, 2, 0.18 * s); // antenna
    if (!o.lit) continue;
    const ww = bw / 7;
    for (let row = 0; (row + 1) * ww * 2.2 < bh - ww; row++)
      for (let col = 0; col < 3; col++)
        if (hash(i * 31 + row * 7 + col + o.seed) > 0.62)
          ctx.rect(x + ww + col * ww * 2, gy - bh + ww + row * ww * 2.2, ww, ww * 1.2);
  }
  if (o.lit) {
    ctx.fillStyle = 'rgb(255 205 120 / 0.55)';
    ctx.fill();
  }
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

export const classicSkin: Skin = {
  id: 'classic',
  name: 'Classic Stickman',

  background(ctx, cam, tick) {
    const { w, h } = cam;
    const gy = cam.groundY + cam.oy;
    const s = cam.scale;

    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#0b0a1d');
    sky.addColorStop(0.55, '#24143d');
    sky.addColorStop(1, '#5b2a4c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, gy);

    for (let i = 0; i < 50; i++) {
      const twinkle = 0.45 + 0.4 * Math.sin(tick * 0.05 + i * 1.7);
      ctx.fillStyle = `rgb(255 255 255 / ${twinkle * hash(i + 900)})`;
      ctx.fillRect(hash(i) * w, hash(i + 500) * gy * 0.6, 2, 2);
    }

    // Moon with a soft glow, drifting slightly with the camera.
    const mx = w * 0.8 - cam.cx * s * 0.03;
    const my = h * 0.2;
    const mr = h * 0.06;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    glow.addColorStop(0, 'rgb(255 214 170 / 0.35)');
    glow.addColorStop(1, 'rgb(255 214 170 / 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.fillStyle = '#f7e6c9';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();

    skyline(ctx, cam, gy, { parallax: 0.15, width: 0.35, min: 0.6, max: 1.9, color: '#2a1a40', seed: 11, lit: false });
    skyline(ctx, cam, gy, { parallax: 0.4, width: 0.6, min: 0.3, max: 1.3, color: '#150d24', seed: 47, lit: true });

    // Haze where the city meets the floor.
    const haze = ctx.createLinearGradient(0, gy - 0.5 * s, 0, gy);
    haze.addColorStop(0, 'rgb(255 120 150 / 0)');
    haze.addColorStop(1, 'rgb(255 120 150 / 0.18)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, gy - 0.5 * s, w, 0.5 * s);

    // Floor: dark boards with lines receding toward the viewer, so camera motion reads clearly.
    const floor = ctx.createLinearGradient(0, gy, 0, h);
    floor.addColorStop(0, '#3a2433');
    floor.addColorStop(1, '#0f0a12');
    ctx.fillStyle = floor;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = 'rgb(255 255 255 / 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let m = Math.floor(cam.cx) - 8; m <= Math.ceil(cam.cx) + 8; m++) {
      const p = toScreen(cam, { x: m, y: 0 });
      ctx.moveTo(p.x, gy);
      ctx.lineTo(w / 2 + (p.x - w / 2) * 2.4, h);
    }
    for (const k of [0.25, 0.55, 1]) {
      const y = gy + (h - gy) * k * k;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Spotlight pool on the floor under the fight.
    ctx.save();
    ctx.translate(w / 2 + cam.ox, gy);
    ctx.scale(1, 0.16);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.2 * s);
    pool.addColorStop(0, 'rgb(255 220 190 / 0.22)');
    pool.addColorStop(1, 'rgb(255 220 190 / 0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(0, 0, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgb(255 160 180 / 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();

    const vignette = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.4, w / 2, h * 0.55, Math.max(w, h) * 0.8);
    vignette.addColorStop(0, 'rgb(0 0 0 / 0)');
    vignette.addColorStop(1, 'rgb(0 0 0 / 0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  },

  fighter(ctx, cam, f) {
    const s = cam.scale;
    const j = f.joints;
    const P = (k: JointName) => toScreen(cam, j[k]);
    const lit = f.flash > 0.5;
    const near = lit ? '#ffffff' : f.color;
    const far = lit ? '#dddddd' : shade(f.color, 0.6);
    const accent = lit ? '#ffffff' : ACCENT[f.id];
    const edge = 0.028 * s;

    // Ground shadow, shrinking as the body leaves the floor.
    const ground = toScreen(cam, { x: j.pelvis.x, y: 0 });
    const lift = Math.max(0.3, 1 - j.pelvis.y * 0.4);
    ctx.fillStyle = 'rgb(0 0 0 / 0.4)';
    ellipse(ctx, ground.x, ground.y, 0.34 * s * lift, 0.05 * s * lift);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const line = (a: Vec, b: Vec, width: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    const disc = (p: Vec, r: number, color: string) => {
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + edge / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const shoe = (foot: JointName, color: string) => {
      const a = P(foot);
      const b = toScreen(cam, { x: j[foot].x + f.facing * 0.1, y: j[foot].y });
      line(a, b, 0.075 * s + edge, OUTLINE);
      line(a, b, 0.075 * s, color);
    };

    // Each side draws all outlines first, then all fills, so joints don't show seams.
    for (const side of ['far', 'near'] as const) {
      const bones = DRAW_ORDER.filter((b) => b[2] === side);
      const color = side === 'far' ? far : near;
      for (const [a, b] of bones) line(P(a), P(b), WIDTH[`${a}-${b}`]! * s + edge, OUTLINE);
      for (const [a, b] of bones) line(P(a), P(b), WIDTH[`${a}-${b}`]! * s, color);
      if (side === 'far') {
        shoe('footB', lit ? far : '#1a1622');
        disc(P('handB'), 0.06 * s, lit ? far : shade(accent, 0.7));
      } else {
        // Shorts over the hips, in the accent colour.
        const pelvis = P('pelvis');
        const belt = toScreen(cam, {
          x: j.pelvis.x + (j.chest.x - j.pelvis.x) * 0.22,
          y: j.pelvis.y + (j.chest.y - j.pelvis.y) * 0.22,
        });
        line(pelvis, belt, 0.155 * s, accent);
        shoe('footF', lit ? near : '#1a1622');
      }
    }

    // Head with a headband whose tails flutter behind.
    const head = P('head');
    const r = BONES.headR * s;
    disc(head, r, near);
    const back = -f.facing;
    const bandY = head.y - r * 0.25;
    const wave = Math.sin(f.tick * 0.25 + f.id) * r * 0.25;
    ctx.strokeStyle = accent;
    ctx.lineWidth = r * 0.32;
    ctx.beginPath();
    ctx.moveTo(head.x - r * 0.98, bandY);
    ctx.lineTo(head.x + r * 0.98, bandY);
    ctx.moveTo(head.x + back * r * 0.9, bandY);
    ctx.quadraticCurveTo(head.x + back * r * 1.6, bandY + wave, head.x + back * r * 2.2, bandY + r * 0.4 + wave);
    ctx.stroke();
    // Eye, looking toward the opponent.
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(head.x + f.facing * r * 0.5, head.y + r * 0.05, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    // Weapon held in the lead hand, pointing along the forearm.
    if (f.weapon) {
      const hand = j.handF;
      const dx = hand.x - j.elbowF.x;
      const dy = hand.y - j.elbowF.y;
      const d = Math.hypot(dx, dy) || 1;
      const len = f.weapon === 'sword' ? 0.75 : 0.6;
      const at = (k: number) => toScreen(cam, { x: hand.x + (dx / d) * k, y: hand.y + (dy / d) * k });
      if (f.weapon === 'stick') {
        line(at(-0.25), at(len), 0.04 * s + edge, OUTLINE);
        line(at(-0.25), at(len), 0.04 * s, lit ? '#ffffff' : '#8b5a2b');
      } else {
        line(at(0.08), at(len), 0.05 * s + edge, OUTLINE);
        line(at(0.08), at(len), 0.05 * s, lit ? '#ffffff' : '#d9e2ec');
        line(at(0.1), at(len - 0.04), 0.012 * s, 'rgb(255 255 255 / 0.8)');
        // Crossguard, perpendicular to the blade.
        const c = at(0.07);
        const px = (-dy / d) * 0.09 * s;
        const py = (dx / d) * 0.09 * s;
        line({ x: c.x - px, y: c.y + py }, { x: c.x + px, y: c.y - py }, 0.03 * s, '#c9a227');
      }
    }

    // Lead glove last, so punches read on top of the body.
    disc(P('handF'), 0.065 * s, accent);
  },

  trail(ctx, cam, points, fighter) {
    ctx.lineCap = 'round';
    for (let i = 1; i < points.length; i++) {
      const p = toScreen(cam, points[i - 1]!);
      const q = toScreen(cam, points[i]!);
      const k = i / points.length;
      ctx.strokeStyle = FIGHTER_COLORS[fighter];
      ctx.globalAlpha = k * 0.45;
      ctx.lineWidth = k * 0.09 * cam.scale;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  particle(ctx, cam, p) {
    const s = toScreen(cam, p);
    const k = p.life / p.max;
    ctx.globalAlpha = k;
    if (p.kind === 'ring') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(s.x, s.y, (1 - k) * p.size * cam.scale, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'spark') {
      ctx.strokeStyle = p.zone === 'head' ? '#ffe2a8' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - p.vx * 0.03 * cam.scale, s.y + p.vy * 0.03 * cam.scale);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#6b5a70';
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * cam.scale * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
