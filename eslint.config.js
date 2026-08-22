import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const browserGlobals = {
  chrome: 'readonly',
  clearTimeout: 'readonly',
  document: 'readonly',
  Document: 'readonly',
  Element: 'readonly',
  Event: 'readonly',
  history: 'readonly',
  HTMLButtonElement: 'readonly',
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLVideoElement: 'readonly',
  MediaSession: 'readonly',
  MutationObserver: 'readonly',
  navigator: 'readonly',
  ParentNode: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'native-host/**'],
  },
  eslint.configs.recommended,
  {
    files: ['extension/src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      globals: browserGlobals,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
];
