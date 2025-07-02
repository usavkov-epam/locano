'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PropsWithChildren } from 'react';
import {
  type FieldValues,
  FormProvider,
  SubmitHandler,
  useForm,
  type UseFormProps,
} from 'react-hook-form';
import { ZodSchema } from 'zod';

type ReactHookFormProps<T extends FieldValues> = {
  className?: string;
  onSubmit: SubmitHandler<T>;
  options?: UseFormProps<T>;
  schema?: ZodSchema<T>;
} & PropsWithChildren;

export function ReactHookForm<T extends FieldValues>({
  children,
  className,
  onSubmit,
  options,
  schema,
}: ReactHookFormProps<T>) {
  const form = useForm<T>({
    ...(schema ? { resolver: zodResolver(schema) } : {}),
    ...options,
  });

  return (
    <FormProvider {...form}>
      <form
        className={className}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </FormProvider>
  );
};
