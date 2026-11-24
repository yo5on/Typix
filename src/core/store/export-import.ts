import type { Progress, Settings } from './schema';
import { migrate, MigrationError } from './migrations';
import { isObj, isProgress, sanitizeSettings } from './validate';

export const EXPORT_APP_ID = 'typix';
/** Imports larger than this are rejected before parsing. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  app: typeof EXPORT_APP_ID;
  exportedAt: string;
  progress: Progress;
  settings: Settings;
}

export function buildExport(progress: Progress, settings: Settings, now = new Date()): ExportFile {
  return { app: EXPORT_APP_ID, exportedAt: now.toISOString(), progress, settings };
}

export function exportFileName(now = new Date()): string {
  return `typix-progress-${now.toISOString().slice(0, 10)}.json`;
}

export interface ImportSummary {
  lessonsCompleted: number;
  sessions: number;
  fights: number;
  exportedAt: string;
}

export type ImportResult =
  { ok: true; progress: Progress; settings: Settings; summary: ImportSummary } | { ok: false; error: string };

/** Parses and validates an exported file. Never trusts the file: wrong shapes are rejected, not repaired. */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'File is too large to be a Typix save.' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!isObj(data) || data.app !== EXPORT_APP_ID) {
    return { ok: false, error: 'This is not a Typix progress file.' };
  }
  let progress: unknown;
  try {
    progress = migrate(data.progress);
  } catch (e) {
    return { ok: false, error: e instanceof MigrationError ? e.message : 'Progress data is unreadable.' };
  }
  if (!isProgress(progress)) return { ok: false, error: 'Progress data is damaged or incomplete.' };
  return {
    ok: true,
    progress,
    settings: sanitizeSettings(data.settings),
    summary: {
      lessonsCompleted: Object.values(progress.lessons).filter((l) => l.completed).length,
      sessions: progress.sessions.length,
      fights: Object.values(progress.fights).reduce((n, f) => n + f.wins + f.losses, 0),
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : 'unknown date',
    },
  };
}
