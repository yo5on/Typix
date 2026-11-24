import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against the production build, in all three engines. Own port, never reusing a server, so a
// dev server already running on 5173/5174 can't stand in for the build under test.
const PORT = 5199;

// Playwright WebKit on Windows takes ~250 ms per key press in this app (Linux CI: a few ms), too slow for the
// long specs and the WPM pass mark. Those are tagged and skipped there only.
declare const process: { platform: string; env: Record<string, string | undefined> };
const slowWebkit = process.platform === 'win32' ? /@slow-on-windows-webkit/ : undefined;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  timeout: 180_000,
  // shortcut: WebKit sometimes drops a Space press between lesson steps (seen on Linux CI); retries report it as
  // flaky instead of failing main. Remove once the cause (test engine or a real Safari focus issue) is known.
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: slowWebkit },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
