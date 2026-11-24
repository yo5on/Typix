/**
 * The shared typing engine: compares key presses with a target text. Used by every mode.
 *
 * Error modes:
 * - 'stop': a wrong key is recorded but the cursor waits for the right one. Backspace does nothing.
 * - 'continue': a wrong key is recorded and the cursor moves on. Backspace steps back one character.
 */
export type ErrorMode = 'stop' | 'continue';

export interface Keystroke {
  /** KeyboardEvent.key (the character produced, or a name like "Backspace"). */
  key: string;
  /** Milliseconds, from performance.now() minus any paused time. */
  t: number;
}

export interface TypingEvent {
  kind: 'correct' | 'wrong' | 'backspace';
  /** Target position the key was aimed at. */
  index: number;
  expected: string;
  actual: string;
  t: number;
  /** Time since the previous recorded keystroke, or null for the first one. */
  intervalMs: number | null;
}

export class TypingSession {
  readonly mode: ErrorMode;
  target: string;
  /** Cursor position: index of the next character to type. */
  pos = 0;
  /** What was typed at each position (continue mode can hold wrong characters). */
  readonly typed: string[] = [];
  readonly events: TypingEvent[] = [];

  constructor(target: string, mode: ErrorMode) {
    this.target = target;
    this.mode = mode;
  }

  get done() {
    return this.pos >= this.target.length;
  }

  get startedAt(): number | null {
    return this.events[0]?.t ?? null;
  }

  /** Adds more text to the end (timed tests keep extending the text). */
  append(text: string) {
    this.target += text;
  }

  /** Feeds one key press. Returns the recorded event, or null if the key was ignored. */
  input({ key, t }: Keystroke): TypingEvent | null {
    if (this.done) return null;
    const last = this.events.at(-1);
    const intervalMs = last ? t - last.t : null;

    if (key === 'Backspace') {
      if (this.mode !== 'continue' || this.pos === 0) return null;
      this.pos--;
      this.typed.length = this.pos;
      return this.record({ kind: 'backspace', index: this.pos, expected: '', actual: '', t, intervalMs });
    }
    if ([...key].length !== 1) return null; // Shift, Enter, arrows, dead keys…

    const expected = this.target[this.pos]!;
    const correct = key === expected;
    const event = this.record({
      kind: correct ? 'correct' : 'wrong',
      index: this.pos,
      expected,
      actual: key,
      t,
      intervalMs,
    });
    if (correct || this.mode === 'continue') {
      this.typed[this.pos] = key;
      this.pos++;
    }
    return event;
  }

  /** Positions typed correctly and still standing (backspaced characters don't count). */
  get correctChars(): number {
    let n = 0;
    for (let i = 0; i < this.typed.length; i++) if (this.typed[i] === this.target[i]) n++;
    return n;
  }

  private record(e: TypingEvent) {
    this.events.push(e);
    return e;
  }
}
