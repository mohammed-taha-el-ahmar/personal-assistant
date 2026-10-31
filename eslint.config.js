import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', '.wrangler/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.browser },
  },
  {
    files: ['js/theme-init.js'],
    languageOptions: { sourceType: 'script' },
  },
  {
    files: ['worker/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.serviceworker, ...globals.es2024, AbortSignal: 'readonly' },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
];
