import type { KeyDef, KeyStroke, Layout } from './types';

export interface LayoutIndex {
  layout: Layout;
  byCode: Map<string, KeyDef>;
  /** Character → how to type it. Characters missing here cannot be typed on this layout. */
  byChar: Map<string, KeyStroke>;
}

/** Precomputes lookups for a layout. Shifted characters use the Shift key on the opposite hand. */
export function indexLayout(layout: Layout): LayoutIndex {
  const byCode = new Map(layout.keys.map((k) => [k.code, k]));
  const byChar = new Map<string, KeyStroke>();
  for (const k of layout.keys) {
    if (k.base !== undefined) byChar.set(k.base, { code: k.code, finger: k.finger });
    if (k.shift !== undefined) {
      const shiftCode = k.finger.startsWith('L') ? 'ShiftRight' : 'ShiftLeft';
      byChar.set(k.shift, { code: k.code, finger: k.finger, shiftCode });
    }
  }
  return { layout, byCode, byChar };
}

export const isTypable = (index: LayoutIndex, char: string) => index.byChar.has(char);
