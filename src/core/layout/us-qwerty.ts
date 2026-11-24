import type { FingerId, KeyDef, Layout } from './types';

type Row = KeyDef['row'];

/** Builds a row of keys laid left to right from `x0`. Each entry: [code, finger, base, shift, width?]. */
function row(r: Row, x0: number, keys: [string, FingerId, string?, string?, number?, string?][]): KeyDef[] {
  let x = x0;
  return keys.map(([code, finger, base, shift, w = 1, label]) => {
    const key: KeyDef = { code, row: r, x, w, finger };
    if (base !== undefined) key.base = base;
    if (shift !== undefined) key.shift = shift;
    if (label !== undefined) key.label = label;
    x += w;
    return key;
  });
}

export const usQwerty: Layout = {
  id: 'us-qwerty',
  name: 'US QWERTY',
  keys: [
    ...row(0, 0, [
      ['Backquote', 'L5', '`', '~'],
      ['Digit1', 'L5', '1', '!'],
      ['Digit2', 'L4', '2', '@'],
      ['Digit3', 'L3', '3', '#'],
      ['Digit4', 'L2', '4', '$'],
      ['Digit5', 'L2', '5', '%'],
      ['Digit6', 'L2', '6', '^'],
      ['Digit7', 'R2', '7', '&'],
      ['Digit8', 'R3', '8', '*'],
      ['Digit9', 'R4', '9', '('],
      ['Digit0', 'R5', '0', ')'],
      ['Minus', 'R5', '-', '_'],
      ['Equal', 'R5', '=', '+'],
      ['Backspace', 'R5', undefined, undefined, 2, 'backspace'],
    ]),
    ...row(1, 0, [
      ['Tab', 'L5', undefined, undefined, 1.5, 'tab'],
      ['KeyQ', 'L5', 'q', 'Q'],
      ['KeyW', 'L4', 'w', 'W'],
      ['KeyE', 'L3', 'e', 'E'],
      ['KeyR', 'L2', 'r', 'R'],
      ['KeyT', 'L2', 't', 'T'],
      ['KeyY', 'R2', 'y', 'Y'],
      ['KeyU', 'R2', 'u', 'U'],
      ['KeyI', 'R3', 'i', 'I'],
      ['KeyO', 'R4', 'o', 'O'],
      ['KeyP', 'R5', 'p', 'P'],
      ['BracketLeft', 'R5', '[', '{'],
      ['BracketRight', 'R5', ']', '}'],
      ['Backslash', 'R5', '\\', '|', 1.5],
    ]),
    ...row(2, 0, [
      ['CapsLock', 'L5', undefined, undefined, 1.75, 'caps'],
      ['KeyA', 'L5', 'a', 'A'],
      ['KeyS', 'L4', 's', 'S'],
      ['KeyD', 'L3', 'd', 'D'],
      ['KeyF', 'L2', 'f', 'F'],
      ['KeyG', 'L2', 'g', 'G'],
      ['KeyH', 'R2', 'h', 'H'],
      ['KeyJ', 'R2', 'j', 'J'],
      ['KeyK', 'R3', 'k', 'K'],
      ['KeyL', 'R4', 'l', 'L'],
      ['Semicolon', 'R5', ';', ':'],
      ['Quote', 'R5', "'", '"'],
      ['Enter', 'R5', undefined, undefined, 2.25, 'enter'],
    ]),
    ...row(3, 0, [
      ['ShiftLeft', 'L5', undefined, undefined, 2.25, 'shift'],
      ['KeyZ', 'L5', 'z', 'Z'],
      ['KeyX', 'L4', 'x', 'X'],
      ['KeyC', 'L3', 'c', 'C'],
      ['KeyV', 'L2', 'v', 'V'],
      ['KeyB', 'L2', 'b', 'B'],
      ['KeyN', 'R2', 'n', 'N'],
      ['KeyM', 'R2', 'm', 'M'],
      ['Comma', 'R3', ',', '<'],
      ['Period', 'R4', '.', '>'],
      ['Slash', 'R5', '/', '?'],
      ['ShiftRight', 'R5', undefined, undefined, 2.75, 'shift'],
    ]),
    ...row(4, 3.75, [['Space', 'R1', ' ', undefined, 6.25, 'space']]),
  ].map((k) => (k.code === 'KeyF' || k.code === 'KeyJ' ? { ...k, homeBump: true } : k)),
};
