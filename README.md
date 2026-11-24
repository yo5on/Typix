# Typix

**Learn to type. Then fight with it.**

Typix is a free, browser-based touch-typing trainer in three modes:

- **Learn Typing**: a calm, guided course with animated hands, from the home row to code.
- **Free Practice**: timed tests, weak-key drills and your own text.
- **Fight**: an arcade fighting game where typing is how you attack, guard and finish.

All three modes share one typing engine and one progress store. Progress stays in your browser, so there are no accounts and no backend. You can export your progress to a file at any time.

> **Status:** Phase 0 (foundation) is complete. The app shell, design system, settings and save system work. The modes arrive in later phases; see [the plan](docs/PLAN.md).

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
