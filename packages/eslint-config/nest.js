import baseConfig from './base.js';

/**
 * A custom ESLint configuration for libraries that use NestJS.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const nestJsConfig =  [
  ...baseConfig,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
