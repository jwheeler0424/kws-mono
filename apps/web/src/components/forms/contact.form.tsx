'use client';

import { Field, FieldError, FieldLabel } from '@kws/design/ui/field';
import { Spinner } from '@kws/design/ui/spinner';
import { Textarea } from '@kws/design/ui/textarea';
import { toast } from '@kws/design/ui/toast';
import { useForm, useSelector } from '@tanstack/react-form';
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

      await contactMutation
        .mutateAsync({ data: { name, email, phone, message, propertyAddress } })
        .catch(() => undefined);
    },
  });

  const contactMutation = useMutation({
    mutationFn: (request: Parameters<typeof submitContactFn>[0]) => submitContactFn(request),
    onError: (error) => {
      console.error('Error submitting contact form:', error);
      toast.error('There was an error submitting your request. Please try again later.');
    },
    onSuccess: () => {
      toast.success('Your message has been sent successfully');
      form.reset();
    },
  });

  const canSubmit = useSelector(form.store, (state) => state.canSubmit);
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form
      className={cn('grid w-full grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2', className)}
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
            <Field data-invalid={isInvalid} className='gap-2 sm:col-span-2'>
              <FieldLabel htmlFor={field.name} className='text-sm font-medium text-neutral-900'>
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
                  'h-12 w-full rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:ring-offset-0',
                )}
                disabled={isSubmitting}
              />

              {isInvalid && (
                <FieldError className='text-destructive' errors={field.state.meta.errors} />
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
            <Field data-invalid={isInvalid} className='gap-2'>
              <FieldLabel htmlFor={field.name} className='text-sm font-medium text-neutral-900'>
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
                autoComplete='email'
                className={cn(
                  'h-12 w-full rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:ring-offset-0',
                )}
                placeholder={'yourself@company.com'}
                disabled={isSubmitting}
              />
              {isInvalid && (
                <FieldError className='text-destructive' errors={field.state.meta.errors} />
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
            <Field data-invalid={isInvalid} className='gap-2'>
              <FieldLabel htmlFor={field.name} className='text-sm font-medium text-neutral-900'>
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
                autoComplete='tel'
                className={cn(
                  'h-12 w-full rounded-none border-neutral-300 bg-white px-4 text-base text-neutral-900 shadow-none placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:ring-offset-0',
                )}
                placeholder={'206-555-5555'}
                disabled={isSubmitting}
              />
              {isInvalid && (
                <FieldError className='text-destructive' errors={field.state.meta.errors} />
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
            <Field data-invalid={isInvalid} className='gap-2 sm:col-span-2'>
              <FieldLabel htmlFor={field.name} className='text-sm font-medium text-neutral-900'>
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
                  'min-h-44 w-full resize-y rounded-none border-neutral-300 bg-white px-4 py-3 text-base leading-7 text-neutral-900 shadow-none placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:ring-offset-0',
                )}
                placeholder='How can I help?'
                disabled={isSubmitting}
              />

              {isInvalid && (
                <FieldError className='text-destructive' errors={field.state.meta.errors} />
              )}
            </Field>
          );
        }}
      />

      <Button
        type='submit'
        disabled={!canSubmit || isSubmitting}
        className='mt-2 w-full sm:col-span-2 sm:w-auto sm:justify-self-start'
        size={'lg'}
        variant={'solidPrimary'}>
        {isSubmitting ? (
          <>
            <Spinner /> {'Submitting request...'}
          </>
        ) : (
          'Send message'
        )}
      </Button>
    </form>
  );
}

ContactForm.displayName = 'ContactForm';

export default ContactForm;
