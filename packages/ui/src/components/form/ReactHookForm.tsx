'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PropsWithChildren } from 'react';
import {
  type FieldValues,
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  type UseFormProps,
} from 'react-hook-form';
import * as z from 'zod/v4';

type ReactHookFormProps<T extends FieldValues> = {
  className?: string;
  onSubmitValid: SubmitHandler<T>;
  onSubmitInvalid?: SubmitErrorHandler<T>;
  options?: UseFormProps<T>;
  schema?: z.ZodType<T, T>;
} & PropsWithChildren;

export function ReactHookForm<T extends FieldValues>({
  children,
  className,
  onSubmitValid,
  onSubmitInvalid,
  options,
  schema,
}: ReactHookFormProps<T>) {
  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    ...options,
  });

  return (
    <FormProvider {...form}>
      <form
        className={className}
        onSubmit={form.handleSubmit(onSubmitValid, onSubmitInvalid)}
      >
        {children}
      </form>
    </FormProvider>
  );
}