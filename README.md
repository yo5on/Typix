# Typix

**Learn to type. Then fight with it.**

Typix is a free, browser-based touch-typing trainer in three modes:

- **Learn Typing**: a calm, guided course with animated hands, from the home row to code.
- **Free Practice**: timed tests, weak-key drills and your own text.
- **Fight**: an arcade fighting game where typing is how you attack, guard and finish.

All three modes share one typing engine and one progress store. Progress stays in your browser, so there are no accounts and no backend. You can export your progress to a file at any time.

> **Status:** Free Practice and Learning Mode (Units 0–8, Finger Gym, animated hands, fading guidance) and the Stats & Progress dashboard are built and unit-tested. Fight is a prototype on the `feature/fight-lab` branch. See [the plan](docs/PLAN.md) and the open items below.

### Open items (not yet verified)

Each item stays open until someone checks it by hand. Passing unit tests don't close it.

- **Browser compatibility:** typing shortcuts (`'`, `/`, Backspace, Tab, Space) must not trigger browser actions in Chrome, Firefox, Edge or Safari. The keyboard and hands still need a cross-browser rendering check.
- **Accessibility:** a keyboard-only run through Learning; a screen-reader pass on menus, settings, summaries and stats; a reduced-motion check; Lighthouse accessibility ≥ 95.
- **Hand poses:** visual sign-off of every key pose against reference photos, 60 fps on a mid-range laptop, and static poses under reduced motion.
- **Curriculum:** a hand-typed pass through Units 6–8 (punctuation, numbers, symbols) to judge the generated text, multi-line code snippets (the code tracks are one line per prompt until the engine has an Enter key), the onboarding keyboard check (PLAN §4.1 step 3), tuning the placement pass mark, and a Playwright e2e from first launch to the end of Unit 1.
- **Fight-dependent stats:** the pressure split, fight record and the Fight rows of the recommendation rules (PLAN §4.5) wait for Fight mode.

### Parallel development

Use one git worktree for each parallel effort, and never switch branches in a shared checkout. Learning and stable features go on `main`. Experimental Fight work goes on `feature/fight-lab` (`git worktree add ../type-fight-lab feature/fight-lab`).

## Requirements

- Node.js 22 or newer
- A physical keyboard. US QWERTY is supported for now.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Command                           | What it does                                |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | Start the dev server with hot reload        |
| `npm run build`                   | Type-check and build to `dist/`             |
| `npm run preview`                 | Serve the production build locally          |
| `npm test` / `npm run test:watch` | Run unit tests (Vitest)                     |
| `npm run lint`                    | ESLint, including the module-boundary rules |
| `npm run typecheck`               | TypeScript only                             |
| `npm run format`                  | Format with Prettier                        |
| `npm run check`                   | Everything CI runs, in one command          |

## Tech

TypeScript, Vite, Preact and `@preact/signals`. Phaser 3 is added in Phase 5 and loads only when you open Fight. Fonts (Inter, JetBrains Mono, Space Grotesk; SIL Open Font License) are bundled, so the app makes no third-party requests.

## Documentation

- [docs/PLAN.md](docs/PLAN.md): the full product and technical plan
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the code is organised and why

## Deployment

`npm run build` produces a static site in `dist/` that works from any path, using hash routing and relative asset URLs. It can be hosted on GitHub Pages, Cloudflare Pages, Netlify or any static file server.

## Privacy

Typix stores progress and settings in your browser's `localStorage` (`typix.progress`, `typix.settings`). Nothing is sent anywhere. Clearing site data deletes your progress, so use **Settings → Data → Export** to keep a backup.
