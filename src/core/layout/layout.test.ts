import { describe, expect, it } from 'vitest';
import { usQwerty } from './us-qwerty';
import { indexLayout } from './keys';

const index = indexLayout(usQwerty);

describe('US QWERTY layout', () => {
  it('can type every printable ASCII character', () => {
    for (let c = 32; c <= 126; c++) {
      expect(index.byChar.has(String.fromCharCode(c)), `char ${String.fromCharCode(c)}`).toBe(true);
    }
  });

  it('has unique key codes and rows that are 15 units wide', () => {
    expect(new Set(usQwerty.keys.map((k) => k.code)).size).toBe(usQwerty.keys.length);
    for (const r of [0, 1, 2, 3] as const) {
      const keys = usQwerty.keys.filter((k) => k.row === r);
      const last = keys.at(-1)!;
      expect(last.x + last.w).toBe(15);
    }
  });

  it('assigns the standard home-row fingers and bumps', () => {
    const fingers = 'asdfjkl;'.split('').map((c) => index.byChar.get(c)?.finger);
    expect(fingers).toEqual(['L5', 'L4', 'L3', 'L2', 'R2', 'R3', 'R4', 'R5']);
    expect(usQwerty.keys.filter((k) => k.homeBump).map((k) => k.code)).toEqual(['KeyF', 'KeyJ']);
  });

  it('uses the opposite hand for Shift', () => {
    expect(index.byChar.get('A')).toEqual({ code: 'KeyA', finger: 'L5', shiftCode: 'ShiftRight' });
    expect(index.byChar.get('?')).toEqual({ code: 'Slash', finger: 'R5', shiftCode: 'ShiftLeft' });
    expect(index.byChar.get('a')?.shiftCode).toBeUndefined();
  });
});
