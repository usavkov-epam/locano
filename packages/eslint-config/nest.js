import baseConfig from './base.js';

/**
 * A custom ESLint configuration for libraries that use NestJS.
 *
 * @type {import("eslint").Linter.Config}
 * */
export default [
  ...baseConfig,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
