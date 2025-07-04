'use client';

import { useTranslations } from 'next-intl';
import { type ComponentType, type InputHTMLAttributes, type SelectHTMLAttributes,use } from 'react';
import {
  Controller,
  FieldValues,
  Path,
  useFormContext,
} from 'react-hook-form';

import { MetadataContext } from '@locano/ui/contexts';

type FormFieldProps<TFieldValues extends FieldValues, TComponentProps extends object> = {
  name: Path<TFieldValues>;
  label?: string;
  component: ComponentType<TComponentProps>;
} & Omit<TComponentProps, keyof InputHTMLAttributes<HTMLInputElement> | keyof SelectHTMLAttributes<HTMLSelectElement>>;

export function FormField<TFieldValues extends FieldValues>({
  name,
  label,
  component: Component,
  ...rest
}: FormFieldProps<TFieldValues, any>) {
  const metadata = use(MetadataContext);
  const t = useTranslations(`${metadata.formTranslationsPath}.field.${name}`);
  const t2 = useTranslations();
  console.log(t2('form.signIn.field.password.error.tooShort'));
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div>
          {label && <label htmlFor={name}>{label}</label>}
          <Component
            {...field}
            {...rest}
            id={name}
            error={fieldState.error?.message}
          />
          {fieldState.error && (
            <span style={{ color: 'red' }}>{t(fieldState.error.message)}</span>
          )}
        </div>
      )}
    />
  );
}
