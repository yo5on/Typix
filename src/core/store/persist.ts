import { defaultProgress, defaultSettings, MAX_SESSIONS, type Progress, type Settings } from './schema';
import { migrate } from './migrations';
import { isProgress, sanitizeSettings } from './validate';

/** The subset of the Web Storage API we use, so tests can pass an in-memory store. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const PROGRESS_KEY = 'homerow.progress';
export const SETTINGS_KEY = 'homerow.settings';
/** A corrupt or unreadable save is copied here instead of being overwritten, so it can be recovered. */
export const CORRUPT_KEY = 'homerow.progress.corrupt';

export type LoadResult<T> = { value: T; recovered: boolean };

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const text = store.getItem(key);
    return text === null ? undefined : JSON.parse(text);
  } catch {
    return null; // unreadable JSON or storage access denied
  }
}

/** Loads progress, migrating old saves. `recovered: true` means the stored save was unusable and was set aside. */
export function loadProgress(store: KeyValueStore): LoadResult<Progress> {
  const raw = readJson(store, PROGRESS_KEY);
  if (raw === undefined) return { value: defaultProgress(), recovered: false };
  try {
    const migrated = migrate(raw);
    if (isProgress(migrated)) return { value: migrated, recovered: false };
  } catch {
    // fall through to recovery
  }
  try {
    const text = store.getItem(PROGRESS_KEY);
    if (text !== null) store.setItem(CORRUPT_KEY, text);
  } catch {
    // nothing more we can do; the default progress below still lets the app run
  }
  return { value: defaultProgress(), recovered: true };
}

export function loadSettings(store: KeyValueStore): Settings {
  const raw = readJson(store, SETTINGS_KEY);
  return raw === undefined ? defaultSettings() : sanitizeSettings(raw);
}

export type SaveResult = { ok: true; trimmed: boolean } | { ok: false; error: string };

/**
 * Saves progress. If storage is full, drops the oldest sessions (aggregates are kept) and retries once.
 * shortcut: trimming drops old session summaries outright; roll them into `daily` once stats exist (Phase 1).
 */
export function saveProgress(store: KeyValueStore, progress: Progress): SaveResult {
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return { ok: true, trimmed: false };
  } catch {
    const trimmed = { ...progress, sessions: progress.sessions.slice(-Math.floor(MAX_SESSIONS / 3)) };
    try {
      store.setItem(PROGRESS_KEY, JSON.stringify(trimmed));
      return { ok: true, trimmed: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): SaveResult {
  try {
    store.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { ok: true, trimmed: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
