import { BONES } from '../../../core/fight/skeleton';
import { DRAW_ORDER, FIGHTER_COLORS, toScreen, type Skin } from '../skin';

/** Clean white-on-dark stick figures with round joints. */
export const classicSkin: Skin = {
  id: 'classic',
  name: 'Classic Stickman',

  background(ctx, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, cam.h);
    g.addColorStop(0, '#13161b');
    g.addColorStop(1, '#0b0d10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.w, cam.h);
    // Floor line with tick marks every metre, so camera motion and knockback read clearly.
    ctx.strokeStyle = '#353b46';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cam.groundY + cam.oy);
    ctx.lineTo(cam.w, cam.groundY + cam.oy);
    ctx.stroke();
    ctx.fillStyle = '#262b33';
    for (let m = -6; m <= 6; m++) {
      const p = toScreen(cam, { x: m, y: 0 });
      ctx.fillRect(p.x - 1, p.y + 6, 2, 8);
    }
  },

  fighter(ctx, cam, f) {
    const w = 0.065 * cam.scale;
    const base = FIGHTER_COLORS[f.id];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [a, b, side] of DRAW_ORDER) {
      const p = toScreen(cam, f.joints[a]);
      const q = toScreen(cam, f.joints[b]);
      ctx.strokeStyle = f.flash > 0.5 ? '#ffffff' : base;
      ctx.globalAlpha = side === 'far' ? 0.6 : 1;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const h = toScreen(cam, f.joints.head);
    ctx.fillStyle = f.flash > 0.5 ? '#ffffff' : base;
    ctx.beginPath();
    ctx.arc(h.x, h.y, BONES.headR * cam.scale, 0, Math.PI * 2);
    ctx.fill();
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
      ctx.fillStyle = '#6b727d';
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * cam.scale * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};
