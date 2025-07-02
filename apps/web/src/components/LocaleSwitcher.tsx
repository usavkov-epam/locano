'use client';

import {
  type Locale,
  useLocale,
  useTranslations,
} from 'next-intl';
import {
  useCallback,
  useMemo,
} from 'react';

import { LocaleSelect } from '@locano/ui/components';

import { LOCALES } from '@/i18n/constants';
import {
  usePathname,
  useRouter,
} from '@/i18n/navigation';

export function LocaleSwitcher() {
  const t = useTranslations('localeSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const locales = useMemo(() => (
    LOCALES.map((loc) => ({
      label: t(`locale.${loc}`),
      value: loc,
    }))
  ), [t]);

  const onChange = useCallback((value: string) => {
    router.replace(pathname, { locale: value as Locale });
  }, [pathname, router]);

  return (
    <div>
      <LocaleSelect
        locale={locale}
        locales={locales}
        onChange={onChange}
      />
    </div>
  );
}
