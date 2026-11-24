/** Persisted data shapes. Bump SCHEMA_VERSION and add a migration whenever Progress changes shape. */
export const SCHEMA_VERSION = 1;

export type FingerId = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type PracticeMode = 'calm' | 'pressure';

export interface ModeStat {
  presses: number;
  errors: number;
  meanLatencyMs: number;
}

export interface KeyStat extends ModeStat {
  /** Ring buffer of the last 50 results: 1 = correct, 0 = error. */
  recent: number[];
  guidance: 0 | 1 | 2 | 3;
  byMode: Record<PracticeMode, ModeStat>;
}

export interface SessionSummary {
  id: string;
  at: number;
  mode: 'learning' | 'practice' | 'fight';
  /** Lesson id, test config or opponent id. */
  ref: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  durationMs: number;
  weakKeys: string[];
  result?: 'win' | 'loss' | 'n/a';
}

export interface Progress {
  schemaVersion: number;
  createdAt: number;
  keys: Record<string, KeyStat>;
  bigrams: Record<string, { n: number; meanMs: number; errors: number }>;
  lessons: Record<string, { completed: boolean; mastered: boolean; best: number; plays: number }>;
  fights: Record<string, { wins: number; losses: number; bestCombo: number }>;
  sessions: SessionSummary[];
  daily: Record<string, { minutes: number; wpmCalm?: number; wpmPressure?: number }>;
  achievements: Record<string, number>;
  nemesis?: { generatedOn: string; keys: string[]; bigrams: string[] };
}

export interface Settings {
  reducedMotion: 'system' | 'on' | 'off';
  /** 0–1 intensity; 0 disables. */
  shake: number;
  flash: number;
  sfx: number;
  music: number;
  ticks: boolean;
  errorMode: 'stop' | 'continue';
  textSize: 'S' | 'M' | 'L' | 'XL';
  fingerLabels: boolean;
  /** Okabe–Ito finger colours and a patterned lit key, for colour-blind players. */
  colorBlindFingers: boolean;
  handTone: 'light' | 'medium' | 'tan' | 'deep' | 'ghost';
  showHands: boolean;
  guidanceOverride: 'auto' | 0 | 1 | 2 | 3;
  layout: 'us-qwerty';
  guardWindowBoost: boolean;
  /** The first-launch "How do you type today?" screen has been answered or skipped. */
  onboarded: boolean;
}

export const MAX_SESSIONS = 300;

export function defaultProgress(now = Date.now()): Progress {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    keys: {},
    bigrams: {},
    lessons: {},
    fights: {},
    sessions: [],
    daily: {},
    achievements: {},
  };
}

export function defaultSettings(): Settings {
  return {
    reducedMotion: 'system',
    shake: 1,
    flash: 1,
    sfx: 0.8,
    music: 0.5,
    ticks: true,
    errorMode: 'stop',
    textSize: 'M',
    fingerLabels: false,
    colorBlindFingers: false,
    handTone: 'medium',
    showHands: true,
    guidanceOverride: 'auto',
    layout: 'us-qwerty',
    guardWindowBoost: false,
    onboarded: false,
  };
}
