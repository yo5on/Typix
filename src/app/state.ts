import { effect, signal } from '@preact/signals';
import type { Progress, Settings } from '../core/store/schema';
import { loadProgress, loadSettings, saveProgress, saveSettings } from '../core/store/persist';

// One app-wide copy of progress and settings. Screens read and replace these signals; saving is automatic.

function browserStore(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null; // storage disabled (e.g. strict privacy mode): the app still runs, nothing persists
  }
}

const store = browserStore();
const memory = new Map<string, string>();
const kv = store ?? {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
};

const loaded = loadProgress(kv);

export const progress = signal<Progress>(loaded.value);
export const settings = signal<Settings>(loadSettings(kv));

/** Shown as a banner: why saving is not working, or that an unreadable save was set aside. */
export const storageNotice = signal<string | null>(
  !store
    ? 'Browser storage is unavailable, so progress will not be saved. Export it before closing the tab.'
    : loaded.recovered
      ? 'Your saved progress could not be read, so it was set aside and a fresh profile was started.'
      : null,
);

export function updateSettings(patch: Partial<Settings>) {
  settings.value = { ...settings.value, ...patch };
}

function flushProgress() {
  const result = saveProgress(kv, progress.value);
  if (!result.ok) storageNotice.value = 'Storage is full and progress could not be saved. Export a backup.';
}

let timer: ReturnType<typeof setTimeout> | undefined;
let first = true;
effect(() => {
  void progress.value; // subscribe
  if (first) return void (first = false);
  clearTimeout(timer);
  timer = setTimeout(flushProgress, 1000);
});

effect(() => {
  const result = saveSettings(kv, settings.value);
  if (!result.ok) storageNotice.value = 'Settings could not be saved: browser storage is full.';
});

addEventListener('pagehide', () => {
  if (timer !== undefined) {
    clearTimeout(timer);
    flushProgress();
  }
});

/** Replaces progress and saves at once (Reset and Import must not wait for the debounce). */
export function replaceProgress(next: Progress) {
  progress.value = next;
  clearTimeout(timer);
  flushProgress();
}

// Reduced motion: follow the OS unless the player overrides it. Applied as <html data-motion>.
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const systemReduced = signal(motionQuery.matches);
motionQuery.addEventListener('change', (e) => (systemReduced.value = e.matches));

export const reducedMotion = signal(false);
effect(() => {
  const pref = settings.value.reducedMotion;
  reducedMotion.value = pref === 'on' || (pref === 'system' && systemReduced.value);
  document.documentElement.dataset.motion = reducedMotion.value ? 'reduce' : 'full';
});

effect(() => {
  document.documentElement.dataset.textSize = settings.value.textSize;
});
