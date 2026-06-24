'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type LabelProps = React.ComponentProps<'label'>;

function Label({ className, htmlFor, ...props }: LabelProps) {
  const classes = cn(
    'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className,
  );

  if (htmlFor) {
    return <label data-slot='label' htmlFor={htmlFor} className={classes} {...props} />;
  }

  return <div data-slot='label' className={classes} {...(props as React.ComponentProps<'div'>)} />;
}

export { Label };
