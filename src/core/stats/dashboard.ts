import type { LayoutIndex } from '../layout/keys';
import type { FingerId, Progress, SessionSummary } from '../store/schema';
import { localDay } from './aggregate';

/** Numbers for the Stats & Progress screen. Pure: `now` is passed in so tests are deterministic. */

export type StatsRange = '7d' | '30d' | 'all';
const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<StatsRange, number> = { '7d': 7, '30d': 30, all: Infinity };

/** Fight is "under pressure"; Learning and Practice are calm (PLAN §2.5). */
export const isPressure = (s: SessionSummary) => s.mode === 'fight';

/** Sessions inside the range: today plus the previous 6 or 29 local days. */
export function sessionsInRange(
  sessions: SessionSummary[],
  range: StatsRange,
  now: number,
): SessionSummary[] {
  if (range === 'all') return sessions;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (RANGE_DAYS[range] - 1));
  return sessions.filter((s) => s.at >= start.getTime() && s.at <= now);
}

export interface ModeSummary {
  sessions: number;
  minutes: number;
  /** WPM and accuracy are weighted by session duration, so a 2-minute test counts more than a 10-second one. */
  wpm: number;
  accuracy: number;
  bestWpm: number;
}

export function summarize(sessions: SessionSummary[]): ModeSummary | null {
  if (!sessions.length) return null;
  let ms = 0;
  let wpm = 0;
  let acc = 0;
  for (const s of sessions) {
    ms += s.durationMs;
    wpm += s.wpm * s.durationMs;
    acc += s.accuracy * s.durationMs;
  }
  return {
    sessions: sessions.length,
    minutes: ms / 60_000,
    wpm: ms ? wpm / ms : 0,
    accuracy: ms ? acc / ms : 0,
    bestWpm: Math.max(...sessions.map((s) => s.wpm)),
  };
}

/** Duration-weighted WPM per local day that has sessions, oldest first. */
export function wpmByDay(sessions: SessionSummary[]): { day: string; wpm: number }[] {
  const days = new Map<string, { ms: number; w: number }>();
  for (const s of sessions) {
    const d = localDay(s.at);
    const v = days.get(d) ?? { ms: 0, w: 0 };
    v.ms += s.durationMs;
    v.w += s.wpm * s.durationMs;
    days.set(d, v);
  }
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, wpm: v.ms ? v.w / v.ms : 0 }));
}

export const STAT_FINGERS: FingerId[] = ['L5', 'L4', 'L3', 'L2', 'R2', 'R3', 'R4', 'R5'];

export interface FingerStat {
  finger: FingerId;
  presses: number;
  accuracy: number;
  /** Mean time to press this finger's keys correctly, weighted by correct presses. 0 when unknown. */
  meanMs: number;
}

/** Lifetime accuracy and speed per finger, from the per-key stats. */
export function fingerStats(progress: Progress, layout: LayoutIndex): FingerStat[] {
  return STAT_FINGERS.map((finger) => {
    let presses = 0;
    let errors = 0;
    let correct = 0;
    let ms = 0;
    for (const [code, k] of Object.entries(progress.keys)) {
      // Shift is scored with every capital, on top of the letter: counting it here would double-count presses.
      if (code.startsWith('Shift') || layout.byCode.get(code)?.finger !== finger) continue;
      presses += k.presses;
      errors += k.errors;
      const ok = k.presses - k.errors;
      if (k.meanLatencyMs > 0) {
        correct += ok;
        ms += k.meanLatencyMs * ok;
      }
    }
    return {
      finger,
      presses,
      accuracy: presses ? 1 - errors / presses : 0,
      meanMs: correct ? ms / correct : 0,
    };
  });
}

/** Left and right Shift over their last 50 uses (null when not used yet), for the Stats screen. */
export function shiftStats(progress: Progress) {
  return (['ShiftLeft', 'ShiftRight'] as const).map((code) => {
    const recent = progress.keys[code]?.recent ?? [];
    return {
      code,
      label: code === 'ShiftLeft' ? 'Left Shift' : 'Right Shift',
      presses: progress.keys[code]?.presses ?? 0,
      accuracy: recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null,
    };
  });
}

/** Per-key heat for the mastery keyboard: each key's last 50 results. */
export function recentHeat(progress: Progress): Map<string, { presses: number; errors: number }> {
  return new Map(
    Object.entries(progress.keys)
      .filter(([, k]) => k.recent.length > 0)
      .map(([code, k]) => [
        code,
        { presses: k.recent.length, errors: k.recent.filter((r) => r === 0).length },
      ]),
  );
}

export function daysSinceLastSession(progress: Progress, now: number): number | null {
  const last = progress.sessions.at(-1);
  return last ? Math.floor((now - last.at) / DAY_MS) : null;
}

export function fightRecord(progress: Progress): { wins: number; losses: number } {
  return Object.values(progress.fights).reduce(
    (t, f) => ({ wins: t.wins + f.wins, losses: t.losses + f.losses }),
    { wins: 0, losses: 0 },
  );
}
