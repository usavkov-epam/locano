import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
} from './select';

interface LocaleSelectProps {
  locale: string;
  locales: Array<{ label: string; value: string; }>;
  onChange: (value: string) => void;
}

export const LocaleSelect: React.FC<LocaleSelectProps> = ({
  locale,
  locales,
  onChange,
}) => {
  const sortedLocales = useMemo(() => {
    return locales.toSorted((a, b) => a.label.localeCompare(b.label));
  }, [locales]);

  const preferredLocales = useMemo(() => {
    console.log(sortedLocales);
    return sortedLocales
      .filter(({ value }) => ['en', 'ru'].includes(value));
  }, [sortedLocales]);

  console.log('locale', locale);

  return (
    <Select
      onValueChange={onChange}
      value={locale}
    >
      <SelectTrigger>
        {locale}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Preferred</SelectLabel>
          {preferredLocales.map(({ label, value }) => (
            <SelectItem
              key={value}
              value={value}
            >
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectSeparator />
          {locales.map(({ label, value }) => (
            <SelectItem
              key={value}
              value={value}
            >
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};