import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // core/ must stay pure TypeScript so it can be tested and simulated without a browser or UI.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['preact', 'preact/*', '@preact/*'], message: 'core/ must not import UI code.' },
            { group: ['phaser'], message: 'core/ must not import Phaser.' },
            {
              group: ['**/features/**', '**/ui/**', '**/app/**'],
              message: 'core/ must not import from UI layers.',
            },
          ],
        },
      ],
    },
  },
  {
    // Features communicate only through core/ — never import another feature.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // "../x" from src/features/<name>/ is a sibling feature; "../../" (app, ui, core) is fine.
              regex: '^\\.\\./(?!\\.\\.)|/features/',
              message: 'Features must not import each other; share code via core/ or ui/.',
            },
          ],
        },
      ],
    },
  },
);
