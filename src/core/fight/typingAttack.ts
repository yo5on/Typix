import { TypingSession } from '../typing/engine';
import { MOVE_IDS, MOVES, moveForWord, type MoveId } from './moves';
import { telegraphing, type FighterId, type FightInput, type FightState } from './sim';

/**
 * Turns typing one word into fight inputs, on top of the shared typing engine.
 * - Each correct key raises the charge (anticipation) to typed/length.
 * - A wrong key never loses charge: the cursor waits ('stop' mode) and the fighter just trembles.
 * - Finishing the word releases the attack. Power depends on accuracy only, never on speed.
 */
export class TypingAttack {
  readonly session: TypingSession;
  readonly move: MoveId;
  mistakes = 0;

  constructor(
    readonly word: string,
    readonly fighter: FighterId,
  ) {
    this.session = new TypingSession(word, 'stop');
    this.move = moveForWord(word);
  }

  get accuracy() {
    return this.word.length / (this.word.length + this.mistakes);
  }

  /** Feeds one key; returns the inputs to queue for the next tick. */
  key(key: string, t: number): FightInput[] {
    const e = this.session.input({ key, t });
    if (!e) return [];
    const { fighter, move } = this;
    if (e.kind === 'wrong') {
      this.mistakes++;
      return [{ fighter, kind: 'typo' }];
    }
    if (this.session.done) return [{ fighter, kind: 'release', move, power: powerFor(this.accuracy) }];
    return [{ fighter, kind: 'charge', move, charge: this.session.pos / this.word.length }];
  }
}

/**
 * Everything one typing fighter does: an attack word always in progress, and a short defence word that takes
 * over the keyboard while the opponent telegraphs an attack.
 * Finishing the defence word raises the guard and holds it until the threat is over; finishing it without a
 * typo also slips the attack with a dodge at the moment it is thrown, which opens a counter window.
 */
export class TypingFighter {
  attack: TypingAttack;
  defense: { session: TypingSession; mistakes: number } | null = null;
  /** How this threat is being answered once the defence word is done. */
  private answer: 'block' | 'dodge' | null = null;
  /** For results: every key, wrong keys, and finished attack words. */
  keys = 0;
  mistakes = 0;
  words = 0;

  constructor(
    readonly fighter: FighterId,
    private readonly nextWord: { attack: () => string; defense: () => string },
  ) {
    this.attack = new TypingAttack(nextWord.attack(), fighter);
  }

  /** Call once per tick, before `step`: opens and closes the defence prompt and holds the chosen defence. */
  update(s: Readonly<FightState>): FightInput[] {
    const me = s.fighters[this.fighter];
    const foe = s.fighters[this.fighter === 0 ? 1 : 0];
    const fighter = this.fighter;
    if (s.winner !== null || !telegraphing(foe)) {
      this.defense = null;
      this.answer = null;
      return [];
    }
    if (!this.defense && !this.answer && me.action.kind !== 'ko')
      this.defense = { session: new TypingSession(this.nextWord.defense(), 'stop'), mistakes: 0 };
    if (!this.answer) return [];
    return [{ fighter, kind: this.answer === 'dodge' && foe.action.kind === 'attack' ? 'dodge' : 'block' }];
  }

  key(key: string, t: number): FightInput[] {
    const d = this.defense;
    if (d) {
      const e = d.session.input({ key, t });
      if (!e) return [];
      this.keys++;
      if (e.kind === 'wrong') {
        this.mistakes++;
        d.mistakes++;
        return [{ fighter: this.fighter, kind: 'typo' }];
      }
      if (!d.session.done) return [];
      this.answer = d.mistakes === 0 ? 'dodge' : 'block';
      this.defense = null;
      return [{ fighter: this.fighter, kind: 'block' }];
    }
    const a = this.attack;
    const before = a.mistakes;
    const out = a.key(key, t);
    if (out.length) this.keys++;
    this.mistakes += a.mistakes - before;
    if (a.session.done) {
      this.words++;
      this.attack = new TypingAttack(this.nextWord.attack(), this.fighter);
    }
    return out;
  }

  get accuracy() {
    return this.keys ? (this.keys - this.mistakes) / this.keys : 1;
  }
}

/**
 * Word sources for typing combat. Attack words are spread evenly over every move's length band, so all six moves
 * come up (common words alone are mostly short jabs). Defence words are short: 3–4 letters.
 */
export function wordPickers(words: readonly string[], rng: () => number) {
  const letters = words.filter((w) => /^[a-z]+$/.test(w));
  const ids = [...MOVE_IDS].sort((a, b) => MOVES[a].minLetters - MOVES[b].minLetters);
  const bands = ids.map((id, i) => {
    const max = i + 1 < ids.length ? MOVES[ids[i + 1]!].minLetters : Infinity;
    return letters.filter((w) => w.length >= MOVES[id].minLetters && w.length < max);
  });
  const short = letters.filter((w) => w.length >= 3 && w.length <= 4);
  const pick = (pool: readonly string[], fallback: string) =>
    pool[Math.floor(rng() * pool.length)] ?? fallback;
  return {
    attack: () => pick(bands[Math.floor(rng() * bands.length)]!, 'jab'),
    defense: () => pick(short, 'duck'),
  };
}

/** Gentle accuracy scaling: a perfect word hits at 100 %, and even a very messy one keeps 70 %. */
export const powerFor = (accuracy: number) => 0.7 + 0.3 * Math.max(0, Math.min(1, accuracy));
