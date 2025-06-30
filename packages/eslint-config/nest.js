import base from './base.js';

/**
 * A custom ESLint configuration for libraries that use NestJS.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const nestJsConfig =  [
  ...base,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
