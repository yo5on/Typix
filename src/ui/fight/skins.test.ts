import { describe, expect, it } from 'vitest';
import { createFight, step, type FightInput, type FightState } from '../../core/fight/sim';
import { FightAi } from '../../core/fight/ai';
import { FightRenderer, SKINS } from './renderer';

/** A canvas context that accepts every call and records how many draw calls were made. */
function stubContext(w = 960, h = 540) {
  let calls = 0;
  const gradient = { addColorStop: () => {} };
  const target: Record<string, unknown> = { canvas: { width: w, height: h } };
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key in t) return t[key];
      return () => {
        calls++;
        return key.endsWith('Gradient') ? gradient : undefined;
      };
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls: () => calls };
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

const script: Record<number, FightInput[]> = {
  2: [{ fighter: 0, kind: 'attack', move: 'cross' }],
  30: [{ fighter: 1, kind: 'attack', move: 'roundhouse' }],
  60: [{ fighter: 0, kind: 'charge', move: 'uppercut', charge: 0.6 }],
  75: [{ fighter: 0, kind: 'release', move: 'uppercut', power: 1 }],
  110: [{ fighter: 1, kind: 'attack', move: 'frontKick' }],
};

/** Replays the script, rendering every tick with `skin` (or not rendering at all). */
function play(skinIndex: number | null, debug: boolean): { state: FightState; calls: number } {
  const stub = stubContext();
  const r = new FightRenderer();
  let s = createFight();
  s.fighters[1].hp = 20; // so the replay includes a KO and ragdoll
  for (let i = 0; i < 300; i++) {
    s = deepFreeze(step(s, script[s.tick + 1] ?? []));
    if (skinIndex === null) continue;
    // A skin that tried to write to the sim state would throw here (frozen objects, strict mode).
    r.tick(s);
    r.draw(stub.ctx, s, 0.5, {
      skin: SKINS[skinIndex]!,
      skeleton: debug,
      hitboxes: debug,
      shake: 1,
      flash: 1,
    });
  }
  return { state: s, calls: stub.calls() };
}

describe('skins', () => {
  const baseline = JSON.stringify(play(null, false).state);

  it.each(SKINS.map((s, i) => [s.name, i] as const))('%s renders without changing the fight', (_name, i) => {
    for (const debug of [false, true]) {
      const { state, calls } = play(i, debug);
      expect(calls).toBeGreaterThan(0);
      expect(JSON.stringify(state)).toBe(baseline);
    }
  });

  it('the replay actually exercises hits and a knockout', () => {
    const { state } = play(null, false);
    expect(state.winner).not.toBeNull();
  });

  it('a full AI-vs-AI fight ends the same way whichever skin draws it', () => {
    const fight = (skinIndex: number | null) => {
      const stub = stubContext();
      const r = new FightRenderer();
      const ais = [new FightAi(0, 'hard', 11), new FightAi(1, 'normal', 12)];
      let s = createFight({ gap: 2.6 });
      while (s.winner === null && s.tick < 60 * 240) {
        s = deepFreeze(
          step(
            s,
            ais.flatMap((ai) => ai.think(s)),
          ),
        );
        if (skinIndex === null) continue;
        r.tick(s);
        r.draw(stub.ctx, s, 0.5, {
          skin: SKINS[skinIndex]!,
          skeleton: true,
          hitboxes: true,
          shake: 1,
          flash: 1,
        });
      }
      return JSON.stringify(s);
    };
    const baseline = fight(null);
    expect(JSON.parse(baseline).winner).not.toBeNull();
    for (let i = 0; i < SKINS.length; i++) expect(fight(i)).toBe(baseline);
  }, 60_000);

  it('every skin has a unique id', () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
  });
});
