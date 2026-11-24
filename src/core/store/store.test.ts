import { describe, expect, it } from 'vitest';
import { defaultProgress, defaultSettings, SCHEMA_VERSION, type Progress } from './schema';
import { migrate, MigrationError } from './migrations';
import {
  CORRUPT_KEY,
  loadProgress,
  loadSettings,
  PROGRESS_KEY,
  saveProgress,
  saveSettings,
  SETTINGS_KEY,
  type KeyValueStore,
} from './persist';
import { buildExport, parseImport } from './export-import';
import { isProgress, sanitizeSettings } from './validate';

function memoryStore(limitBytes = Infinity): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (v.length > limitBytes) throw new DOMException('quota', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem: (k) => void data.delete(k),
  };
}

function sampleProgress(sessionCount = 3): Progress {
  const p = defaultProgress(1_700_000_000_000);
  const mode = { presses: 40, errors: 2, meanLatencyMs: 210 };
  p.keys.KeyF = { ...mode, recent: [1, 1, 0, 1], guidance: 2, byMode: { calm: mode, pressure: mode } };
  p.bigrams.fj = { n: 12, meanMs: 180, errors: 1 };
  p.lessons['u1.l1'] = { completed: true, mastered: false, best: 0.96, plays: 2 };
  p.fights.rook = { wins: 1, losses: 2, bestCombo: 7 };
  p.daily['2026-11-24'] = { minutes: 12, wpmCalm: 31 };
  p.achievements.first_lesson = 1_700_000_100_000;
  for (let i = 0; i < sessionCount; i++) {
    p.sessions.push({
      id: `s${i}`,
      at: 1_700_000_000_000 + i,
      mode: 'learning',
      ref: 'u1.l1',
      wpm: 20,
      rawWpm: 22,
      accuracy: 0.95,
      consistency: 0.7,
      durationMs: 60_000,
      weakKeys: ['KeyA'],
    });
  }
  return p;
}

describe('validation', () => {
  it('accepts default and populated progress', () => {
    expect(isProgress(defaultProgress())).toBe(true);
    expect(isProgress(sampleProgress())).toBe(true);
  });

  it('rejects damaged progress', () => {
    const p = sampleProgress() as unknown as Record<string, unknown>;
    expect(isProgress({ ...p, sessions: 'nope' })).toBe(false);
    expect(isProgress({ ...p, keys: { KeyF: { presses: 'x' } } })).toBe(false);
    expect(isProgress({ ...p, schemaVersion: SCHEMA_VERSION + 1 })).toBe(false);
    expect(isProgress(null)).toBe(false);
  });

  it('sanitizes settings field by field', () => {
    const s = sanitizeSettings({
      sfx: 0.3,
      shake: 7,
      textSize: 'XL',
      layout: 'dvorak',
      evil: true,
      onboarded: true,
    });
    expect(s.onboarded).toBe(true);
    expect(sanitizeSettings({ onboarded: 'yes' }).onboarded).toBe(false);
    expect(s.sfx).toBe(0.3);
    expect(s.shake).toBe(defaultSettings().shake);
    expect(s.textSize).toBe('XL');
    expect(s.layout).toBe('us-qwerty');
    expect('evil' in s).toBe(false);
    expect(sanitizeSettings('garbage')).toEqual(defaultSettings());
  });
});

describe('migrations', () => {
  it('runs steps in order up to the target version', () => {
    const steps = {
      1: (d: Record<string, unknown>) => ({ ...d, a: 1 }),
      2: (d: Record<string, unknown>) => ({ ...d, b: (d.a as number) + 1 }),
    };
    expect(migrate({ schemaVersion: 1 }, 3, steps)).toEqual({ schemaVersion: 3, a: 1, b: 2 });
  });

  it('leaves current-version data untouched', () => {
    const p = sampleProgress();
    expect(migrate(p)).toEqual(p);
  });

  it('rejects missing, future and unbridgeable versions', () => {
    expect(() => migrate({})).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(/newer version/);
    expect(() => migrate({ schemaVersion: 0 }, 1, {})).toThrow(/No migration/);
  });
});

describe('persistence', () => {
  it('returns defaults on first launch', () => {
    const store = memoryStore();
    expect(loadProgress(store)).toEqual({
      value: expect.objectContaining({ sessions: [] }),
      recovered: false,
    });
    expect(loadSettings(store)).toEqual(defaultSettings());
  });

  it('round-trips progress and settings', () => {
    const store = memoryStore();
    const settings = { ...defaultSettings(), sfx: 0.1, reducedMotion: 'on' as const };
    expect(saveProgress(store, sampleProgress())).toEqual({ ok: true, trimmed: false });
    expect(saveSettings(store, settings).ok).toBe(true);
    expect(loadProgress(store)).toEqual({ value: sampleProgress(), recovered: false });
    expect(loadSettings(store)).toEqual(settings);
  });

  it('sets a corrupt save aside instead of overwriting it', () => {
    const store = memoryStore();
    store.setItem(PROGRESS_KEY, '{not json');
    const result = loadProgress(store);
    expect(result.recovered).toBe(true);
    expect(isProgress(result.value)).toBe(true);
    expect(store.getItem(CORRUPT_KEY)).toBe('{not json');
  });

  it('survives unreadable settings', () => {
    const store = memoryStore();
    store.setItem(SETTINGS_KEY, '][');
    expect(loadSettings(store)).toEqual(defaultSettings());
  });

  it('trims old sessions when storage is full, keeping aggregates', () => {
    const big = sampleProgress(300);
    const fullSize = JSON.stringify(big).length;
    const store = memoryStore(fullSize - 1);
    expect(saveProgress(store, big)).toEqual({ ok: true, trimmed: true });
    const loaded = loadProgress(store).value;
    expect(loaded.sessions.length).toBe(100);
    expect(loaded.sessions.at(-1)?.id).toBe('s299');
    expect(loaded.keys).toEqual(big.keys);
  });

  it('reports failure when even a trimmed save does not fit', () => {
    expect(saveProgress(memoryStore(10), sampleProgress()).ok).toBe(false);
  });
});

describe('export and import', () => {
  it('export → reset → import restores identical progress and settings', () => {
    const store = memoryStore();
    const settings = { ...defaultSettings(), music: 0.2, errorMode: 'continue' as const };
    saveProgress(store, sampleProgress());
    saveSettings(store, settings);

    const file = JSON.stringify(buildExport(loadProgress(store).value, loadSettings(store)));
    store.data.clear(); // reset
    expect(loadProgress(store).value.sessions).toEqual([]);

    const imported = parseImport(file);
    if (!imported.ok) throw new Error(imported.error);
    saveProgress(store, imported.progress);
    saveSettings(store, imported.settings);

    expect(loadProgress(store).value).toEqual(sampleProgress());
    expect(loadSettings(store)).toEqual(settings);
    expect(imported.summary).toMatchObject({ lessonsCompleted: 1, sessions: 3, fights: 3 });
  });

  it.each([
    ['not JSON', '{'],
    ['another app', JSON.stringify({ app: 'other', progress: defaultProgress() })],
    ['missing progress', JSON.stringify({ app: 'typix' })],
    ['future version', JSON.stringify({ app: 'typix', progress: { schemaVersion: 999 } })],
    [
      'damaged progress',
      JSON.stringify({ app: 'typix', progress: { ...defaultProgress(), sessions: [{ id: 1 }] } }),
    ],
    ['oversized', 'x'.repeat(5 * 1024 * 1024 + 1)],
  ])('rejects %s', (_name, text) => {
    expect(parseImport(text).ok).toBe(false);
  });

  it('ignores prototype-pollution keys in imported settings', () => {
    const text = `{"app":"typix","progress":${JSON.stringify(defaultProgress())},"settings":{"__proto__":{"polluted":true}}}`;
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
