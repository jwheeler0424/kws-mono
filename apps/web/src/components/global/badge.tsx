import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gray-900 text-white transition-colors duration-200 ease-linear hover:bg-gray-900/80',
        primary:
          'border-transparent bg-primary text-white transition-colors duration-200 ease-linear hover:bg-primary/80',
        admin:
          'border-transparent bg-admin text-white transition-colors duration-200 ease-linear hover:bg-admin/80',
        success:
          'border-transparent bg-green-600 text-white transition-colors duration-200 ease-linear hover:bg-green-600/80',
        destructive:
          'border-transparent bg-red-600 text-white transition-colors duration-200 ease-linear hover:bg-red-600/80',
        warning:
          'border-transparent bg-yellow-600 text-white transition-colors duration-200 ease-linear hover:bg-yellow-600/80',
        info: 'border-transparent bg-blue text-white transition-colors duration-200 ease-linear hover:bg-blue/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
