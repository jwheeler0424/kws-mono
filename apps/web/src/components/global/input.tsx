import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Input as InputPrimitive } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'border-input bg-background ring-offset-background placeholder:text-muted-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-transparent dark:ring-offset-admin-900',
  {
    variants: {
      variant: {
        default: '',
        frontend:
          'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-admin-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface InputProps
  extends React.ComponentPropsWithRef<typeof InputPrimitive>, VariantProps<typeof inputVariants> {}

export function Input({ className, variant, ...props }: InputProps) {
  return <InputPrimitive className={cn(inputVariants({ variant }), className)} {...props} />;
}
