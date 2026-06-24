'use client';

import type { ToasterProps } from 'sonner';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className='toaster group'
      icons={{
        success: <CircleCheckIcon className='size-4.5' />,
        info: <InfoIcon className='size-4.5' />,
        warning: <TriangleAlertIcon className='size-4.5' />,
        error: <OctagonXIcon className='size-4.5' />,
        loading: <Loader2Icon className='size-4.5 animate-spin' />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          // toast: 'cn-toast',
          toast:
            'group/toast flex w-full max-w-80 items-start rounded-md border text-sm transition-all dark:transition-all duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted bg-background border-border/70 [a]:hover:bg-muted [a]:hover:text-foreground dark:bg-sidebar dark:border-border/60 shadow-xs gap-3.25 px-3.5 py-3',
          title: 'text-[15px] font-semibold text-foreground -mt-px',
          description: 'text-sm !text-muted-foreground pt-0.5',
          actionButton:
            'text-[11px] font-semibold px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors',
          cancelButton:
            'text-[11px] font-medium text-[#636363] hover:text-[#999] transition-colors',
          closeButton: 'text-[#636363] hover:text-[#999] transition-colors',
          success: 'border-green-500 [&_[data-icon]]:text-green-500',
          info: 'border-blue-500 [&_[data-icon]]:text-blue-500',
          error: 'border-red-500 [&_[data-icon]]:text-red-500',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
