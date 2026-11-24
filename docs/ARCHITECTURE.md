# Architecture

This document describes the code as it exists now. For the full product plan, see [PLAN.md](PLAN.md).

## Layers

```
src/
├─ main.tsx          entry: fonts, global CSS, render <App/>
├─ app/              shell: router, global hotkeys, page transitions, app-wide state
├─ core/             pure TypeScript: no DOM, Preact or Phaser (enforced by ESLint)
│  ├─ layout/        keyboard layouts as data (US QWERTY), character → key + finger lookup
│  ├─ typing/        the shared typing engine and the one definition of every metric
│  ├─ stats/         folds finished sessions into progress (per key, letter pair, day)
│  ├─ textgen/       word filtering and picking, "your keys", custom-text cleanup
│  └─ store/         schema, validation, migrations, persistence, export/import
├─ content/          data: word lists (later lessons, fighters, arenas)
├─ ui/               design system: tokens, base styles, motion, shared components
│  ├─ typing/        typing-key capture hook and the scrolling typed-text view
│  └─ keyboard/      on-screen keyboard, heatmap, animated hands
└─ features/         one folder per screen: menu, settings, practice, (learning, fight, stats…)
```

## Typing pipeline

```
keydown ─► useTypingKeys (ui/typing)        blocks browser actions on typing keys, drops auto-repeat
        ─► TypingSession.input (core/typing) compares with the target, records a TypingEvent
        ─► screen renders TypingText         caret, done / fixed / wrong characters
finish  ─► computeMetrics (core/typing)       WPM, raw WPM, accuracy, consistency
        ─► recordSession (core/stats)         per-key, per-pair and daily totals into progress
```

- **Keys are identified by character.** The engine compares `KeyboardEvent.key` with the target; the layout maps each character to its physical key and finger for stats (`Space`, `KeyA`…). Capitals count toward their letter's key.
- **Error modes** (Settings → Learning → On a typo): _Wait_ keeps the cursor on the character until it is typed correctly, and Backspace does nothing. _Continue_ moves on and allows Backspace.
- **Time** is `KeyboardEvent.timeStamp` minus time spent paused. A test pauses when the window loses focus, and the key that resumes it is not typed.
- **Metric definitions** are in `core/typing/metrics.ts` and covered by fixture tests. Gaps over 2 s count as pauses and are left out of rhythm and key-speed numbers.
- **Stats:** per-key presses, errors and running mean latency, the last 50 results (for mastery), and calm vs pressure splits. The 300 most-typed letter pairs are kept. Daily minutes and WPM are kept forever; only the 300 latest session summaries are kept.
- **"Your keys"** means the home row plus any letter typed 20+ times at 90%+ recent accuracy. Learning lessons count toward this through the shared per-key stats.

Rules, enforced by `eslint.config.js`:

1. `core/` imports nothing from `preact`, `phaser`, `app/`, `ui/` or `features/`. Its logic can be unit-tested and simulated without a browser.
2. A feature never imports another feature. Shared code goes in `core/` (logic) or `ui/` (components). Features may read app state from `app/state.ts`.

## Learning Mode

| Where                    | What                                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/curriculum/`    | The course as data: Units 0–8 (orientation, home, top and bottom rows, capitals, flow, punctuation, numbers, symbols), the code tracks (`code.ts`: Python, C, Java, C++, one line per prompt) and the Finger Gym (one drill per finger and per hand). Lesson ids are `u1.l2`, `py.l1`, `gym.l2` |
| `core/learning/lessons`  | Lesson and step types; `drillText` builds each drill from the lesson's allowed keys (real words when there are enough, otherwise short letter patterns)                                                                                                                                         |
| `core/learning/guidance` | Per-key fading guidance, PLAN §5.4: level 3 → 0 as accuracy holds, one level per lesson, help comes back below 90%. Stored in the existing `KeyStat.guidance`                                                                                                                                   |
| `core/learning/results`  | Joins a lesson's steps into **one** session, records it with `recordSession`, updates guidance and `progress.lessons`; mastery; `recommend` (PLAN §4.5); `nextLesson`                                                                                                                           |
| `core/learning/fingers`  | Home key per finger and plain-language reach descriptions                                                                                                                                                                                                                                       |
| `ui/keyboard/handRig.ts` | Top-down hand rig in key units. Poses are derived from the layout (fingertip → key, small wrist shift, neighbours lift a little), so every key has one without pose tables                                                                                                                      |
| `ui/keyboard/Hands.tsx`  | SVG hands over the keyboard. Motion is CSS transform transitions only (home → reach → press → return), so reduced motion gives static poses                                                                                                                                                     |
| `features/learning/`     | Lesson list (nothing locked), step runner (intro, find, demo, drill), summary with recommendations                                                                                                                                                                                              |

No schema change: Learning uses the existing `Progress.lessons`, `KeyStat.guidance` and the Learning settings (`showHands`, `handTone`, `guidanceOverride`, `errorMode`, `fingerLabels`). Unit 0 is not scored or recorded.

Shift mastery: `useTypingKeys` reports which Shift is held, and `keyResults` scores `ShiftLeft` / `ShiftRight` as keys of their own for every shifted character (correct = a shifted character came out with the opposite-hand Shift). A forgotten Shift counts against Shift, not the letter. Capital hints fade only when both the letter and its Shift have faded; a weak Shift recommends the Capitals lesson for that side; Stats lists both Shift keys. Finger stats and drill focus leave Shift out.

Finger colours are CSS variables (`--finger-l5` …). The colour-blind setting sets `<html data-palette="cb">`, which swaps them for four Okabe–Ito colours (`ui/base.css`) and stripes the lit key, so the keyboard, hands and demo caps all follow without code changes.

First launch (`features/menu/Onboarding.tsx`) asks "How do you type today?" once, only for an empty profile, and stores `settings.onboarded`. "Place me" opens the placement test (`core/learning/placement.ts`): short stages, easiest first, stopping at the first one below 93% accuracy or 25 WPM. Passed units are marked completed, never mastered; the test is not recorded as a session. It is also linked from the lesson list.

## Stats & Progress

`core/stats/dashboard.ts` computes the screen's numbers as pure functions that take `now` as an argument, so tests can check them against sums of stored sessions. Speed, accuracy and the WPM trend come from `sessions` filtered to 7 days, 30 days or all; "all" covers only the 300 kept sessions. WPM and accuracy are weighted by session duration. Calm means Learning and Practice; under pressure means Fight (`mode === 'fight'`). The key mastery map uses each key's last 50 results, and the finger table uses lifetime per-key stats. Recommendations (`overviewRecommendations` in `core/learning/results`) cover the §4.5 rows that don't need Fight. They open the matching mode but not a specific lesson, because the router has no parameters.

## State and persistence

`app/state.ts` holds two signals, `progress` and `settings`, that every screen reads. Screens change them by assigning new values (`updateSettings(patch)`, `replaceProgress(next)`), and saving happens automatically:

| Data     | Saved                                        | Key              |
| -------- | -------------------------------------------- | ---------------- |
| Settings | immediately on change                        | `typix.settings` |
| Progress | 1 s after the last change, and on `pagehide` | `typix.progress` |

The save logic lives in `core/store/persist.ts` and takes a `KeyValueStore` (the `getItem`/`setItem`/`removeItem` subset of Web Storage). Tests pass an in-memory store instead.

- **Untrusted input:** stored data and imported files go through `core/store/validate.ts`. Progress must match the schema exactly or it is rejected. Settings are checked field by field: invalid fields fall back to their defaults and unknown keys are dropped.
- **Corrupt saves** are copied to `typix.progress.corrupt` rather than overwritten, a fresh profile starts, and a banner explains what happened.
- **Storage full:** the oldest session summaries are trimmed while aggregates are kept, then the save is retried once. If it still fails, a banner suggests exporting.
- **Storage unavailable** (for example, blocked by privacy settings): the app runs from memory and warns that nothing will be saved.

### Schema changes

1. Change the types in `core/store/schema.ts`.
2. Bump `SCHEMA_VERSION`.
3. Add `migrations[oldVersion]` in `core/store/migrations.ts`, a function that turns the old shape into the new one.
4. Update `validate.ts`, and add a test that migrates a fixture save from the old version.

Saves from a _newer_ version are refused rather than downgraded.

### Export and import

`core/store/export-import.ts` defines the file format (`{ app: 'typix', exportedAt, progress, settings }`). An import is size-limited, parsed, migrated and validated, then shown as a summary for the player to confirm. Before an import or reset replaces anything, the current progress is downloaded as a backup.

## Routing and transitions

`app/router.ts` is a small hash router (`#/`, `#/learn`, `#/settings`, …). Hash routing works on any static host without server rewrites. The current screen is keyed by route, so its enter animation (`.screen-enter` in `ui/motion.css`) replays on every navigation. On route change, focus moves to the screen's `[data-autofocus]` element.

Recommendations, the Continue card and onboarding open a lesson directly with `openLesson(id)` (`app/state.ts`): it sets `pendingLesson`, which `LearningScreen` consumes on mount.

Global keys: **Esc** returns to the menu, unless a `<dialog>` is open; dialogs handle Esc themselves.

## Theming and motion

- All colours, type sizes, spacing and durations are CSS custom properties in `ui/tokens.css`. Components use the tokens, never raw values.
- `<html data-mode="calm|fight">` switches `--accent` between the calm teal and the fight amber.
- `<html data-motion="reduce|full">` comes from the reduced-motion setting: "System" follows `prefers-reduced-motion`, or it can be forced on or off. Under `reduce`, transitions become short fades and CSS transitions are effectively instant.
- `<html data-text-size>` carries the typing text size for the typing surfaces (from Phase 1).

## Components (`ui/components`)

| Component       | Notes                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| `Icon`          | House icon set as inline SVG paths; add new icons here                      |
| `Button`        | `primary`, `secondary`, `danger`, `ghost` variants                          |
| `Field`         | Labelled settings row; control ids link to labels and hints                 |
| `Toggle`        | `role="switch"` button                                                      |
| `Slider`        | Native range input, 0–1 value, "Off" at 0                                   |
| `Segmented`     | Native radio group styled as a segmented control (arrow keys work natively) |
| `ConfirmDialog` | Built on `<dialog>` for native focus trapping and Esc to cancel             |
| `Screen`        | Page frame with back button and title                                       |

## Testing

`npm test` runs Vitest on `src/**/*.test.ts`. The store suite covers validation, settings sanitising, migrations, persistence (first launch, round trip, corrupt data, full storage) and the export → reset → import round trip, including hostile import files.

CI (`.github/workflows/ci.yml`) runs the type check, lint, format check, tests and build on every push and pull request.
