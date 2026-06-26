'use client';

import { Field, FieldError, FieldLabel } from '@kws/design/ui/field';
import { Spinner } from '@kws/design/ui/spinner';
import { Textarea } from '@kws/design/ui/textarea';
import { toast } from '@kws/design/ui/toast';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/global/button';
import { Input } from '@/components/global/input';
// import { env } from '@kws/config/env';
import { cn } from '@/lib/utils';

import { submitContactFn } from './contact.functions';
import { contactFormSchema } from './contact.schema';

export interface ContactFormProps extends React.PropsWithChildren<
  React.HTMLAttributes<HTMLFormElement>
> {
  propertyAddress?: string;
}

export function ContactForm({ propertyAddress, className, ...props }: ContactFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: propertyAddress
        ? `Hello, I'm interested in learning more about the property located at ${propertyAddress}. Could you please provide me with additional information? Thank you.`
        : '',
    },
    validators: {
      onSubmit: contactFormSchema,
    },
    onSubmit: async ({ value }) => {
      const { name, email, phone, message } = value;

      useMutation({
        mutationFn: async () =>
          submitContactFn({ data: { name, email, phone, message, propertyAddress } }),
        onError: (error) => {
          console.error('Error submitting contact form:', error);
          toast.error('There was an error submitting your request. Please try again later.');
        },
        onSuccess: () => {
          toast.success('Your message has been sent successfully');

          form.reset();
        },
      }).mutate();
    },
  });

  const { canSubmit, isSubmitting } = form.state;

  return (
    <form
      className={cn('w-full space-y-4', className)}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit();
      }}
      {...props}>
      <form.Field
        name='name'
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel
                htmlFor={field.name}
                className={cn('text-sm font-bold tracking-wider text-gray-900')}>
                Name
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                variant={'frontend'}
                placeholder='Alan Rickman'
                autoComplete='name'
                className={cn(
                  'focus:border-gray w-full rounded-md! border border-gray-200! px-2.5 py-3 text-sm text-gray-900 shadow ring-offset-0 placeholder:text-gray-200 placeholder:italic focus-visible:ring-0 focus-visible:ring-black! focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100',
                )}
                disabled={isSubmitting}
              />

              {isInvalid && (
                <FieldError className='text-polaris-primary' errors={field.state.meta.errors} />
              )}
            </Field>
          );
        }}
      />

      <form.Field
        name='email'
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className={cn('text-sm font-bold tracking-wider text-gray-900')}>
                Email
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                variant={'frontend'}
                type='email'
                className={cn(
                  'focus:border-gray w-full rounded-md! border border-gray-200! px-2.5 py-3 text-sm text-gray-900 shadow ring-offset-0 placeholder:text-gray-200 placeholder:italic focus-visible:ring-0 focus-visible:ring-black! focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100',
                )}
                placeholder={'yourself@company.com'}
                disabled={isSubmitting}
              />
              {isInvalid && (
                <FieldError className='text-polaris-primary' errors={field.state.meta.errors} />
              )}
            </Field>
          );
        }}
      />

      <form.Field
        name='phone'
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className={cn('text-sm font-bold tracking-wider text-gray-900')}>
                Phone
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                variant={'frontend'}
                type='tel'
                className={cn(
                  'focus:border-gray w-full rounded-md! border border-gray-200! px-2.5 py-3 text-sm text-gray-900 shadow ring-offset-0 placeholder:text-gray-200 placeholder:italic focus-visible:ring-0 focus-visible:ring-black! focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100',
                )}
                placeholder={'206-555-5555'}
                disabled={isSubmitting}
              />
              {isInvalid && (
                <FieldError className='text-polaris-primary' errors={field.state.meta.errors} />
              )}
            </Field>
          );
        }}
      />

      <form.Field
        name='message'
        children={(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className={cn('text-sm font-bold tracking-wider text-gray-900')}>
                Message
              </FieldLabel>
              <Textarea
                id={field.name}
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={isInvalid}
                className={cn(
                  'focus:border-gray min-h-20 w-full resize-none! rounded-md! border border-gray-200! px-2.5 py-1.5 text-sm text-gray-900 shadow ring-offset-0 placeholder:text-gray-200 placeholder:italic focus-visible:ring-1! focus-visible:ring-black! focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100',
                )}
                placeholder={'Ask us a question directly...'}
                disabled={isSubmitting}
              />

              {isInvalid && (
                <FieldError className='text-polaris-primary' errors={field.state.meta.errors} />
              )}
            </Field>
          );
        }}
      />

      <Button
        type='submit'
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'mt-2 w-full flex-1 grow text-base leading-6 transition-all duration-200 ease-linear',
          isSubmitting && 'flex-0',
        )}
        size={'lg'}
        variant={'solidPrimary'}>
        {isSubmitting ? (
          <>
            <Spinner /> {'Submitting request...'}
          </>
        ) : (
          'Submit'
        )}
      </Button>
    </form>
  );
}

ContactForm.displayName = 'ContactForm';

export default ContactForm;
