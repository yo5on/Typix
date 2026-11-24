# Architecture

This document describes the code as it exists now. For the full product plan, see [PLAN.md](PLAN.md).

## Layers

```
src/
├─ main.tsx          entry: fonts, global CSS, render <App/>
├─ app/              shell: router, global hotkeys, page transitions, app-wide state
├─ core/             pure TypeScript: no DOM, Preact or Phaser (enforced by ESLint)
│  └─ store/         schema, validation, migrations, persistence, export/import
├─ ui/               design system: tokens, base styles, motion, shared components
└─ features/         one folder per screen: menu, settings, (learning, practice, fight, stats…)
```

Rules, enforced by `eslint.config.js`:

1. `core/` imports nothing from `preact`, `phaser`, `app/`, `ui/` or `features/`. Its logic can be unit-tested and simulated without a browser.
2. A feature never imports another feature. Shared code goes in `core/` (logic) or `ui/` (components). Features may read app state from `app/state.ts`.

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
