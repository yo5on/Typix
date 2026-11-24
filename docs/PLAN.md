# Homerow: Final Plan (v1, for approval)

> Status: **draft for approval. No code has been written.**
> Builds on the design agreed in the previous session: separate Learning, Free Practice and Fight modes on **one shared typing engine and one shared progress store**. Your latest decisions (audience, layout, art, storage, stack) are applied throughout.
> All numbers marked *(tune)* are starting values. Playtesting and the balance simulator (§6.7) will adjust them.

---

## 1. Game name and visual identity

### 1.1 Name

**Working title: Homerow**. Learning begins on the home row, and the home row is where your hands come back to between moves. The tagline is *"Learn to type. Then fight with it."*

| Candidate | Why it works | Risk |
|---|---|---|
| **Homerow** (recommended) | Short, adult, explains itself to anyone who types | Generic word; availability unchecked |
| Keybound | Sounds like a fighting game | Availability unchecked |
| Tenfold | Ten fingers; also means "much better" | Availability unchecked |

I have not checked domains, trademarks or app-store names for any of these. Do that before the public release; renaming before then costs little.

### 1.2 Identity concept: "a precise frame around a pixel world"

- **The frame** (menus, Learning, Practice, Stats) is modern, dark and typographic, with crisp vectors and generous spacing. It should feel like a pro tool such as Linear or Raycast, not a children's app.
- **The world** (Fight) is high-quality original pixel art with heavy hit effects.
- **What ties them together:** the same dark base, the same typeface for typed text, and the same **finger colour system** in every mode. The left pinky is the same colour on the Learning keyboard, in the Practice heatmap and on a Fight guard prompt.

### 1.3 Colour tokens (dark theme only for v1)

| Token | Use | Value *(tune)* |
|---|---|---|
| `--bg-0` | App background | `#0B0D10` near-black, slightly blue |
| `--bg-1` | Surfaces/cards | `#13161B` |
| `--bg-2` | Raised/hover | `#1B1F26` |
| `--line` | Hairline borders | `#262B33` |
| `--text-1` / `--text-2` / `--text-3` | Primary / secondary / muted | `#E8EAED` / `#A3A9B3` / `#6B727D` |
| `--accent-calm` | Learning and Practice accent | Cool teal, `#5CC8B8` |
| `--accent-fight` | Fight accent | Hot amber, `#FF8A3D` |
| `--ok` / `--err` | Correct / wrong | Desaturated green / red. **Never colour alone** (see §7.7) |

**Finger palette:** 8 hues plus a neutral for the thumbs. Each must be distinguishable for deuteranopia, protanopia and tritanopia; I will validate them with a simulator before locking. Each key and finger also carries a **pattern/label fallback**, a small finger glyph such as `L4` or `R2`, that can be switched on in Settings.

Rules: no large gradients. At most one soft glow per screen (the active key, or the super meter). Mode accent colour appears only on interactive elements and the current focus.

### 1.4 Typography

| Role | Typeface (all SIL OFL, self-hosted woff2) | Notes |
|---|---|---|
| UI | **Inter** | Tabular numbers for stats |
| Typed text, keycaps, code | **JetBrains Mono** | Clear distinction between `l 1 I`, `0 O` and `` ` ' `` |
| Display (titles, Fight banners) | **Space Grotesk** | Used sparingly |
| In-game pixel text (damage numbers, KO) | A pixel font with an open licence, or a custom bitmap font | Licence to verify |

Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 64. Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Corner radius: 6 for controls, 10 for cards, nothing larger.

### 1.5 Motion language

- **Calm surfaces (Learning, Practice):** 150–250 ms ease-out fades and short slides. The finger animation is the only motion that draws attention.
- **Fight:** snappy and weighty. Hit-stop, camera punch-in, shake, particles.
- **Page transitions:** a 200 ms cross-fade with an 8 px rise. Entering Fight adds a short "slash wipe" in the fight accent.
- **Reduced motion** (system setting or app toggle) turns all of the above into simple fades or instant cuts. The full list is in §7.7.

### 1.6 Icons

About 25 custom SVG icons on a 24 px grid with a 1.5 px stroke, round caps and one consistent style. They are drawn in-house as inline SVG components with no icon library, so every icon matches.

---

## 2. Complete feature breakdown

Scope labels: **MVP** = phases 0–5 (§10). **v1.0** = public release (phases 6–8). **Later** = after release.

### 2.1 Shell and global

| Feature | Scope |
|---|---|
| Main menu: Learn, Fight, Free Practice, Stats & Progress, Settings | MVP |
| **Continue card** on the menu, showing the single best next action | MVP |
| First-launch onboarding (§4) with no account | MVP |
| Keyboard-only navigation everywhere, with visible focus | MVP |
| Page transitions and reduced-motion support | MVP |
| Pause on lost window focus (all modes) | MVP |
| Export and import of progress as a JSON file | MVP |
| Reset progress (confirmation and an automatic backup download first) | MVP |
| Installable PWA with offline play | v1.0 |
| Additional keyboard layouts (UK, AZERTY, QWERTZ, Dvorak, Colemak) | Later, data files only |
| Webcam finger tracking ("form check") | **Later, not in MVP or v1.0** |
| Cloud sync and accounts | Later, optional |

### 2.2 Learning Mode (calm, guidance-first)

| Feature | Scope |
|---|---|
| **Animated hands** that are anatomically plausible, showing home → reach → press → return for every key (§9.2) | MVP |
| Virtual keyboard tinted by finger, with the next key lit | MVP |
| Teaching the F/J bumps and the home position (interactive, sequenced so it works on keyboards that drop simultaneous keys) | MVP |
| Lesson step types: demo, single-key drill, pairs, words, sentences, review, summary | MVP |
| **Per-key fading guidance** (levels L3 → L0, §5.4) | MVP |
| Lessons can be repeated or skipped freely, with no locks | MVP |
| No timers, health or fail states. Accuracy and steadiness are the only scores | MVP |
| Lesson summary with personalised recommendation | MVP |
| Full curriculum, Units 0–8 (§5) | v1.0 (MVP ships Units 0–2) |
| Finger Gym: a drill set for each finger and each hand | v1.0 |
| Programming track (Unit 9: Python, JavaScript/TypeScript, C, Java, C++, SQL, shell) | v1.0 (Python + JS first) |
| Placement test ("I can already type") | v1.0 |
| Posture and break reminders (optional, gentle) | v1.0 |

### 2.3 Free Practice (self-directed, no combat)

| Feature | Scope |
|---|---|
| Timed tests: 30 s, 1, 3 and 5 minutes | MVP |
| Word-count tests: 25, 50 and 100 words | MVP |
| "Your keys" or "Full keyboard" word source | MVP |
| Weak-key drill (generated from your stats) | MVP |
| Custom text (paste your own) | MVP |
| Results screen: WPM, raw WPM, accuracy, consistency, per-key heatmap, slowest letter pairs | MVP |
| Quotes (public-domain texts) and code snippets | v1.0 |
| Ghost caret: race your personal best | v1.0 |
| Daily drill: a 5-minute session built from yesterday's weak spots | v1.0 |

### 2.4 Fight Mode (energetic, an arcade game)

| Feature | Scope |
|---|---|
| Real-time 1v1: attack words, guard prompts (block, dodge, parry), combos, super meter, cinematic finisher | MVP |
| Hit-stop, screen shake, particles, hit sparks, KO slow-motion | MVP |
| Difficulties: **Practice (no pressure)**, Easy, Normal, Hard, Expert, all relative to your measured speed (§6.5) | MVP |
| "Your keys" word source by default, with a "Full keyboard" toggle | MVP |
| Optional keyboard and hand overlay (off by default) | MVP |
| Post-match report, with links back to Learning drills | MVP |
| 1 fighter, 1 opponent and 1 arena | MVP |
| 3 fighters, 7 opponents, a Nemesis boss, a code boss, 4 arenas | v1.0 |
| Arcade ladder with boss battles | v1.0 |
| Nemesis: a boss built from your weak keys that updates daily | v1.0 |
| Code duel (prompts are code tokens) | v1.0 |
| Fighter "stances" (finger-group specialisations) | Later |
| Story mode | Later |

### 2.5 Stats and Progress (one dashboard for all modes)

| Feature | Scope |
|---|---|
| Key mastery map (keyboard shaded by mastery) | MVP |
| WPM and accuracy over time, split into **calm** (Learning and Practice) and **under pressure** (Fight) | MVP |
| Per-finger accuracy and speed | MVP |
| Lesson progress across the curriculum | MVP |
| Fight record, achievements and personal bests | MVP (basic) → v1.0 (achievements) |
| Recommendations list (§4.4) | MVP |

### 2.6 Settings

Sound (master, SFX, music, keystroke ticks), reduced motion (follows the system setting by default, with an override), screen shake and flash intensity (sliders, 0 turns them off), colourblind finger labels, hand skin tone, hand visibility, font size for typed text (S/M/L/XL), caret style, "stop on error" vs "continue on error" (Learning and Practice), keyboard layout (US QWERTY only for now), data export, import and reset.

---

## 3. Screen layouts and UI wireframes

All layouts are designed at 1440×900 and must scale cleanly from 1280×720 to 2560×1440. Below 1024 px wide the app shows a polite "Homerow needs a physical keyboard and a wider screen" screen. Free Practice remains usable on tablets that have a keyboard attached.

### 3.1 Main menu

```
┌──────────────────────────────────────────────────────────────────────┐
│ HOMEROW                                              ⚙  Settings     │
│                                                                      │
│  ┌──────────────────────────────────────────────┐                    │
│  │ CONTINUE                                      │   Today            │
│  │ Lesson 2.3 · R & U                            │   12 min · 97% acc │
│  │ ███████░░░  Unit 2                [ Enter ▸ ] │   38 WPM calm      │
│  └──────────────────────────────────────────────┘                    │
│                                                                      │
│  ▸ Learn Typing         guided course · 4 / 62 lessons               │
│    Fight                test your skills · Normal                    │
│    Free Practice        timed tests · drills · custom text           │
│    Stats & Progress     mastery · history · records                  │
│                                                                      │
│  ↑↓ move   Enter select   Esc back                                   │
└──────────────────────────────────────────────────────────────────────┘
```
A dark surface with a typographic list. The selected row gets a 2 px accent bar and slides 4 px. Behind the list, a slowly drifting, very dim pixel-art arena silhouette hints at Fight. It is static when reduced motion is on.

### 3.2 Learning: lesson screen

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Unit 2 · Lesson 3 · R & U           step 3/6 ●●●○○○      98% acc   │
│                                                                      │
│                                                                      │
│            r u  ru  ur  rr  uu  [r]un  urn  rug  fur                 │
│                       ▔                                              │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  `  1  2  3  4  5  6  7  8  9  0  -  =   ⌫                     │   │
│   │  ⇥  q  w  e [r] t  y [u] i  o  p  [  ]  \                     │   │
│   │  ⇪  a  s  d  f• g  h  j• k  l  ;  '   ⏎                       │   │
│   │  ⇧  z  x  c  v  b  n  m  ,  .  /   ⇧                           │   │
│   │              [        space        ]                          │   │
│   └──────────────────────────────────────────────────────────────┘   │
│        (left hand: index lifts to R)       (right hand at home)      │
│                                                                      │
│  Esc pause · Tab restart step · hint level: L3 → fades as you master │
└──────────────────────────────────────────────────────────────────────┘
```
- Typed text is 32–40 px mono with a high-contrast caret. Typed letters dim; errors are **underlined and marked**, never just turned red.
- The hands are drawn semi-transparent *over* the keyboard so you can see the keys through them. You can switch to "beside" mode.
- Nothing on this screen counts down.

### 3.3 Learning: lesson summary

```
┌──────────────────────────────────────────────────────────────────────┐
│  Lesson 2.3 complete                                                 │
│                                                                      │
│   Accuracy 97%     Steadiness 82%     Speed 21 WPM (not scored)      │
│                                                                      │
│   New keys        R ██████████ 99%      U ████████░░ 91%             │
│   Slowest pair    "ur" — 410 ms (your average 260 ms)                │
│                                                                      │
│   Recommended next                                                   │
│   ▸ Repeat with focus on U        (2 min)                            │
│     Continue to 2.4 · T & Y                                          │
│     Test R & U in a Practice fight                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.4 Free Practice: test and results

```
 TEST                                            RESULTS
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│ 1:00 · Your keys · words      0:41  │   │  64 WPM   raw 68   acc 96.2%        │
│                                     │   │  consistency 78%   ▁▂▃▅▆▅▆▇ wpm/s   │
│  their fast jade sleds rest under   │   │                                     │
│  a [g]reat stark field as kids ...  │   │  [ keyboard heatmap: errors/speed ] │
│                                     │   │  slowest pairs: "br" "ny" "ce"      │
│  (keyboard hidden by default)       │   │  ▸ Drill weak keys   Retry   Menu   │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

### 3.5 Fight: select

```
┌──────────────────────────────────────────────────────────────────────┐
│  FIGHT                                         Difficulty ◂ Normal ▸  │
│                                                Words  ◂ Your keys ▸   │
│   [ KAI ]   vs   [ opponent portraits row: VESSA · BRANN · ... ]     │
│   balanced        Vessa "Quickhand" — short, fast prompts            │
│                   Recommended: 30+ WPM · your calm WPM: 38           │
│                                                                      │
│   Arena ◂ Rooftop, Night ▸                     [ Enter: Fight ]      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.6 Fight: in-match HUD (game canvas, 480×270 internal, integer-scaled)

```
┌──────────────────────────────────────────────────────────────────────┐
│ KAI ███████████████░░░  R1 ● ○  45  ○ ○  ░░░█████████████████ VESSA │
│ SUPER ▓▓▓▓▓▓░░░░                                       COMBO ×7 ⟡    │
│                                                                      │
│                              ┌─────────┐                             │
│                              │ s t a r k │  ← attack word, over foe  │
│                              └─────────┘                             │
│         (KAI sprite)                          (VESSA sprite)         │
│        ════════════════════ floor ═════════════════════════          │
│                                                                      │
│              GUARD!  [ j ] [ k ]   ◀ incoming, 0.9 s ring ▶           │
├──────────────────────────────────────────────────────────────────────┤
│ (optional) keyboard + hands overlay · toggle with F1 / settings      │
└──────────────────────────────────────────────────────────────────────┘
```
- The prompts are DOM text layered over the canvas, so they stay crisp at any size. Everything else in the fight is pixel art.
- The attack word sits **between the fighters at eye level**, so you can follow both the action and the text.
- Guard prompts appear at the bottom centre with a shrinking ring. The ring has its own shape and sound cue, so you don't need to rely on colour.

### 3.7 Fight: post-match report

```
┌──────────────────────────────────────────────────────────────────────┐
│  VICTORY · 2–1 vs Vessa (Normal)                     ★ new best combo │
│                                                                      │
│  Pressure WPM 41 (calm 38 → +3)   Accuracy 93%   Consistency 71%     │
│  Guard reaction avg 420 ms · parries 6 · blocks 11 · missed 3        │
│                                                                      │
│  [ keyboard heatmap ]       Weakest: Q A Z (left pinky)              │
│                                                                      │
│  ▸ Left-pinky gym (3 min)    Rematch    Next opponent    Menu        │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.8 Stats & Progress

```
┌──────────────────────────────────────────────────────────────────────┐
│  STATS                   ◂ 7 days | 30 days | all ▸                  │
│  ┌───────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Calm 38 WPM  97%      │  │ WPM over time (calm ── pressure ┄┄)  │ │
│  │ Pressure 34 WPM 92%   │  │                                      │ │
│  └───────────────────────┘  └──────────────────────────────────────┘ │
│  [ key mastery keyboard ]          Fingers: L5 L4 L3 L2 · R2 R3 R4 R5 │
│                                    bars: accuracy / speed per finger │
│  Curriculum ██████░░░░ 24/62   Fights 18W 7L   Achievements 9/40     │
│  Recommendations: ▸ Left-pinky gym  ▸ Rematch Nemesis                │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.9 Settings

A two-column page: category list on the left (General, Accessibility, Audio, Learning, Fight, Data) and controls on the right. Every control works with the keyboard alone. Changes save immediately, and there is a "Reset to defaults" button per category.

---

## 4. User journey: first launch to advanced

### 4.1 First launch (about 90 s, skippable at every step)

1. **Title card**: "Homerow" fades in. Press any key.
2. **"How do you type today?"** Three options:
   - *I'm new to touch typing* → Learning Unit 0
   - *I can type, place me* → 2-minute placement test → marks the units you already know as completed. You can still open and replay them.
   - *Just let me play* → main menu, with the Continue card suggesting a Practice-difficulty fight
3. **Keyboard check** (≈20 s): "Press F, then J." Then a typed sequence. This catches non-US layouts (§11) and keyboards that drop simultaneous keys.
4. A short line about data: "No account needed. Progress is saved in this browser. You can export it any time."

### 4.2 Beginner (week 1)

- Unit 0: posture, the F/J bumps, home position, space with the thumb.
- Unit 1: home row, one finger pair at a time.
- After every lesson the summary recommends one next step, e.g. *"Test your home row in a Practice fight."* Fight's "Your keys" mode means the fight uses only those 8 letters.
- The Continue card always offers one action, never a list.

### 4.3 Intermediate (weeks 2–6)

- Units 2–5: top row, inner columns, bottom row, capitals.
- Hints fade one key at a time as each is mastered, so progress is visible.
- Free Practice timed tests and weak-key drills begin to matter.
- Fight difficulty moves up to Normal. Opponents unlock as *recommendations* based on speed, never as locks.

### 4.4 Advanced (week 6+)

- Units 6–8: punctuation, numbers, symbols. Unit 9: code tracks.
- Nemesis boss, Hard and Expert fights, the arcade ladder, code duels.
- Ghost-caret races, daily drill, personal records.

### 4.5 The loop between modes (simple rules, no AI)

| Trigger | Recommendation |
|---|---|
| Lesson completed | Practice-difficulty fight using the new keys |
| A key's accuracy < 90% over its last 50 presses (any mode) | The Finger Gym drill for that key's finger |
| Lost to a boss | Drill of the keys the boss used most → "Rematch" button |
| Calm vs pressure WPM gap > 25% | Easier fight difficulty, plus a Free Practice timed test |
| No activity for 3+ days | "Warm-up: home-row review (2 min)". No guilt messages, no streak shaming |

The Continue card shows the highest-priority recommendation. The full list appears in Stats.

---

## 5. Learning curriculum

### 5.1 Lesson anatomy

Each lesson runs 3–6 minutes and has these steps:

1. **Demo**: hands animate home → key → press → return for each new key. The key glows and the finger is highlighted. The player presses Enter to repeat or Space to continue.
2. **Single-key drill**: `f f f j j j`
3. **Pairs and patterns**: `fj jf ffj jjf`
4. **Words**: real words built only from the keys learned so far. Pseudo-words are used only when there aren't enough real words.
5. **Review**: older keys mixed in, weighted toward your weak ones.
6. **Summary**: accuracy, steadiness, slowest key and pair, one recommendation.

Errors behave as you choose in Settings: by default the caret **waits** for the correct key (the calm default), or the text can continue with the error marked. Backspace is allowed in Learning and Practice. Fight never allows it.

### 5.2 Curriculum (US QWERTY)

| Unit | Lessons | Keys and content | Notes |
|---|---|---|---|
| **0 Orientation** | 4 | Posture and screen distance; F/J bumps; home position; space with the thumb; "return home" habit | Interactive with no scoring. Hand animation demos only |
| **1 Home row** | 6 | F J → D K → S L → A ; → G H (index stretch) → full home-row words | "sad", "flask", "lads", "glad" |
| **2 Top row** | 7 | E I → R U → T Y → W O → Q P → top + home words → sentences without capitals | Each lesson adds one finger's reach |
| **3 Bottom row** | 6 | V M → C , → X . → Z / → B N → full alphabet words | B and N last because they are the most confused |
| **4 Capitals** | 4 | Shift with the **opposite hand's pinky**; capitalised words; proper nouns; sentence starts | The hands visibly reach the opposite Shift |
| **5 Sentences and flow** | 5 | Common words, frequent pairs and triples ("th", "ing", "tion"), short sentences, rhythm drills | Introduces the steadiness score |
| **6 Punctuation** | 5 | `' " ? ! : -` and dashes | |
| **7 Numbers** | 5 | 4 5 6 7 → 3 8 → 2 9 → 1 0 → mixed numbers in text | |
| **8 Symbols** | 6 | `( ) [ ] { } < > = + - _ * & ^ % $ # @ ~ \` \| \\` | Grouped by finger |
| **9 Code** | 6 per language | Python, JS/TS (first), then C, Java, C++, SQL, shell: tokens → statements → small snippets | Auto-indent: you type the symbols, not the leading whitespace |
| **Finger Gym** | 8 + 2 | One drill set for each finger, plus left-hand and right-hand drills | Each drill is tagged by finger, which is how recommendations find them |

Total: about 62 lessons in Units 0–8, plus the code tracks and the gym. The exact list is written in data files during Phase 4.

### 5.3 Progression rules: no locks, ever

- Every lesson is always playable. The UI shows a **recommended** path, and skipping is one click with no warning dialog.
- A lesson counts as "completed" after one finish at any score. "**Mastered**" means ≥ 95% accuracy with steadiness ≥ 70% *(tune)*. Mastery adds a badge; it never blocks anything.
- Speed is shown in summaries but never scored in Units 0–4. From Unit 5 onward a soft, optional speed goal appears.

### 5.4 Per-key fading guidance

| Level | What you see | Moves to the next level when |
|---|---|---|
| L3 | Full finger animation, lit key, finger colour on the letter | Key ≥ 95% accuracy over its last 30 presses *(tune)* |
| L2 | Lit key and highlighted finger, no animation | ≥ 95% over its last 50 presses at a steady pace |
| L1 | Hint only if you hesitate > 700 ms *(tune)* | ≥ 97% over its last 50 presses |
| L0 | No hint | Drops back a level if accuracy falls below 90% |

You can force any level in Settings, e.g. "always show hands".

### 5.5 Text generation

- Word lists are filtered to the allowed key set for each lesson, then weighted: 70% toward your weak keys and pairs, 30% from the general pool *(tune)*.
- Source: an English frequency list with an open licence. **Licence to verify**; candidates include public-domain-derived lists. A profanity filter is applied to the list.
- Every generator is tested so it **never** produces a character outside the lesson's allowed keys (§12).

---

## 6. Combat mechanics and balancing

### 6.1 Core loop (real time, about 60 s rounds, best of 3)

| Action | Player input | Result |
|---|---|---|
| **Attack** | Type the word above the opponent | Each correct word lands a hit. Words ≤ 4 letters are light, 5–7 medium, 8+ heavy |
| **Combo** | Type consecutive words without any error | Combo counter rises, along with the damage multiplier and the juggle and launcher animations |
| **Guard** | The opponent's tell appears, then a 1–3 key guard prompt | Typed in the window → **block** (chip damage). Typed in the first 40% of the window → **parry** (no damage, opens a counter) |
| **Dodge** | A guard prompt that slides sideways | Typed in time → dodge, and the opponent is left exposed |
| **Super** | Meter full → a phrase appears (e.g. "rising crescent strike") | Typed perfectly → cinematic special. One error → it fizzles; half the meter is refunded |
| **Finisher** | The opponent is at 0 HP in the final round | A short finishing phrase triggers the KO cinematic. Failing the phrase still wins the round, just without the cinematic |

**Typos:** the combo breaks. On Normal and above, the fighter staggers briefly (300 ms *(tune)*). On Hard and above, the opponent also gets a free light hit. There is no backspace in Fight: you continue from the next letter, which trains you out of reaching for it.

**Flow (rhythm):** steady keystroke timing (low variation between keystroke intervals) fills a Flow bonus of up to +25% damage. This rewards a real sign of good touch typing.

### 6.2 Prompts are part of the fight

- Attack words float over the opponent and shatter into pixel shards when completed. The hit plays *as* the last letter lands.
- Each opponent's word "personality" is data: Vessa uses short words, Brann long ones, Ink punctuation.
- Guard prompts use single keys or very short sequences, so they train finding a key without looking.
- Super phrases fit each fighter's identity. Bosses have their own phrase pools.

### 6.3 Damage model (starting values, tune)

```
HP per fighter          = 1000
wordDamage              = 18 + 9 × letters           // 3 letters → 45, 8 letters → 90
comboMultiplier         = min(1 + 0.08 × combo, 2.0)
flowMultiplier          = 1.00 … 1.25
superDamage             = 220   (plus a guaranteed stagger)
opponentHit             = 50 / 90 / 140   (light / medium / heavy)
blockChip               = 15% of the hit,  parry = 0 and a 1.2 s counter window (attack words do ×1.5)
```

### 6.4 Opponent AI (pure, deterministic and seeded)

Each opponent is data: aggression (attack interval), tell length, move list, word pool settings, special rules, and phases for bosses. The AI is a small state machine: `idle → telegraph → strike → recover`, with interrupts when it is staggered by player hits.

### 6.5 Difficulty is relative to you

`playerCPS` = your recent **calm** speed in characters per second, from the progress store (defaults to 2.0 ≈ 24 WPM for new players).

| Difficulty | Guard window | Opponent attack interval | Typo penalty | You can lose? |
|---|---|---|---|---|
| **Practice** | No time limit | Every 6 s | None | **No** |
| Easy | `keys / playerCPS × 2.2 + 0.5 s` | 4.5–6 s | Combo break | Yes |
| Normal | `× 1.6 + 0.35 s` | 3.5–5 s | Combo break and stagger | Yes |
| Hard | `× 1.25 + 0.25 s` | 2.5–4 s | Plus a free opponent hit | Yes |
| Expert | `× 1.05 + 0.2 s` | 2–3.5 s | Plus a free hit; super phrases are longer | Yes |

**Practice difficulty, made explicit:** your HP never drops; there is no round timer; guard prompts still appear but missing one only plays a harmless "tap"; the opponent fights at a slow pace; you can pause any time with Esc; there are no defeat screens, only "Round over"; and stats are still recorded so recommendations keep working. This is the "fight without pressure" mode.

### 6.6 Roster (all original, adult tone)

**Fighters (player)**
| Name | Style | Mechanical twist |
|---|---|---|
| **Kai** (MVP) | Balanced martial artist | None (the baseline) |
| **Sable** | Fast striker | Combo window +20%, lower damage per word |
| **Tor** | Heavy hitter | Words of 7+ letters do ×1.3; short words ×0.85 |

**Opponents (ladder order)**
| Opponent | Identity | Mechanic |
|---|---|---|
| **Rook** | Sparring partner (MVP) | Teaches every mechanic in round 1; slow |
| **Vessa "Quickhand"** | Street fighter | Short words, fast attack rhythm |
| **Brann** | Armoured brawler | Super armour: a heavy word is needed to make him stagger |
| **Ink** | Calligrapher-duelist | Punctuation-heavy prompts |
| **Mirror** | Mimic | Copies your rhythm; uneven typing powers her up |
| **Cipher** | Hacker | Numbers and symbols |
| **The Compiler** (boss) | Code construct | Code prompts; bracket mistakes "fail the build" (a short stun) |
| **Nemesis** (boss) | Shadow version of you | Prompts built from your weakest keys and pairs; rebuilt daily |

**Arenas:** Rooftop at night (neon city), Rain Market, Old Dojo (lantern light), Server Hall (boss arena, cold light). Each has a 3–4 layer parallax background with subtle ambient animation.

### 6.7 Balancing method

1. A **headless combat simulator**: the pure TypeScript combat core runs without Phaser on a fixed 60 Hz tick.
2. **Bot typists** with these settings: WPM, accuracy, reaction time, timing jitter.
3. It runs 1,000 seeded matches for each combination of difficulty and opponent, and checks win rates:

| Difficulty | Bot at your calm WPM, 95% accuracy, should win |
|---|---|
| Practice | 100% (you cannot lose) |
| Easy | 80–92% |
| Normal | 55–70% |
| Hard | 30–45% |
| Expert | 10–25% |

These bands run as automated tests in CI. If a balance change breaks them, the build fails. Round length target: 45–75 s, also checked by the simulator.

---

## 7. Technical architecture and folder structure

### 7.1 Principles

1. **`core/` is pure TypeScript.** It never imports DOM, Preact or Phaser, and it is fully unit-tested.
2. **The modes never import each other.** They communicate only through `core/` and the store.
3. **Content is data.** Lessons, layouts, fighters, opponents and arenas are typed TS/JSON files, validated at build time.
4. **Phaser loads only when you open Fight** (dynamic `import()`), so Learning and Practice load fast.
5. **Combat logic lives in `core/combat`** with a fixed timestep and a seeded RNG. Phaser only *renders* the state and plays effects. This makes combat testable and simulatable.

### 7.2 Stack and dependencies

| Package | Kind | Why it is needed |
|---|---|---|
| `preact` | runtime | UI for menus, Learning, Practice, Stats, Settings |
| `@preact/signals` | runtime | Small reactive store shared by screens without prop-drilling. Can be dropped for `useState` plus context if it turns out unnecessary |
| `phaser` (3.90, the final 3.x release; Phaser 4 exists but was not chosen) | runtime, lazy-loaded, added in Phase 5 | Fight rendering, animation, particles, audio |
| `@fontsource-variable/{inter,jetbrains-mono,space-grotesk}` | runtime assets | Self-hosted font files bundled by Vite (no CDN request) |
| `typescript`, `vite`, `@preact/preset-vite` | dev | Build |
| `vitest` | dev | Unit and component tests |
| `@testing-library/preact`, `happy-dom` | dev | Component tests for key UI pieces |
| `@playwright/test` | dev | End-to-end tests with real keyboard events |
| `eslint`, `typescript-eslint`, `prettier` | dev | Consistent code |

Deliberately left out: a router (a ~40-line hash router written in-house), a CSS framework (plain CSS with custom properties and CSS Modules, which Vite supports natively), an icon library (§1.6), a state library beyond signals, an animation library (CSS plus Web Animations API), a charting library (small SVG chart components), a backend, analytics and trackers. Bundle-size goals are in §11.

### 7.3 Folder structure

```
homerow/
├─ README.md
├─ docs/
│  ├─ PLAN.md              (this file)
│  ├─ ARCHITECTURE.md      module boundaries, data flow, diagrams
│  ├─ CONTENT_GUIDE.md     how to add a lesson, opponent, arena or layout
│  ├─ ART_SPEC.md          sprite sizes, palettes, frame lists, export rules
│  ├─ BALANCING.md         formulas, simulator usage, current bands
│  └─ ACCESSIBILITY.md     what is supported and how it is tested
├─ public/                 fonts, favicon, manifest
├─ assets-src/             Aseprite / SVG source files (not shipped)
├─ src/
│  ├─ main.tsx             app entry
│  ├─ app/                 shell: router, transitions, global hotkeys, focus management
│  ├─ core/                PURE TS — no DOM/Preact/Phaser imports (lint-enforced)
│  │  ├─ typing/           engine.ts, metrics.ts, events.ts
│  │  ├─ layout/           types.ts, us-qwerty.ts, finger-map.ts, char-to-keys.ts
│  │  ├─ stats/            key-stats.ts, bigrams.ts, aggregate.ts
│  │  ├─ mastery/          guidance-levels.ts, lesson-mastery.ts
│  │  ├─ recommend/        rules.ts
│  │  ├─ textgen/          word-filter.ts, drills.ts, weighting.ts, rng.ts
│  │  ├─ combat/           state.ts, tick.ts, damage.ts, ai.ts, difficulty.ts
│  │  ├─ sim/              bot-typist.ts, run-matches.ts   (balance simulator)
│  │  └─ store/            schema.ts, migrations.ts, persist.ts, export-import.ts
│  ├─ content/             DATA
│  │  ├─ curriculum/       unit-0.ts … unit-9-*.ts, finger-gym.ts
│  │  ├─ words/            en-frequency.txt, profanity-filter.txt
│  │  ├─ quotes/  code/
│  │  ├─ fighters/  opponents/  arenas/
│  │  └─ validate.ts       build-time content checks
│  ├─ ui/                  shared design system
│  │  ├─ tokens.css  base.css  motion.css
│  │  ├─ components/       Button, Card, List, Toggle, Slider, Modal, KeyCap, Stat, Chart, Icon
│  │  └─ keyboard/         Keyboard.tsx, Hands.tsx, hand-rig.ts, poses.ts
│  └─ features/
│     ├─ menu/  onboarding/
│     ├─ learning/         LessonScreen, steps/, Summary
│     ├─ practice/         TestScreen, Results
│     ├─ fight/
│     │  ├─ FightScreen.tsx   mounts and destroys Phaser, DOM prompt overlay
│     │  └─ phaser/           BootScene, ArenaScene, FighterView, effects/, audio/
│     ├─ stats/
│     └─ settings/
└─ tests/
   ├─ e2e/                 Playwright specs
   └─ fixtures/            recorded keystroke sessions
```

### 7.4 Data flow

```
keydown (window, one listener in app/)
   → InputAdapter: KeyboardEvent → { code, key, shift, t: performance.now() }
   → TypingEngine (core/typing): compares with target → TypingEvent {correct|wrong|extra, latency}
   → consumers:
        Learning / Practice screens → render caret, hints
        Combat core (core/combat)   → attack/guard resolution → CombatState → Phaser renders
   → StatsRecorder (core/stats) → aggregates per key/bigram/finger, tagged mode = calm | pressure
   → Store (core/store) → debounced save to localStorage
```

### 7.5 Shared typing engine (contract)

- Input: target text and its key sequence (from the layout), the error mode, and a stream of key events.
- Output: typed events plus a running snapshot (position, errors, timings).
- **Metrics (one definition, used everywhere):**
  - WPM = (correct characters ÷ 5) ÷ minutes
  - Raw WPM = (all typed characters ÷ 5) ÷ minutes
  - Accuracy = correct keystrokes ÷ all keystrokes (backspaced errors still count as errors)
  - Consistency = 1 − coefficient of variation of the intervals between keystrokes, clamped to 0–1, with pauses > 2 s excluded
  - Reaction time (Fight) = time from guard prompt shown to first correct key
- Keys are identified by `KeyboardEvent.code` (physical position, which drives finger mapping) and `KeyboardEvent.key` (the character, which is checked against the target).

### 7.6 Layout abstraction (ready for more layouts)

A layout is one data file: key geometry (row, x, width), the finger for each key, and the characters for each key (base and shift). `char-to-keys` derives "to type `A`, press Shift-Right with R5 + `KeyA` with L5". **Adding UK or AZERTY later means adding one data file plus its tests.** No engine changes.

### 7.7 Accessibility and reduced motion

| Area | Plan |
|---|---|
| Keyboard | Every screen fully usable without a mouse; visible focus ring; Esc always goes back or pauses |
| Screen readers | Menus, settings, summaries and stats use semantic HTML and labels. Typing surfaces announce lesson start, results and errors (live region, throttled) |
| Colour | Errors use underline and marking plus colour; finger labels available; palettes checked for colourblindness; WCAG AA contrast for all text |
| Text size | Typed text S–XL; UI respects browser zoom up to 200% |
| Reduced motion | **Hands:** finger moves become a static pose for each key with a short fade. **Transitions:** instant or fade only. **Fight:** no shake, no camera zoom, no slow-motion; hit-stop kept short (it carries timing information); flashes replaced by outline pulses |
| Photosensitivity | No full-screen flashes faster than 3 per second, ever, in any mode |
| Timing | Practice difficulty plus an extra "guard window ×1.5" accessibility option for every difficulty |

### 7.8 Deployment

A static site on any free static host (GitHub Pages, Cloudflare Pages or Netlify; you choose). GitHub Actions runs lint, type check, unit tests, the balance simulator, e2e smoke tests and the build on every push.

---

## 8. Data models and progress tracking

```ts
// ---- Layout ----
type FingerId = 'L5'|'L4'|'L3'|'L2'|'L1'|'R1'|'R2'|'R3'|'R4'|'R5'; // 5 = pinky, 1 = thumb
interface KeyDef { code: string; row: 0|1|2|3|4; x: number; w: number; finger: FingerId;
                   base?: string; shift?: string; homeBump?: boolean }
interface Layout { id: 'us-qwerty'; name: string; keys: KeyDef[] }

// ---- Curriculum ----
type StepKind = 'demo'|'single'|'pairs'|'words'|'sentences'|'review'|'code'|'summary';
interface LessonStep { kind: StepKind; generator?: GeneratorSpec; text?: string; repeat?: number }
interface Lesson { id: string;            // 'u2.l3'
                   unit: number; title: string; newKeys: string[]; allowedKeys: string[];
                   fingers: FingerId[]; tags: string[]; steps: LessonStep[];
                   mastery: { accuracy: number; steadiness: number } }

// ---- Fight content ----
interface MoveDef { id: string; kind: 'light'|'medium'|'heavy'|'special'|'super';
                    anim: string; telegraphMs?: number; damage: number; sfx: string }
interface FighterDef { id: string; name: string; sprite: string; moves: MoveDef[];
                       modifiers: Partial<CombatModifiers>; superPhrases: string[] }
interface OpponentDef extends FighterDef { ai: AiProfile; wordProfile: WordProfile;
                       recommendedWpm: number; boss?: { phases: AiProfile[] } }
interface ArenaDef { id: string; name: string; layers: string[]; music: string; ambient?: string }

// ---- Progress (persisted) ----
interface KeyStat { presses: number; errors: number; meanLatencyMs: number;
                    recent: number[];            // ring buffer of the last 50 results: 1 ok / 0 error
                    guidance: 0|1|2|3;
                    byMode: Record<'calm'|'pressure', { presses: number; errors: number; meanLatencyMs: number }> }
interface SessionSummary { id: string; at: number; mode: 'learning'|'practice'|'fight';
                           ref: string;          // lesson id, test config or opponent id
                           wpm: number; rawWpm: number; accuracy: number; consistency: number;
                           durationMs: number; weakKeys: string[]; result?: 'win'|'loss'|'n/a' }
interface Progress {
  schemaVersion: number;
  createdAt: number;
  keys: Record<string /* code+shift */, KeyStat>;
  bigrams: Record<string, { n: number; meanMs: number; errors: number }>;  // top 300 kept
  lessons: Record<string, { completed: boolean; mastered: boolean; best: number; plays: number }>;
  fights: Record<string, { wins: number; losses: number; bestCombo: number }>;
  sessions: SessionSummary[];          // last 300, older ones rolled into daily totals
  daily: Record<string /* YYYY-MM-DD */, { minutes: number; wpmCalm?: number; wpmPressure?: number }>;
  achievements: Record<string, number /* unlockedAt */>;
  nemesis?: { generatedOn: string; keys: string[]; bigrams: string[] };
}
interface Settings { reducedMotion: 'system'|'on'|'off'; shake: number; flash: number;
                     sfx: number; music: number; ticks: boolean; errorMode: 'stop'|'continue';
                     textSize: 'S'|'M'|'L'|'XL'; fingerLabels: boolean; handTone: string;
                     guidanceOverride?: 0|1|2|3; layout: 'us-qwerty'; guardWindowBoost: boolean }
```

**Persistence:**
- localStorage, key `homerow.progress` and `homerow.settings`, written with a debounce (1 s) and on `pagehide`. Writes are wrapped in try/catch; if the quota is full, older sessions are rolled into daily totals and the write is retried. If it still fails, a non-blocking banner suggests exporting.
- Expected size is under 300 KB because only aggregates are stored, never raw keystrokes. If history ever outgrows localStorage, `persist.ts` is the single place to switch to IndexedDB.
- `schemaVersion` plus ordered migration functions, each tested on fixture saves from every earlier version.
- Import validates the file against the schema (it is untrusted input), then shows a preview ("38 lessons, 120 sessions — replace current progress?"), and saves a backup before overwriting.
- Recording "calm" vs "pressure" for each key is what makes the separate calm and pressure numbers possible.

---

## 9. Art and animation asset requirements

### 9.1 Production approach

- **Development:** placeholder art throughout. Fighters are coloured capsules with readable silhouettes and labelled frames; arenas are flat colour bands. The *animation timings and hitboxes* are final from the start, so swapping in real art later is just a file replacement.
- **Release:** original pixel art in **Aseprite** files, exported to PNG sprite atlases plus JSON (Phaser loads these natively).
- **Sourcing** (your decision): draw it yourself, commission a pixel artist using `docs/ART_SPEC.md` as the brief, or buy licensed packs as interim art. Art is still the **largest cost and schedule risk** in the project.

### 9.2 Hands (Learning centrepiece)

**Recommendation: vector (SVG) hands, not pixel art.** At keyboard scale a pixel-art hand can't show a finger lifting a few millimetres or curling, and those details are what you asked to show accurately.

- **Rig:** a palm plus 5 fingers, each with 3 segments (the thumb has 2 plus a base), drawn from a top-down three-quarter view over the keyboard.
- **Poses:** a resting home pose for each hand, plus **one target pose for each key**: about 48 poses for each hand on US QWERTY, including Shift and Space. The finger reaches with a small wrist shift for far keys. The other fingers stay anchored on the home row (anatomically, neighbouring fingers move slightly; that is modelled with small coupling offsets).
- **Animation:** home → reach (180 ms) → press (60 ms) → release → return (220 ms) *(tune)*, using smooth interpolation between poses. A "ghost trail" shows the path the first time.
- **Authoring:** poses are data (joint angles for each key) tuned in a small dev-only pose editor page. A 2-bone inverse kinematics solver gives a first draft; then each pose is hand-adjusted. Reference photos of real typing are used to check every key.
- **Style:** soft, semi-realistic shading in 2–3 tones; 4 skin tones plus a neutral "ghost" style; a subtle outline.

### 9.3 Fighters

- **Resolution:** game canvas 480×270, integer-scaled (×3 at 1440p, ×4 at 1080p with letterboxing, and so on). Fighter frame 128×128, character about 90–100 px tall.
- **Palette:** a shared master palette of about 48 colours across the game; each fighter uses at most 16.

| Animation | Frames *(estimate)* | Animation | Frames |
|---|---|---|---|
| Intro | 12 | Block | 4 |
| Idle (loop) | 8 | Parry | 6 |
| Walk forward / back | 8 / 8 | Hit light / heavy | 4 / 6 |
| Light attack | 6 | Stagger | 6 |
| Medium attack | 8 | Knockdown + get up | 10 + 8 |
| Heavy attack | 10 | Launcher + juggle hit | 8 + 6 |
| Special | 14 | KO | 12 |
| Super (cinematic) | 20–30 | Victory | 12 |
| Dodge | 6 | Fizzle (failed super) | 6 |

That is roughly **190–200 frames per fighter**. MVP needs 2 (Kai and Rook); v1.0 needs 3 fighters, 7 opponents and 2 bosses. Bosses can be 192×192.

### 9.4 Arenas, effects, UI

- **Arenas:** 480×270 per layer, 3–4 parallax layers, 2–4 ambient loops (rain, neon flicker, lanterns), plus floor and shadow.
- **Effects:** hit sparks (light, heavy, parry), block flash, dust, word shatter shards, super aura, KO burst, combo counter pop. Each 6–10 frames.
- **Portraits:** a select-screen portrait (96×96) and a report portrait for each character.
- **UI:** about 25 icons; logo mark and wordmark; favicon and PWA icons; menu background silhouette.

### 9.5 Audio

- **SFX:** keystroke ticks (soft and mechanical variants), error tick, word complete, light/medium/heavy hit, block, parry, dodge, super charge and launch, fizzle, KO, round start and end, UI move, select and back. About 35 sounds.
- **Music:** menu (calm), Learning ambient (low energy, optional), 4 arena tracks, 2 boss tracks, a victory sting.
- **Sources:** generated or synthesised SFX (e.g. jsfxr-style tools) and commissioned music, or tracks with a clear licence. **Every licence is recorded in `CREDITS.md`.**

---

## 10. Development phases and acceptance criteria

Each phase ends with its tests green in CI and its docs updated.

### Phase 0: Foundation
Scaffold, design tokens, app shell, hash router, transitions, settings, store with migrations, export and import, CI.
**Accepted when:** the app boots from `npm run dev`; settings survive a reload; export → reset → import restores identical progress (automated test); CI runs lint, type check, test and build; README with setup steps exists.

### Phase 1: Typing engine and Free Practice
Input adapter, engine, metrics, stats aggregation, word generator, timed and word-count tests, custom text, results screen with heatmap.
**Accepted when:** metric unit tests pass (including edge cases: zero duration, all-error runs, backspace corrections, pauses); a recorded keystroke fixture produces exactly the expected WPM, accuracy and consistency; stats persist between sessions; browser shortcuts (`'`, `/`, Backspace, Tab, Space) don't trigger browser actions while typing in Chrome, Firefox, Edge and Safari.

### Phase 2: Keyboard and hands
The keyboard component, hand rig, pose data for every US QWERTY key, the dev-only pose editor, reduced-motion fallback.
**Accepted when:** every key has a pose using its assigned finger (automated check against the finger map); a visual review of all ~96 poses against reference photos is signed off by you; the animation runs at 60 fps on a mid-range laptop; reduced motion shows static poses.

### Phase 3: Learning MVP
Onboarding, keyboard check, lesson runner with all step types, fading guidance, summaries, recommendations, Units 0–2, the Continue card.
**Accepted when:** a first-time user can go from first launch to finishing Unit 1 using only the keyboard (Playwright e2e); no lesson is ever locked (automated test); guidance levels move up and down as defined in §5.4 (unit tests); every generated text contains only allowed keys (test across every lesson and many seeds).

### Phase 4: Full curriculum and Stats
Units 3–8, Finger Gym, placement test, Stats dashboard, calm vs pressure split.
**Accepted when:** content validation passes for every lesson (allowed keys, finger tags, no empty word pools); recommendation rules have a unit test for each row of §4.5; the dashboard numbers match the sum of stored sessions.

### Phase 5: Fight vertical slice (end of MVP)
Combat core and simulator, Phaser scene, DOM prompt overlay, Kai vs Rook in one arena with placeholder art, all mechanics, all difficulties including Practice, post-match report and links back to Learning.
**Accepted when:** the simulator bands in §6.7 pass in CI; Practice difficulty cannot be lost (simulator and e2e); a scripted e2e fight completes; 60 fps with effects on; Learning and Practice pages do not load Phaser (checked in the build output); playtest with at least 3 people, with fun and readability as the pass criteria.

### Phase 6: Fight content
Remaining fighters and opponents, Nemesis, Compiler boss, arcade ladder, achievements, 4 arenas, code duel. Unit 9 code tracks.
**Accepted when:** each opponent passes its simulator band; Nemesis prompts come from the weakest keys in a test progress fixture; content validation covers fighters and arenas.

### Phase 7: Art and audio replacement
Final pixel art, hand art, music, SFX, credits.
**Accepted when:** no placeholder assets remain (build check); all licences recorded; the art spec is followed (palette, sizes, frame counts).

### Phase 8: Polish and release (v1.0)
PWA offline, accessibility audit, performance pass, cross-browser testing, docs, release.
**Accepted when:** Lighthouse accessibility ≥ 95 on menu pages; manual screen-reader pass on menus and settings; initial load of the menu under the budgets in §11; full documentation set exists (README, ARCHITECTURE, CONTENT_GUIDE, ART_SPEC, BALANCING, ACCESSIBILITY, CREDITS); deployed to a public URL.

---

## 11. Potential technical challenges and solutions

| Challenge | Solution |
|---|---|
| **The game can't see which finger you used** | Teach and nudge rather than verify. Coach from indirect signals: hesitation, slow letter pairs, uneven rhythm. Never claim "wrong finger". Webcam tracking stays a later, optional feature |
| **Visually accurate hands** | Data-driven SVG rig, IK first draft plus hand-tuned pose for each key, reference photos, and a dev-only pose editor. This is the hardest art-and-code piece in Learning, so it gets its own phase (2) |
| **Non-US layouts and dead keys** (US-International turns `'` and `"` into dead keys) | Onboarding keyboard check. Where available, the Keyboard Map API detects the layout (Chromium only, so this is to verify per browser). Show a clear message: "Homerow currently supports US QWERTY; your keyboard may produce different characters" |
| **Browser shortcuts** (Firefox quick find on `'` and `/`, Space scrolling, Backspace, Tab) | `preventDefault` for those keys only on typing surfaces; Ctrl/Cmd shortcuts are never blocked |
| **Simultaneous-key ghosting** | Never require more than 2 keys at once; Shift plus one key is the maximum |
| **Input timing accuracy** | `performance.now()` timestamps at the event; metrics never depend on frame rate; key auto-repeat ignored (`event.repeat`) |
| **Tab switching mid-fight** | Pause on `visibilitychange` and blur; the fixed-timestep combat core never catches up on lost time |
| **Combining Preact and Phaser** | `FightScreen` creates the Phaser game on mount and destroys it on unmount (tested against memory leaks by mounting it 10 times); the DOM overlay talks to Phaser only through the combat state |
| **Crisp pixel art** | Integer scaling, `pixelArt: true`, letterboxing, `image-rendering: pixelated` |
| **Bundle size** | Phaser in its own lazy-loaded chunk. Budgets: menu and Learning ≤ 150 KB gzipped JS; Fight chunk measured, with Phaser's custom build to remove unused modules if needed. Exact Phaser size to verify |
| **localStorage limits and data loss** | Aggregates only; quota handling; export and import; automatic backup before reset or import; `pagehide` save |
| **Content errors produce wrong advice** | Build-time content validation: every lesson tagged with fingers and keys, allowed keys checked, no empty word pools |
| **Word list licence and offensive words** | Use only clearly licensed lists, record the licence, apply a profanity filter, add a test |
| **Making Fight fun is a design risk, not a code risk** | Vertical slice and playtest in Phase 5 *before* producing the art for 10 characters |
| **Art cost** | Placeholder-first, a strict art spec, MVP with 2 characters, and scaling the roster only after the slice is proven |

---

## 12. Testing strategy

| Layer | Tool | What is covered |
|---|---|---|
| **Unit (core)** | Vitest | Metrics (WPM, raw, accuracy, consistency, reaction) with edge cases; engine state transitions for both error modes; layout integrity (every printable US ASCII character reachable, every key has a finger, Shift on the opposite hand); guidance level changes; lesson mastery; recommendation rules; store migrations from every past version; export and import round-trip; import rejects malformed or hostile files |
| **Property tests** | Vitest with many seeded runs | Text generators never emit characters outside the allowed keys; weighting tilts toward weak keys; combat state never has negative HP or a stuck state |
| **Content validation** | `content/validate.ts` run in CI | Lessons, fighters, opponents, arenas and layouts all match their schemas and reference real assets |
| **Balance simulation** | `core/sim` in CI | Win-rate bands per difficulty and opponent (§6.7); round length; Practice cannot be lost |
| **Component** | Vitest + Testing Library | Keyboard highlights the right key and finger; summary shows recommendation; settings controls work by keyboard |
| **End-to-end** | Playwright (Chromium, Firefox, WebKit) | First launch → Lesson 1.1 complete; timed test → results; scripted fight vs Rook on Practice; reduced motion setting respected; export → reset → import |
| **Golden fixtures** | Recorded keystroke sessions | Replaying a real session yields exactly the stored metrics, so a metric change is noticed |
| **Performance** | Playwright traces + manual | 60 fps in Fight with effects; input-to-caret delay under one frame; bundle budget check in CI |
| **Accessibility** | axe-core in Playwright + manual | No critical axe violations on menu pages; keyboard-only run-through; screen-reader pass before release |
| **Playtesting** | People | Phase 3 (Learning with a complete beginner), Phase 5 (Fight fun), Phase 8 (full run) |

Target: ≥ 90% line coverage in `core/`. No coverage target for the UI; the e2e journeys cover it instead.

---

## 13. What would make Homerow stand out

1. **Fight from day one with "Your keys".** Fights use only keys you've learned, so a beginner can play after 10 minutes. No other typing game I know of links its course to its combat this way.
2. **Hands that move like hands.** Most tutors highlight a key. Homerow shows the finger travel home → key → home for every key, then fades that help one key at a time as you master it.
3. **Calm vs pressure numbers.** It tracks how your typing holds up under stress, which is a real skill no common typing site measures.
4. **The Nemesis.** A boss rebuilt every day from your own weakest keys and letter pairs. Adaptive practice disguised as a rivalry.
5. **A real programmer track.** Symbol-heavy drills and real code snippets in several languages, auto-indent handled like an editor, and a code boss that "fails the build".
6. **Finger-level coaching.** "Your right ring finger is 60 ms slower than your other fingers" with a 3-minute drill to fix it.
7. **A rhythm score that rewards good technique.** Flow in Fight and steadiness in Learning reward even timing, a real sign of touch typing.
8. **Keyboard-only everything.** A typing app you never need a mouse for, including menus and settings.
9. **Respect for the player.** No accounts, no ads, no tracking, no guilt notifications, works offline, and you own your data through export.
10. **A balance simulator in CI.** An engineering showpiece for a portfolio: game balance verified by automated tests.

---

## Decisions needing your approval

1. **Name:** "Homerow" as the working title, with availability checked before release. Or pick Keybound, Tenfold, or your own.
2. **Hands rendered as vector (SVG) art, not pixel art,** for accuracy. Fighters and arenas stay pixel art. (§9.2)
3. **Fight has no backspace**, and typos break combos; Learning and Practice allow backspace. (Agreed previously; confirming.)
4. **MVP = Phases 0–5:** Learning Units 0–2, Free Practice, Stats basics, and one fight (Kai vs Rook) with placeholder art. Webcam tracking is out of MVP and v1.0.
5. **Learning error default:** the caret waits for the correct key ("stop on error"), with "continue" as an option.
6. **Code tracks order:** Python and JavaScript/TypeScript first, then C, Java, C++, SQL, shell. Your original list had Java, C, C++ and Python, so confirm whether JS/TS should be added.
7. **Hosting:** GitHub Pages, Cloudflare Pages or Netlify (all free and static); you choose at Phase 8.
8. **Art sourcing:** draw it yourself, commission it, or use interim packs; this decision is needed before Phase 7.
9. **`@preact/signals`** as the only runtime dependency besides Preact and Phaser.
10. **Two changes from the earlier draft:** G and H now sit in Unit 1 (home row) instead of a separate "inner columns" unit, and mastery thresholds are recommendations only, never gates (your "skip freely" rule). Storage is localStorage, per your decision, instead of the IndexedDB mentioned earlier.
