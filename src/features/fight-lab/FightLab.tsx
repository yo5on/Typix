import { useEffect, useRef, useState } from 'preact/hooks';
import { navigate } from '../../app/router';
import { settings } from '../../app/state';
import { enCommonWords } from '../../content/words/en-common';
import { FightAi, type Difficulty } from '../../core/fight/ai';
import { enemyHp, HEAL, NEXT_ENEMY_TICKS, pointsFor, tierFor, weaponFor } from '../../core/fight/gauntlet';
import { MOVE_IDS, MOVES, type MoveId } from '../../core/fight/moves';
import {
  createFight,
  MAX_HP,
  step,
  TICK_HZ,
  type FighterId,
  type FightInput,
  type FightState,
} from '../../core/fight/sim';
import { TypingFighter, wordPickers } from '../../core/fight/typingAttack';
import { seededRng } from '../../core/textgen/generate';
import { Button, Segmented, Toggle } from '../../ui/components/controls';
import { Screen } from '../../ui/components/Screen';
import { FightRenderer, SKINS } from '../../ui/fight/renderer';
import { useTypingKeys } from '../../ui/typing/useTypingKeys';
import s from './FightLab.module.css';

/**
 * The Fight screen: a typing fight against the AI. With `dev`, it is the Fight Lab test bench, adding playback,
 * manual controls and debug views. Typing here never writes progress or stats.
 */
const SPEEDS = [0.1, 0.25, 0.5, 1, 2] as const;
const TICK = 1 / TICK_HZ;
/** Fighters start apart and walk in. */
const START_GAP = 2.6;
/** Ticks a callout ("Counter!", "3 hit combo") stays up. */
const CALLOUT_TICKS = 50;

type Pace = 'realtime' | 'relaxed';
/** 'practice' is a sparring dummy that never attacks, so the fight cannot be lost. */
type Opponent = Difficulty | 'practice';

interface Hud {
  hp: [number, number];
  enemyMax: number;
  combo: [number, number];
  /** The run is over only when the player goes down; a beaten enemy is replaced. */
  over: boolean;
  winner: FightState['winner'];
  tick: number;
  counterReady: boolean;
  callout: string | null;
  score: number;
  kos: number;
  tier: number;
}

interface Match {
  sim: FightState;
  renderer: FightRenderer;
  player: TypingFighter;
  ai: FightAi | null;
  opts: { aiOn: boolean; level: Opponent; pace: Pace };
  maxCombo: number;
  callout: { text: string; until: number } | null;
  score: number;
  kos: number;
  tier: number;
  /** Ticks across every enemy in this run, and when the next enemy walks in (null while one is fighting). */
  elapsed: number;
  nextAt: number | null;
}

/** Enemy body colour per tier, so a stronger enemy looks different. */
const TIER_COLORS = ['#ff8a3d', '#ff5d5d', '#c86bff', '#4fc3ff', '#ffd23f', '#3ddc84', '#ff3d8a'];
const enemyColor = (tier: number) => TIER_COLORS[tier % TIER_COLORS.length]!;

function makeAi(o: Match['opts'], seed: number, tier: number): FightAi | null {
  return o.aiOn && o.level !== 'practice'
    ? new FightAi(1, o.level, seed ^ 0x5f3759df, o.pace === 'relaxed', tier)
    : null;
}

function newMatch(aiOn: boolean, level: Opponent, pace: Pace): Match {
  const seed = Date.now() >>> 0;
  const opts = { aiOn, level, pace };
  return {
    sim: createFight({ gap: START_GAP }),
    renderer: new FightRenderer(),
    player: new TypingFighter(0, wordPickers(enCommonWords, seededRng(seed))),
    ai: makeAi(opts, seed, 0),
    opts,
    maxCombo: 0,
    callout: { text: 'Fight!', until: 60 },
    score: 0,
    kos: 0,
    tier: 0,
    elapsed: 0,
    nextAt: null,
  };
}

/** The next enemy walks in: tier from the score so far, the player keeps their HP plus a small heal. */
function nextEnemy(m: Match) {
  const tier = tierFor(m.score);
  const sim = createFight({ gap: START_GAP });
  sim.fighters[0].hp = Math.min(MAX_HP, m.sim.fighters[0].hp + HEAL);
  sim.fighters[1].hp = enemyHp(tier);
  const armed = weaponFor(tier) !== weaponFor(m.tier) ? weaponFor(tier) : null;
  m.callout = {
    text: armed
      ? `Enemy ${m.kos + 1} has a ${armed === 'sword' ? 'sword' : 'staff'}!`
      : tier > m.tier
        ? `Enemy ${m.kos + 1} · Stronger!`
        : `Enemy ${m.kos + 1}`,
    until: 80,
  };
  m.sim = sim;
  m.tier = tier;
  m.ai = makeAi(m.opts, (Date.now() >>> 0) + m.kos, tier);
  m.nextAt = null;
}

/** Blur radio inputs after a click so typing keys reach the fight again. */
const release = () => (document.activeElement as HTMLElement | null)?.blur();

export function FightLab({ dev = false }: { dev?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rematchRef = useRef<HTMLButtonElement>(null);
  const queue = useRef<FightInput[]>([]);

  const [aiOn, setAiOn] = useState(true);
  const [level, setLevel] = useState<Opponent>('normal');
  const [pace, setPace] = useState<Pace>('realtime');
  const match = useRef<Match>(newMatch(aiOn, level, pace));

  const [speed, setSpeed] = useState<number>(1);
  const [paused, setPaused] = useState(false);
  const [skinId, setSkinId] = useState(SKINS[0]!.id);
  const [skeleton, setSkeleton] = useState(false);
  const [hitboxes, setHitboxes] = useState(false);
  const [typing, setTyping] = useState(true);
  const [attacker, setAttacker] = useState<FighterId>(1);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [hud, setHud] = useState<Hud>(() => readHud(match.current));
  const [, rerender] = useState(0);

  // Everything the frame loop reads lives in one ref so the loop never restarts.
  const live = useRef({ speed, paused, skinId, skeleton, hitboxes, typing, steps: 0 });
  live.current = { ...live.current, speed, paused, skinId, skeleton, hitboxes, typing };

  // The lab swaps the opponent mid-fight. The real Fight restarts, so an attack already under way can't land in Practice.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (dev) {
      const m = match.current;
      m.opts = { aiOn, level, pace };
      m.ai = makeAi(m.opts, Date.now() >>> 0, m.tier);
    }
    else rematch();
  }, [aiOn, level, pace]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const fit = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();

    let acc = 0;
    let last = performance.now();
    let frames = 0;
    let work = 0;
    let fpsAt = last;
    let raf = 0;
    const tick = () => {
      const m = match.current;
      const inputs = queue.current.splice(0);
      if (live.current.typing) inputs.push(...m.player.update(m.sim));
      if (m.ai) inputs.push(...m.ai.think(m.sim));
      m.sim = step(m.sim, inputs);
      m.renderer.tick(m.sim);
      m.elapsed++;
      if (!playerDown(m.sim)) m.score += pointsFor(m.sim.events);
      if (m.sim.winner === 0 && m.nextAt === null) {
        m.kos++;
        m.nextAt = m.elapsed + NEXT_ENEMY_TICKS;
      } else if (m.nextAt !== null && m.elapsed >= m.nextAt) nextEnemy(m);
      for (const e of m.sim.events) {
        if (e.kind === 'hit' && e.attacker === 0) m.maxCombo = Math.max(m.maxCombo, e.combo);
        const text =
          e.kind === 'hit' && e.counter
            ? 'Counter!'
            : e.kind === 'hit' && e.combo >= 2
              ? `${e.combo} hit combo`
              : e.kind === 'block'
                ? 'Blocked'
                : e.kind === 'evade'
                  ? 'Dodged'
                  : e.kind === 'ko'
                    ? 'K.O.'
                    : null;
        if (text) m.callout = { text, until: m.sim.tick + CALLOUT_TICKS };
      }
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const l = live.current;
      // Clamp, so returning to a hidden tab doesn't replay seconds of fight at once.
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!l.paused) acc += dt * l.speed;
      for (; l.steps > 0; l.steps--) tick();
      while (acc >= TICK) {
        tick();
        acc -= TICK;
      }
      const m = match.current;
      const motion = document.documentElement.dataset.motion === 'reduce' ? 0 : 1;
      m.renderer.draw(ctx, m.sim, l.paused ? 1 : acc / TICK, {
        skin: SKINS.find((k) => k.id === l.skinId)!,
        skeleton: l.skeleton,
        hitboxes: l.hitboxes,
        shake: settings.value.shake * motion,
        flash: settings.value.flash,
        colors: { 1: enemyColor(m.tier) },
        weapons: { 1: m.ai ? weaponFor(m.tier) : null },
      });
      const next = readHud(m);
      setHud((h) => (sameHud(h, next) && (!l.paused || h.tick === next.tick) ? h : next));
      frames++;
      work += performance.now() - now;
      if (now - fpsAt >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsAt)));
        setFrameMs(Math.round((work / frames) * 100) / 100);
        frames = 0;
        work = 0;
        fpsAt = now;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const over = hud.over;
  const player = match.current.player;
  useTypingKeys(typing && !over && !paused, {
    onKey: (key, t) => {
      queue.current.push(...player.key(key, t));
      rerender((n) => n + 1);
    },
  });

  useEffect(() => {
    if (over) rematchRef.current?.focus();
  }, [over]);

  function rematch() {
    match.current = newMatch(aiOn, level, pace);
    queue.current = [];
    setHud(readHud(match.current));
    release();
  }

  const manual = (input: FightInput) => queue.current.push(input);
  const defense = player.defense;
  const a = player.attack;

  return (
    <Screen
      title={dev ? 'Fight Lab' : 'Fight'}
      onBack={() => navigate('menu')}
      aside={dev ? <span class={s.dev}>DEV ONLY</span> : undefined}
    >
      <div class={s.layout}>
        <div class={s.stage}>
          <div class={s.hud}>
            <HpBar label="You" hp={hud.hp[0]} max={MAX_HP} combo={hud.combo[0]} />
            <span class={`${s.fps} num`}>
              Score {hud.score} · KOs {hud.kos}
              {dev && ` · ${fps} fps · ${frameMs} ms`}
            </span>
            <HpBar
              label={
                !aiOn
                  ? 'P2'
                  : level === 'practice'
                    ? `Dummy ${hud.kos + 1}`
                    : `Enemy ${hud.kos + 1} · Lv ${hud.tier + 1}`
              }
              hp={hud.hp[1]}
              max={hud.enemyMax}
              combo={hud.combo[1]}
              right
            />
          </div>
          <div class={s.canvasWrap}>
            <canvas ref={canvasRef} class={s.canvas} />
            {hud.callout && !over && (
              <div class={s.callout} key={hud.callout} aria-hidden="true">
                {hud.callout}
              </div>
            )}
            {over && (
              <div class={s.result} role="dialog" aria-label="Fight over">
                <strong class={s.resultTitle}>Game over</strong>
                <dl class={`${s.stats} num`}>
                  <div>
                    <dt>Score</dt>
                    <dd>{hud.score}</dd>
                  </div>
                  <div>
                    <dt>Enemies defeated</dt>
                    <dd>{hud.kos}</dd>
                  </div>
                  <div>
                    <dt>Best combo</dt>
                    <dd>{match.current.maxCombo}</dd>
                  </div>
                  <div>
                    <dt>Accuracy</dt>
                    <dd>{Math.round(player.accuracy * 100)}%</dd>
                  </div>
                  <div>
                    <dt>Attacks typed</dt>
                    <dd>{player.words}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>{Math.round(match.current.elapsed / TICK_HZ)}s</dd>
                  </div>
                </dl>
                <Button variant="primary" ref={rematchRef} onClick={rematch}>
                  Play again
                </Button>
                <span class={s.meta}>Enter to play again · Esc for the menu</span>
              </div>
            )}
          </div>
          <div class={`${s.prompt} ${defense ? s.defending : ''}`} aria-live="polite">
            {!typing ? (
              <span class={s.meta}>Typing is off</span>
            ) : over ? (
              <span class={s.meta}>Fight over</span>
            ) : defense ? (
              <>
                <span class={s.tag}>Defend</span>
                <Word text={defense.session.target} pos={defense.session.pos} />
                <span class={s.meta}>
                  Type it before the strike lands · clean = dodge and counter · with a typo = block
                </span>
              </>
            ) : (
              <>
                <span class={s.tag}>{hud.counterReady ? 'Counter ready' : 'Attack'}</span>
                <Word text={a.word} pos={a.session.pos} />
                <span class={s.meta}>
                  {MOVES[a.move].name} · charge {Math.round((a.session.pos / a.word.length) * 100)}% ·
                  accuracy {Math.round(player.accuracy * 100)}%
                </span>
              </>
            )}
          </div>
        </div>

        <aside class={s.panel} aria-label={dev ? 'Developer controls' : 'Match settings'}>
          <section>
            <h2>Match</h2>
            {dev && <Switch id="lab-ai" label="AI opponent (P2)" checked={aiOn} onChange={setAiOn} />}
            <span class={s.label} id="lab-level-label">
              Difficulty
            </span>
            <Segmented
              id="lab-level"
              value={level}
              options={[
                { value: 'practice', label: 'Practice' },
                { value: 'easy', label: 'Easy' },
                { value: 'normal', label: 'Normal' },
                { value: 'hard', label: 'Hard' },
              ]}
              onChange={(v) => {
                setLevel(v);
                release();
              }}
            />
            <span class={s.label} id="lab-pace-label">
              Pace
            </span>
            <Segmented
              id="lab-pace"
              value={pace}
              options={[
                { value: 'realtime', label: 'Real-time' },
                { value: 'relaxed', label: 'Relaxed' },
              ]}
              onChange={(v) => {
                setPace(v);
                release();
              }}
            />
            <p class={s.hint}>
              Practice: a sparring dummy that never hits back. Relaxed: the AI charges more slowly and rests
              longer between attacks.
            </p>
            <Button variant="ghost" onClick={rematch}>
              Restart fight
            </Button>
          </section>

          {dev && (
            <>
              <section>
                <h2>Playback</h2>
                <div class={s.row}>
                  <Button
                    onClick={() => {
                      setPaused(!paused);
                      release();
                    }}
                  >
                    {paused ? 'Play' : 'Pause'}
                  </Button>
                  <Button disabled={!paused} onClick={() => live.current.steps++}>
                    Step frame
                  </Button>
                </div>
                <span class={s.label} id="lab-speed-label">
                  Animation speed
                </span>
                <Segmented
                  id="lab-speed"
                  value={speed}
                  options={SPEEDS.map((v) => ({ value: v, label: `${v}×` }))}
                  onChange={(v) => {
                    setSpeed(v);
                    release();
                  }}
                />
                <p class={`${s.hint} num`}>Tick {hud.tick}</p>
              </section>

              <section>
                <h2>Manual controls</h2>
                <span class={s.label} id="lab-attacker-label">
                  Fighter
                </span>
                <Segmented
                  id="lab-attacker"
                  value={attacker}
                  options={[
                    { value: 0, label: 'P1' },
                    { value: 1, label: 'P2' },
                  ]}
                  onChange={(v) => {
                    setAttacker(v as FighterId);
                    release();
                  }}
                />
                <div class={s.moves}>
                  {MOVE_IDS.map((id: MoveId) => (
                    <Button key={id} onClick={() => manual({ fighter: attacker, kind: 'attack', move: id })}>
                      {MOVES[id].name}
                    </Button>
                  ))}
                  <Button onClick={() => manual({ fighter: attacker, kind: 'block' })}>Block</Button>
                  <Button onClick={() => manual({ fighter: attacker, kind: 'dodge' })}>Dodge</Button>
                </div>
              </section>

              <section>
                <h2>View</h2>
                <span class={s.label} id="lab-skin-label">
                  Skin
                </span>
                <Segmented
                  id="lab-skin"
                  value={skinId}
                  options={SKINS.map((k) => ({ value: k.id, label: k.name }))}
                  onChange={(v) => {
                    setSkinId(v);
                    release();
                  }}
                />
                <Switch id="lab-typing" label="Typing combat (P1)" checked={typing} onChange={setTyping} />
                <Switch
                  id="lab-skeleton"
                  label="Skeleton and joints"
                  checked={skeleton}
                  onChange={setSkeleton}
                />
                <Switch id="lab-hitboxes" label="Hitboxes" checked={hitboxes} onChange={setHitboxes} />
              </section>
            </>
          )}
        </aside>
      </div>
    </Screen>
  );
}

/** The player lost: knocked out, or a double knockout. */
const playerDown = (s: FightState) => s.winner === 1 || s.winner === 'draw';

function readHud(m: Match): Hud {
  const [p, o] = m.sim.fighters;
  return {
    hp: [p.hp, o.hp],
    enemyMax: enemyHp(m.tier),
    combo: [p.combo, o.combo],
    over: playerDown(m.sim),
    winner: m.sim.winner,
    score: m.score,
    kos: m.kos,
    tier: m.tier,
    tick: m.sim.tick,
    counterReady: p.counter > 0,
    callout: m.callout && m.sim.tick < m.callout.until ? m.callout.text : null,
  };
}

function sameHud(a: Hud, b: Hud) {
  return (
    a.hp[0] === b.hp[0] &&
    a.hp[1] === b.hp[1] &&
    a.combo[0] === b.combo[0] &&
    a.combo[1] === b.combo[1] &&
    a.winner === b.winner &&
    a.score === b.score &&
    a.kos === b.kos &&
    a.tier === b.tier &&
    a.counterReady === b.counterReady &&
    a.callout === b.callout
  );
}

function Word({ text, pos }: { text: string; pos: number }) {
  return (
    <span class={s.word}>
      {[...text].map((ch, i) => (
        <span key={i} class={i < pos ? s.done : i === pos ? s.next : s.todo}>
          {ch}
        </span>
      ))}
    </span>
  );
}

function Switch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div class={s.switch}>
      <label id={`${id}-label`} for={id}>
        {label}
      </label>
      <Toggle
        id={id}
        checked={checked}
        onChange={(v) => {
          onChange(v);
          release();
        }}
      />
    </div>
  );
}

function HpBar({
  label,
  hp,
  max,
  combo,
  right,
}: {
  label: string;
  hp: number;
  max: number;
  combo: number;
  right?: boolean;
}) {
  return (
    <div class={`${s.hp} ${right ? s.hpRight : ''}`}>
      <span>{label}</span>
      <div
        class={s.hpTrack}
        role="meter"
        aria-label={`${label} health`}
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div class={s.hpFill} style={{ width: `${(hp / max) * 100}%` }} />
      </div>
      <span class="num">{hp}</span>
      <span class={`${s.combo} num`} aria-label={`${label} combo`}>
        {combo >= 2 ? `×${combo}` : ''}
      </span>
    </div>
  );
}
