import { Link as EmailLink } from '@react-email/components';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const linkVariants = cva('font-medium underline-offset-4', {
  variants: {
    variant: {
      default: 'text-primary underline',
      subtle: 'text-muted-foreground underline',
      ghost: 'text-foreground no-underline',
      destructive: 'text-destructive underline',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type LinkProps = React.ComponentProps<typeof EmailLink> & VariantProps<typeof linkVariants>;

function Link({ className, variant = 'default', ...props }: LinkProps) {
  return <EmailLink className={cn(linkVariants({ variant }), className)} {...props} />;
}

export { Link, linkVariants };
