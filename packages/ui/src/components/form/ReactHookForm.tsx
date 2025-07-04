'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PropsWithChildren, useMemo } from 'react';
import {
  type FieldValues,
  FormProvider,
  SubmitErrorHandler,
  SubmitHandler,
  useForm,
  type UseFormProps,
} from 'react-hook-form';
import * as z from 'zod/v4';

import { MetadataContext } from '@locano/ui/contexts';

type ReactHookFormProps<T extends FieldValues> = {
  className?: string;
  formId: string;
  onSubmitValid: SubmitHandler<T>;
  onSubmitInvalid?: SubmitErrorHandler<T>;
  options?: UseFormProps<T>;
  schema?: z.ZodType<T, T>;
} & PropsWithChildren;

export function ReactHookForm<T extends FieldValues>({
  children,
  className,
  formId,
  onSubmitValid,
  onSubmitInvalid,
  options,
  schema,
}: ReactHookFormProps<T>) {
  const form = useForm<T>({
    resolver: schema ? zodResolver(schema) : undefined,
    ...options,
  });

  const metadata = useMemo(() => ({
    formId,
    formTranslationsPath: `form.${formId}`,
  }), [formId]);

  return (
    <FormProvider {...form}>
      <MetadataContext value={metadata}>
        <form
          className={className}
          onSubmit={form.handleSubmit(onSubmitValid, onSubmitInvalid)}
        >
          {children}
        </form>
      </MetadataContext>
    </FormProvider>
  );
}