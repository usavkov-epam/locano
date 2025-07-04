import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import onlyWarn from 'eslint-plugin-only-warn';
import pluginImportSort from 'eslint-plugin-simple-import-sort';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export default [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'object-curly-spacing': ['error', 'always'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    plugins: {
      'simple-import-sort': pluginImportSort,
    },
    rules: {
      'simple-import-sort/imports': ['error', {
        groups: [
          // 1. NPM packages
          ['^@?\\w'],

          // 2. @locano/*
          ['^@locano'],

          // 3. @/ — aliases for src
          ['^@/'],

          // 4. local imports from far to near
          ['^\\.\\./', '^\\./'],

          // 5. style imports
          ['^.+\\.s?css$'],
        ],
      }],
    },
  },
  {
    ignores: ['dist/**'],
  },
];
