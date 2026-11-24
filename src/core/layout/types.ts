import type { FingerId } from '../store/schema';

export type { FingerId };

export interface KeyDef {
  /** KeyboardEvent.code — the physical key. */
  code: string;
  row: 0 | 1 | 2 | 3 | 4;
  /** Left edge and width in key units (1 = one letter key). */
  x: number;
  w: number;
  finger: FingerId;
  /** Character without / with Shift. Absent for non-character keys (Tab, Shift…). */
  base?: string;
  shift?: string;
  /** Short label for non-character keys. */
  label?: string;
  homeBump?: boolean;
}

export interface Layout {
  id: string;
  name: string;
  keys: KeyDef[];
}

/** How to type one character: the key, and which Shift key (if any) the other hand presses. */
export interface KeyStroke {
  code: string;
  finger: FingerId;
  shiftCode?: 'ShiftLeft' | 'ShiftRight';
}
