import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** Project rules from CLAUDE.md "Code conventions". */
const projectRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
      message: 'Never use dangerouslySetInnerHTML (docs/09-privacy-and-security.md).',
    },
    {
      selector: 'ExportDefaultDeclaration',
      message: 'Use named exports. Only Astro pages may default-export.',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      paths: [
        {
          name: 'zod',
          message: "Import { z } from 'src/lib/zod.ts' so Zod runs without eval under the CSP.",
        },
      ],
    },
  ],
};

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.lighthouseci/',
      'src/generated/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs['flat/recommended'],
  ...astro.configs['flat/jsx-a11y-strict'],
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // role="list" on styled lists is deliberate: Safari drops list semantics without it.
      'astro/jsx-a11y/no-redundant-roles': [
        'error',
        { nav: ['navigation'], ul: ['list'], ol: ['list'] },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: projectRules,
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y, 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      ...jsxA11y.configs.strict.rules,
      ...reactHooks.configs.recommended.rules,
      'jsx-a11y/no-redundant-roles': ['error', { nav: ['navigation'], ul: ['list'], ol: ['list'] }],
    },
  },
  {
    // The zod wrapper itself, config files and scripts may use defaults and the raw package.
    files: ['src/lib/zod.ts', '*.config.{ts,js}', 'astro.config.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-syntax': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{ts,js}', 'astro.config.ts', 'tests/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
