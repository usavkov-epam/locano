import { defineRouting } from 'next-intl/routing';

import { LOCALES } from './constants';
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: LOCALES,
 
  // Used when no locale matches
  defaultLocale: 'en',

  // The locale prefix to use in the URL
  // - 'as-needed' means that the locale prefix is only added when the locale is
  localePrefix: 'as-needed',
});
