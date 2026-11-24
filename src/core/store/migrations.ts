import { SCHEMA_VERSION } from './schema';
import { isObj } from './validate';

/** migrations[n] upgrades a save from version n to n + 1. Add one per schema bump, with a fixture test. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Record<number, Migration> = {};

export class MigrationError extends Error {}

/** Upgrades raw saved data to `target`. Throws MigrationError for unknown, future or broken versions. */
export function migrate(raw: unknown, target = SCHEMA_VERSION, steps = migrations): unknown {
  if (!isObj(raw) || typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion)) {
    throw new MigrationError('Save has no schema version.');
  }
  if (raw.schemaVersion > target) {
    throw new MigrationError(`Save is from a newer version (${raw.schemaVersion}) of Typix.`);
  }
  let data = raw;
  for (let v = raw.schemaVersion; v < target; v++) {
    const step = steps[v];
    if (!step) throw new MigrationError(`No migration from version ${v}.`);
    data = { ...step(data), schemaVersion: v + 1 };
  }
  return data;
}
