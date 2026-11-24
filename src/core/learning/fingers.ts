import type { LayoutIndex } from '../layout/keys';
import type { FingerId } from '../store/schema';

/** Where each finger rests. Thumbs share the space bar. */
export const HOME_KEY: Record<FingerId, string> = {
  L5: 'KeyA',
  L4: 'KeyS',
  L3: 'KeyD',
  L2: 'KeyF',
  L1: 'Space',
  R1: 'Space',
  R2: 'KeyJ',
  R3: 'KeyK',
  R4: 'KeyL',
  R5: 'Semicolon',
};

const NAMES: Record<string, string> = {
  '5': 'pinky',
  '4': 'ring',
  '3': 'middle',
  '2': 'index',
  '1': 'thumb',
};

/** "left index finger", "right pinky". */
export function fingerName(f: FingerId): string {
  const name = NAMES[f[1]!]!;
  return `${f[0] === 'L' ? 'left' : 'right'} ${name}${name === 'pinky' || name === 'thumb' ? '' : ' finger'}`;
}

const ROW_WORD = ['number row', 'top row', 'home row', 'bottom row', 'space bar'];

/** How to reach a key from home, in words a beginner can follow. */
export function describeReach(code: string, layout: LayoutIndex): string {
  const key = layout.byCode.get(code);
  if (!key) return '';
  const who = fingerName(key.finger);
  const Who = who[0]!.toUpperCase() + who.slice(1);
  if (code === 'Space') return 'Either thumb taps the space bar. Keep your fingers resting on the home row.';
  const home = layout.byCode.get(HOME_KEY[key.finger])!;
  if (code === home.code) {
    return `${Who}. This is its home key${key.homeBump ? ': feel for the small bump' : ''}.`;
  }
  const dy = key.row - home.row;
  const dx = key.x + key.w / 2 - (home.x + home.w / 2);
  const vertical = dy < 0 ? 'up' : dy > 0 ? 'down' : '';
  const towardCentre = key.finger[0] === 'L' ? dx > 0.3 : dx < -0.3;
  const awayCentre = key.finger[0] === 'L' ? dx < -0.3 : dx > 0.3;
  const side = towardCentre ? 'in toward the middle' : awayCentre ? 'out to the side' : '';
  const move = [vertical, side].filter(Boolean).join(' and ');
  const homeLegend = (home.base ?? '').toUpperCase();
  return `${Who}. Reach ${move || 'across'} from ${homeLegend} to the ${ROW_WORD[key.row]}, then come back home.`;
}
