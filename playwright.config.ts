import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against the production build, in all three engines. Own port, never reusing a server, so a
// dev server already running on 5173/5174 can't stand in for the build under test.
const PORT = 5199;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  timeout: 180_000,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
