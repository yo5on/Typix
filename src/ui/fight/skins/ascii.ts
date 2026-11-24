import { DRAW_ORDER, FIGHTER_COLORS, toScreen, type Camera, type Skin } from '../skin';

/** Terminal look: every bone is drawn as characters snapped to a monospace grid. */
const FONT = "'JetBrains Mono Variable', ui-monospace, monospace";

function cell(cam: Camera) {
  const h = Math.max(10, Math.round(cam.scale * 0.1));
  return { w: Math.round(h * 0.6), h };
}

/** Character for a line at this screen angle. */
function lineChar(dx: number, dy: number): string {
  const a = ((Math.atan2(-dy, dx) * 180) / Math.PI + 180) % 180;
  if (a < 22.5 || a >= 157.5) return '-';
  if (a < 67.5) return '/';
  if (a < 112.5) return '|';
  return '\\';
}

function put(ctx: CanvasRenderingContext2D, cam: Camera, x: number, y: number, ch: string) {
  const c = cell(cam);
  ctx.fillText(ch, Math.round(x / c.w) * c.w, Math.round(y / c.h) * c.h);
}

export const asciiSkin: Skin = {
  id: 'ascii',
  name: 'ASCII',

  background(ctx, cam, tick) {
    ctx.fillStyle = '#07090b';
    ctx.fillRect(0, 0, cam.w, cam.h);
    const c = cell(cam);
    ctx.font = `${c.h}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Sparse dim dots, fixed to the world so they scroll with the camera.
    ctx.fillStyle = '#1b1f26';
    const offset = Math.round((cam.cx * cam.scale) / c.w);
    for (let gy = c.h; gy < cam.groundY - c.h; gy += c.h * 3) {
      for (let gx = 0; gx < cam.w; gx += c.w) {
        const n = (gx / c.w + offset) * 7 + (gy / c.h) * 13;
        if (n % 23 === 0) ctx.fillText(n % 2 ? '.' : '+', gx, gy);
      }
    }
    ctx.fillStyle = '#353b46';
    const row = Math.round((cam.groundY + cam.oy) / c.h) * c.h + c.h * 0.5;
    for (let gx = 0; gx < cam.w; gx += c.w)
      ctx.fillText((gx / c.w + offset + (tick >> 5)) % 9 ? '=' : '#', gx, row);
  },

  fighter(ctx, cam, f) {
    const c = cell(cam);
    ctx.font = `bold ${c.h}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = f.flash > 0.5 ? '#ffffff' : FIGHTER_COLORS[f.id];
    for (const [a, b, side] of DRAW_ORDER) {
      const p = toScreen(cam, f.joints[a]);
      const q = toScreen(cam, f.joints[b]);
      const ch = lineChar(q.x - p.x, q.y - p.y);
      const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / (c.h * 0.7)));
      ctx.globalAlpha = side === 'far' ? 0.55 : 1;
      for (let i = 0; i <= n; i++)
        put(ctx, cam, p.x + ((q.x - p.x) * i) / n, p.y + ((q.y - p.y) * i) / n, ch);
    }
    ctx.globalAlpha = 1;
    const h = toScreen(cam, f.joints.head);
    put(ctx, cam, h.x, h.y, f.action === 'ko' ? 'x' : f.action === 'hitstun' ? '@' : 'O');
  },

  trail(ctx, cam, points, fighter) {
    const c = cell(cam);
    ctx.font = `${c.h}px ${FONT}`;
    ctx.fillStyle = FIGHTER_COLORS[fighter];
    points.forEach((pt, i) => {
      const p = toScreen(cam, pt);
      ctx.globalAlpha = ((i + 1) / points.length) * 0.6;
      put(ctx, cam, p.x, p.y, i === points.length - 1 ? '*' : '~');
    });
    ctx.globalAlpha = 1;
  },

  particle(ctx, cam, p) {
    const c = cell(cam);
    const s = toScreen(cam, p);
    const k = p.life / p.max;
    ctx.font = `bold ${c.h}px ${FONT}`;
    ctx.globalAlpha = k;
    ctx.fillStyle = p.kind === 'dust' ? '#6b727d' : p.zone === 'head' ? '#ffe2a8' : '#ffffff';
    if (p.kind === 'ring') {
      const r = (1 - k) * p.size * cam.scale;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        put(ctx, cam, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, '#');
      }
    } else put(ctx, cam, s.x, s.y, p.kind === 'dust' ? '.' : k > 0.5 ? '*' : '+');
    ctx.globalAlpha = 1;
  },
};
