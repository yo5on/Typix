import { describe, expect, it } from 'vitest';
import { indexLayout } from '../../core/layout/keys';
import { usQwerty } from '../../core/layout/us-qwerty';
import { FINGERS, keyPoint, restPose, restTip, strokePose } from './handRig';

const layout = indexLayout(usQwerty);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('hand rig', () => {
  it('rests every fingertip on its home key', () => {
    const rest = restPose(layout);
    for (const f of FINGERS) {
      const pose = rest[f[0] as 'L' | 'R'].fingers[f]!;
      expect(pose.stretch).toBeCloseTo(1);
      expect(pose.tip).toEqual(restTip(f, layout));
    }
    expect(layout.byCode.get('KeyF')!.finger).toBe('L2');
  });

  it('every typable character moves its assigned finger to the key, and Shift uses the opposite pinky', () => {
    for (const [char, stroke] of layout.byChar) {
      const pose = strokePose(stroke, layout);
      const side = stroke.finger[0] as 'L' | 'R';
      const key = layout.byCode.get(stroke.code)!;
      const finger = pose[side].fingers[stroke.finger]!;
      // The tip lands on the key itself.
      expect(finger.tip.x, char).toBeGreaterThanOrEqual(key.x);
      expect(finger.tip.x, char).toBeLessThanOrEqual(key.x + key.w);
      expect(Math.floor(finger.tip.y), char).toBe(key.row);
      // Anatomically plausible: no finger more than doubles or folds under half its resting length.
      for (const s of ['L', 'R'] as const)
        for (const p of Object.values(pose[s].fingers)) {
          expect(p.stretch, char).toBeGreaterThan(0.45);
          expect(p.stretch, char).toBeLessThan(2);
        }

      if (stroke.shiftCode) {
        const pinky = stroke.shiftCode === 'ShiftLeft' ? 'L5' : 'R5';
        expect(pinky[0], `${char}: Shift on the opposite hand`).not.toBe(side);
        const shiftKey = layout.byCode.get(stroke.shiftCode)!;
        const tip = pose[pinky[0] as 'L' | 'R'].fingers[pinky]!.tip;
        expect(tip).toEqual(keyPoint(shiftKey, restTip(pinky, layout).x));
      }

      // Every other finger stays close to home.
      for (const f of FINGERS) {
        if (f === stroke.finger || (stroke.shiftCode && f.endsWith('5') && f[0] !== side)) continue;
        const tip = pose[f[0] as 'L' | 'R'].fingers[f]!.tip;
        expect(dist(tip, restTip(f, layout)), `${char} ${f}`).toBeLessThan(0.7);
      }
    }
  });

  it('curls for the bottom row and stretches for the top rows', () => {
    const at = (c: string) => {
      const s = layout.byChar.get(c)!;
      return strokePose(s, layout)[s.finger[0] as 'L' | 'R'].fingers[s.finger]!.stretch;
    };
    expect(at('v')).toBeLessThan(1);
    expect(at('r')).toBeGreaterThan(1);
    expect(at('4')).toBeGreaterThan(at('r'));
  });
});
