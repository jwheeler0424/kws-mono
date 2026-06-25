import { Button as EmailButton } from '@react-email/components';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-block rounded-md border border-transparent bg-clip-padding text-center align-middle text-sm leading-[16px] font-medium whitespace-nowrap transition-all outline-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border-border bg-card text-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'bg-transparent text-foreground',
        muted: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        'ghost-destructive': 'bg-transparent text-destructive',
        link: 'bg-transparent text-foreground underline',
      },
      size: {
        default: 'px-4 py-3',
        xs: 'px-2 py-1 text-xs leading-[14px]',
        sm: 'px-3 py-2',
        lg: 'px-5 py-3.5',
        inline: 'h-auto animated-underline hover:animated-underline-hover p-0',
        icon: 'h-9 w-9 p-0 text-center',
        'icon-xs': 'h-7 w-7 p-0 text-center',
        'icon-sm': 'h-8 w-8 p-0 text-center',
        'icon-lg': 'h-10 w-10 p-0 text-center',
      },
      fullWidth: {
        true: 'block w-full text-center',
        false: 'inline-block',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  },
);

type ButtonProps = React.ComponentProps<typeof EmailButton> & VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <EmailButton
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
