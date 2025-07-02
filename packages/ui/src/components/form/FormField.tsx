'use client';

import type { ComponentType } from 'react';
import {
  Controller,
  useFormContext,
} from 'react-hook-form';

type FormFieldProps = {
  name: string;
  label?: string;
  component: ComponentType<any>;
};

export function FormField({
  name,
  label,
  component: Component,
  ...rest
}: FormFieldProps) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Component
          {...field}
          {...rest}
          label={label}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
