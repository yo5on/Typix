import { pickWords } from '../textgen/generate';

/** One screen of a lesson. */
export type StepSpec =
  /** Read a short explanation; Space continues. */
  | { kind: 'intro'; title: string; body: string[] }
  /** Press each character in turn, one at a time (safe on keyboards that drop simultaneous keys). */
  | { kind: 'find'; title: string; keys: string }
  /** Watch the hands press each key; Enter replays, Space continues. */
  | { kind: 'demo'; keys: string }
  /** Type generated (or fixed) text. */
  | DrillSpec;

export interface DrillSpec {
  kind: 'drill';
  /** 'mixed': real words with the lesson's punctuation, numbers or symbols worked in (Units 6–8). */
  /** 'lines': `count` lines picked from `lines` (code tracks). */
  style: 'single' | 'pairs' | 'words' | 'review' | 'sentences' | 'fixed' | 'mixed' | 'lines';
  /** Fixed text, for `style: 'fixed'`. */
  text?: string;
  /** Hand-written lines, for `style: 'lines'`. One line each: the engine has no Enter key yet. */
  lines?: readonly string[];
  /** Only words containing one of these strings (e.g. common letter pairs). */
  contains?: string[];
  /** Share of words given a capital first letter (when the capital is allowed). */
  capitalize?: number;
  /** How many words, tokens or sentences. Defaults depend on the style. */
  count?: number;
}

export interface Lesson {
  /** 'u1.l2', 'gym.l2' for Finger Gym drills, 'py.l1' for code tracks. */
  id: string;
  group: 'course' | 'gym' | 'code';
  unit: number;
  /** Position inside the unit, from 1. */
  index: number;
  title: string;
  blurb: string;
  /** Characters this lesson introduces (shown in demos and judged in the summary). */
  newKeys: string;
  /** Every character that may appear in the lesson's text, apart from space. */
  allowed: string;
  /** Characters to favour in generated text. Defaults to `newKeys`. */
  focus?: string;
  steps: StepSpec[];
  /** Code tracks: the language name, shown instead of the unit number. */
  track?: string;
  /** Unit 0 is orientation only: nothing is scored or recorded. */
  scored: boolean;
}

export interface Unit {
  id: number;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

export interface TextContext {
  rng: () => number;
  /** Real words to draw from (filtered to the lesson's keys here). */
  words: readonly string[];
  /** Characters to favour instead of the lesson's own focus (e.g. "repeat with focus on U"). */
  focus?: string;
}

/** Below this many real words, drills use short letter patterns built from the allowed letters instead. */
const MIN_REAL_WORDS = 6;

const pick = <T>(xs: readonly T[], rng: () => number): T => xs[Math.floor(rng() * xs.length)]!;
const isLetter = (c: string) => /^[a-z]$/.test(c);

/** "1.2 · D and K", or "Finger Gym · Left index finger". */
export const lessonLabel = (l: Lesson) =>
  l.group === 'gym'
    ? `Finger Gym · ${l.title}`
    : l.track
      ? `${l.track} · ${l.title}`
      : `${l.unit}.${l.index} · ${l.title}`;

/** The characters a lesson focuses on, for text generation and the summary. */
export function lessonFocus(lesson: Lesson, override?: string): string {
  const f = override || lesson.focus || lesson.newKeys;
  return f || lesson.allowed;
}

/** Keys-only patterns such as "fjf", each containing at least one focus key. */
function tokens(pool: string[], focus: string[], count: number, min: number, max: number, rng: () => number) {
  const out: string[] = [];
  while (out.length < count) {
    const len = min + Math.floor(rng() * (max - min + 1));
    const chars = Array.from({ length: len }, () => pick(pool, rng));
    if (!chars.some((c) => focus.includes(c))) chars[Math.floor(rng() * len)] = pick(focus, rng);
    const t = chars.join('');
    if (t !== out.at(-1)) out.push(t);
  }
  return out;
}

function wordPool(spec: DrillSpec, lesson: Lesson, ctx: TextContext): string[] {
  const allowed = new Set(lesson.allowed.toLowerCase());
  let pool = ctx.words.filter((w) => [...w].every((c) => allowed.has(c)));
  if (spec.contains) pool = pool.filter((w) => spec.contains!.some((s) => w.includes(s)));
  return [...new Set(pool)];
}

function words(spec: DrillSpec, lesson: Lesson, ctx: TextContext, count: number): string[] {
  const focus = [...lessonFocus(lesson, ctx.focus).toLowerCase()].filter(isLetter);
  const letters = [...new Set(lesson.allowed.toLowerCase())].filter(isLetter);
  const pool = wordPool(spec, lesson, ctx);
  const focusSet = new Set(focus);
  let out: string[];
  if (pool.length >= MIN_REAL_WORDS) {
    out = pickWords(pool, count, { rng: ctx.rng, focus: focusSet, focusShare: 0.7 });
  } else {
    // Not enough real words yet (e.g. F and J only): short letter patterns, plus any real words we have.
    const fake = tokens(letters, focus.length ? focus : letters, count, 2, 4, ctx.rng);
    out = fake.map((t) => (pool.length && ctx.rng() < 0.3 ? pick(pool, ctx.rng) : t));
  }
  const share = spec.capitalize ?? 0;
  if (share > 0) {
    out = out.map((w) => {
      const cap = w[0]!.toUpperCase() + w.slice(1);
      return lesson.allowed.includes(cap[0]!) && ctx.rng() < share ? cap : w;
    });
  }
  return out;
}

function sentences(lesson: Lesson, ctx: TextContext, count: number, spec: DrillSpec): string {
  const out: string[] = [];
  const comma = lesson.allowed.includes(',');
  const period = lesson.allowed.includes('.');
  for (let i = 0; i < count; i++) {
    const n = 4 + Math.floor(ctx.rng() * 4);
    const ws = words({ ...spec, capitalize: 0 }, lesson, ctx, n);
    const first = ws[0]!.toUpperCase()[0]!;
    if (lesson.allowed.includes(first)) ws[0] = first + ws[0]!.slice(1);
    if (comma && n >= 6) ws[2] += ',';
    out.push(ws.join(' ') + (period ? '.' : ''));
  }
  return out.join(' ');
}

const isDigit = (c: string) => c >= '0' && c <= '9';

/** A 1–4 digit number from the allowed digits, containing `must` when it is a digit. */
function number(digits: string[], must: string, rng: () => number): string {
  const len = 1 + Math.floor(rng() * 4);
  const out = Array.from({ length: len }, () => pick(digits, rng));
  if (isDigit(must)) out[Math.floor(rng() * len)] = must;
  return out.join('');
}

/** Brackets and quotes always come in pairs when both halves are allowed. */
const CLOSERS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>', '"': '"', "'": "'" };
const OPENERS: Record<string, string> = { ')': '(', ']': '[', '}': '{', '>': '<' };

/** Works one symbol into a real word the way it usually appears in text or code. */
function decorate(c: string, w: string, w2: string, allowed: string, rng: () => number): string {
  const digits = [...allowed].filter(isDigit);
  const num = () => (digits.length ? number(digits, c, rng) : w2);
  if (isDigit(c)) return rng() < 0.5 ? num() : `${w} ${num()}`;
  const open = OPENERS[c] ?? c;
  const close = CLOSERS[open];
  if (close && allowed.includes(open) && allowed.includes(close)) {
    if (open === "'" && allowed.includes('s') && rng() < 0.5) return `${w}'s`;
    return open + w + close;
  }
  switch (c) {
    case '=':
      return `${w} = ${w2}`;
    case '$':
    case '#':
    case '@':
      return c + (c === '$' ? num() : w);
    case '~':
      return allowed.includes('/') ? `~/${w}` : c + w;
    case '%':
      return num() + c;
    case '^':
      return `${w}^${num()}`;
    case '*':
    case '`':
      return c + w + c;
    case '-':
    case '_':
    case '|':
    case '\\':
    case '&':
    case '+':
    case '/':
      return w + c + w2;
    default:
      // Sentence and clause marks (and anything else) go right after the word.
      return w + c;
  }
}

/** Real words with the lesson's non-letter focus keys worked into most of them. */
function mixed(spec: DrillSpec, lesson: Lesson, ctx: TextContext): string {
  const symbols = [...lessonFocus(lesson, ctx.focus)].filter((c) => !isLetter(c) && c !== ' ');
  const ws = words({ ...spec, capitalize: 0 }, lesson, ctx, spec.count ?? 14);
  if (!symbols.length) return ws.join(' ');
  return ws
    .map((w) =>
      ctx.rng() < 0.3 ? w : decorate(pick(symbols, ctx.rng), w, pick(ws, ctx.rng), lesson.allowed, ctx.rng),
    )
    .join(' ');
}

/**
 * Builds the text for one drill. Every character is guaranteed to be in `lesson.allowed` or a space
 * (checked across every lesson and many seeds in the tests).
 */
export function drillText(spec: DrillSpec, lesson: Lesson, ctx: TextContext): string {
  const { rng } = ctx;
  const focus = [...lessonFocus(lesson, ctx.focus)].filter((c) => lesson.allowed.includes(c));
  const all = [...new Set(lesson.allowed)];
  switch (spec.style) {
    case 'fixed':
      return spec.text ?? '';
    case 'single': {
      // "fff jjj fff jjj" then mixed: each key on its own first, then alternating.
      const groups: string[] = [];
      const keys = focus.length ? focus : all;
      for (let round = 0; round < 2; round++) for (const k of keys) groups.push(k.repeat(3));
      const pairsWith = keys.length > 1 ? keys : [...new Set([...keys, ...all])].slice(0, 4);
      groups.push(...tokens(pairsWith, keys, spec.count ?? 6, 1, 2, rng));
      // Capitals are practised next to their lower-case letter: "Ff Jj".
      return groups.map((g) => (/^[A-Z]+$/.test(g) ? g[0] + g[0]!.toLowerCase() : g)).join(' ');
    }
    case 'pairs': {
      const keys = focus.length ? focus : all;
      // New keys twice as likely as the home-row anchors around them, so patterns stay about the new keys.
      const anchors = [...'asdfjkl;'].filter((c) => lesson.allowed.includes(c) && !keys.includes(c));
      return tokens([...keys, ...keys, ...anchors], keys, spec.count ?? 12, 2, 3, rng).join(' ');
    }
    case 'words':
      return words(spec, lesson, ctx, spec.count ?? 12).join(' ');
    case 'review':
      return words(spec, lesson, ctx, spec.count ?? 16).join(' ');
    case 'sentences':
      return sentences(lesson, ctx, spec.count ?? 3, spec);
    case 'mixed':
      return mixed(spec, lesson, ctx);
    case 'lines': {
      const all = spec.lines ?? [];
      // "Repeat with focus on {": prefer lines that use the weak keys.
      const withFocus = ctx.focus ? all.filter((l) => [...ctx.focus!].some((c) => l.includes(c))) : [];
      const pool = withFocus.length >= 3 ? withFocus : all;
      const out: string[] = [];
      while (out.length < Math.min(spec.count ?? 6, pool.length * 2)) {
        const line = pick(pool, rng);
        if (line !== out.at(-1) || pool.length === 1) out.push(line);
      }
      return out.join(' ');
    }
  }
}
