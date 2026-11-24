import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../content/curriculum';
import { overviewRecommendations } from '../learning/results';
import { indexLayout } from '../layout/keys';
import { usQwerty } from '../layout/us-qwerty';
import { defaultProgress, type SessionSummary } from '../store/schema';
import { emptyKeyStat } from './aggregate';
import {
  daysSinceLastSession,
  fightRecord,
  fingerStats,
  isPressure,
  recentHeat,
  sessionsInRange,
  summarize,
  wpmByDay,
} from './dashboard';

const layout = indexLayout(usQwerty);
const NOW = new Date(2026, 10, 24, 18).getTime();
const day = (daysAgo: number, hour = 10) => new Date(2026, 10, 24 - daysAgo, hour).getTime();

const sess = (
  at: number,
  wpm: number,
  accuracy: number,
  seconds: number,
  mode: SessionSummary['mode'] = 'practice',
) =>
  ({
    id: `${at}`,
    at,
    mode,
    ref: 'x',
    wpm,
    rawWpm: wpm,
    accuracy,
    consistency: 0.8,
    durationMs: seconds * 1000,
    weakKeys: [],
  }) as SessionSummary;

const SESSIONS = [
  sess(day(40), 20, 0.9, 60),
  sess(day(10), 30, 0.95, 120, 'learning'),
  sess(day(6), 40, 0.9, 60),
  sess(day(0, 9), 50, 1, 30),
  sess(day(0, 12), 35, 0.8, 90, 'fight'),
];

describe('dashboard numbers', () => {
  it('match the sums of the stored sessions (PLAN Phase 4 acceptance)', () => {
    const calm = SESSIONS.filter((s) => !isPressure(s));
    const ms = calm.reduce((t, s) => t + s.durationMs, 0);
    const sum = summarize(calm)!;
    expect(sum.sessions).toBe(4);
    expect(sum.minutes).toBeCloseTo(ms / 60_000);
    expect(sum.wpm).toBeCloseTo(calm.reduce((t, s) => t + s.wpm * s.durationMs, 0) / ms);
    expect(sum.accuracy).toBeCloseTo(calm.reduce((t, s) => t + s.accuracy * s.durationMs, 0) / ms);
    expect(sum.bestWpm).toBe(50);
    expect(summarize(SESSIONS.filter(isPressure))).toMatchObject({ sessions: 1, wpm: 35, accuracy: 0.8 });
  });

  it('filters by local-day range: today plus the previous 6 or 29 days', () => {
    expect(sessionsInRange(SESSIONS, '7d', NOW).map((s) => s.wpm)).toEqual([40, 50, 35]);
    expect(sessionsInRange(SESSIONS, '30d', NOW)).toHaveLength(4);
    expect(sessionsInRange(SESSIONS, 'all', NOW)).toHaveLength(5);
  });

  it('gives one duration-weighted point per day, oldest first', () => {
    const today = wpmByDay(SESSIONS.slice(3));
    expect(today).toHaveLength(1);
    expect(today[0]!.wpm).toBeCloseTo((50 * 30 + 35 * 90) / 120);
    expect(wpmByDay(SESSIONS).map((d) => d.day)).toEqual(
      [...new Set(wpmByDay(SESSIONS).map((d) => d.day))].sort(),
    );
  });

  it('handles empty progress without NaN', () => {
    const p = defaultProgress(NOW);
    expect(summarize([])).toBeNull();
    expect(wpmByDay([])).toEqual([]);
    for (const f of fingerStats(p, layout)) expect(f).toMatchObject({ presses: 0, accuracy: 0, meanMs: 0 });
    expect(recentHeat(p).size).toBe(0);
    expect(daysSinceLastSession(p, NOW)).toBeNull();
    expect(fightRecord(p)).toEqual({ wins: 0, losses: 0 });
    expect(overviewRecommendations(p, LESSONS, layout, null).map((r) => r.kind)).toEqual(['next']);
  });
});

describe('per finger and per key', () => {
  const p = defaultProgress(NOW);
  p.keys.KeyF = { ...emptyKeyStat(), presses: 100, errors: 10, meanLatencyMs: 200, recent: [1, 0, 1, 1] };
  p.keys.KeyG = { ...emptyKeyStat(), presses: 50, errors: 5, meanLatencyMs: 300, recent: [] };

  it('sums keys into their finger, speed weighted by correct presses', () => {
    const l2 = fingerStats(p, layout).find((f) => f.finger === 'L2')!;
    expect(l2.presses).toBe(150);
    expect(l2.accuracy).toBeCloseTo(1 - 15 / 150);
    expect(l2.meanMs).toBeCloseTo((200 * 90 + 300 * 45) / 135);
  });

  it('heat comes from each key’s recent window', () => {
    expect(recentHeat(p)).toEqual(new Map([['KeyF', { presses: 4, errors: 1 }]]));
  });
});

describe('overview recommendations', () => {
  it('warm-up after 3+ days away, then the weak key’s gym, then the next lesson', () => {
    const p = defaultProgress(NOW);
    p.keys.KeyA = {
      ...emptyKeyStat(),
      presses: 40,
      errors: 10,
      recent: Array.from({ length: 20 }, (_, i) => (i % 4 ? 1 : 0)),
    };
    const recs = overviewRecommendations(p, LESSONS, layout, 3);
    expect(recs.map((r) => r.kind)).toEqual(['gym', 'gym', 'next']);
    expect(recs[0]!.label).toMatch(/warm-up/i);
    expect(recs[1]).toMatchObject({ lessonId: 'gym.l5' });
    expect(overviewRecommendations(p, LESSONS, layout, 2)).toHaveLength(2);
  });
});
