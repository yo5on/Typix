import { defaultSettings, SCHEMA_VERSION, type Progress, type Settings } from './schema';

// Everything read from storage or an imported file is untrusted: check shapes before use.

type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRecordOf = (v: unknown, check: (x: unknown) => boolean) => isObj(v) && Object.values(v).every(check);

const isModeStat = (v: unknown) => isObj(v) && isNum(v.presses) && isNum(v.errors) && isNum(v.meanLatencyMs);

const isKeyStat = (v: unknown) =>
  isModeStat(v) &&
  isObj(v) &&
  Array.isArray(v.recent) &&
  v.recent.every((x) => x === 0 || x === 1) &&
  [0, 1, 2, 3].includes(v.guidance as number) &&
  isObj(v.byMode) &&
  isModeStat(v.byMode.calm) &&
  isModeStat(v.byMode.pressure);

const isSession = (v: unknown) =>
  isObj(v) &&
  typeof v.id === 'string' &&
  typeof v.ref === 'string' &&
  ['learning', 'practice', 'fight'].includes(v.mode as string) &&
  [v.at, v.wpm, v.rawWpm, v.accuracy, v.consistency, v.durationMs].every(isNum) &&
  Array.isArray(v.weakKeys) &&
  v.weakKeys.every((k) => typeof k === 'string');

/** Validates a progress object of the *current* schema version. Run migrations first. */
export function isProgress(v: unknown): v is Progress {
  return (
    isObj(v) &&
    v.schemaVersion === SCHEMA_VERSION &&
    isNum(v.createdAt) &&
    isRecordOf(v.keys, isKeyStat) &&
    isRecordOf(v.bigrams, (b) => isObj(b) && isNum(b.n) && isNum(b.meanMs) && isNum(b.errors)) &&
    isRecordOf(
      v.lessons,
      (l) =>
        isObj(l) &&
        typeof l.completed === 'boolean' &&
        typeof l.mastered === 'boolean' &&
        isNum(l.best) &&
        isNum(l.plays),
    ) &&
    isRecordOf(v.fights, (f) => isObj(f) && isNum(f.wins) && isNum(f.losses) && isNum(f.bestCombo)) &&
    Array.isArray(v.sessions) &&
    v.sessions.every(isSession) &&
    isRecordOf(v.daily, (d) => isObj(d) && isNum(d.minutes)) &&
    isRecordOf(v.achievements, isNum)
  );
}

const oneOf =
  <T>(...allowed: T[]) =>
  (v: unknown): v is T =>
    allowed.includes(v as T);
const unit = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1;
const bool = (v: unknown): v is boolean => typeof v === 'boolean';

const settingChecks: { [K in keyof Settings]: (v: unknown) => boolean } = {
  reducedMotion: oneOf('system', 'on', 'off'),
  shake: unit,
  flash: unit,
  sfx: unit,
  music: unit,
  ticks: bool,
  errorMode: oneOf('stop', 'continue'),
  textSize: oneOf('S', 'M', 'L', 'XL'),
  fingerLabels: bool,
  handTone: oneOf('light', 'medium', 'tan', 'deep', 'ghost'),
  showHands: bool,
  guidanceOverride: oneOf<string | number>('auto', 0, 1, 2, 3),
  layout: oneOf('us-qwerty'),
  guardWindowBoost: bool,
};

/** Keeps every valid field, replaces missing or invalid ones with defaults, drops unknown keys. */
export function sanitizeSettings(v: unknown): Settings {
  const out = defaultSettings();
  if (!isObj(v)) return out;
  for (const key of Object.keys(settingChecks) as (keyof Settings)[]) {
    if (settingChecks[key](v[key])) (out as unknown as Obj)[key] = v[key];
  }
  return out;
}
