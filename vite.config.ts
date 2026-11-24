import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Relative base so the build works from any static host sub-path (e.g. GitHub Pages).
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
