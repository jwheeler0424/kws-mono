import { Text as EmailText } from '@react-email/components';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'm-0 inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[9999px] border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border-border text-foreground',
        ghost: 'text-muted-foreground',
        link: 'text-primary underline',
        subtleGray: 'bg-gray-100 text-gray-700',
        subtleBlue: 'bg-blue-100 text-blue-800',
        subtleEmerald: 'bg-emerald-100 text-emerald-800',
        subtleRed: 'bg-red-100 text-red-800',
        scopeGlobal: 'bg-purple-100 text-purple-800',
        scopeOrganization: 'bg-blue-100 text-blue-800',
        scopeTeam: 'bg-green-100 text-green-800',
      },
      presentation: {
        default: '',
        plain: 'h-auto rounded-none border-0 bg-transparent p-0 font-normal',
        header: 'h-auto rounded-none border-0 bg-transparent p-0 pt-0.5 font-normal',
        pill: 'rounded-full px-2 py-0.5 text-xs font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
      presentation: 'default',
    },
  },
);

type BadgeProps = React.ComponentProps<typeof EmailText> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant = 'default', presentation = 'default', ...props }: BadgeProps) {
  return (
    <EmailText className={cn(badgeVariants({ variant, presentation }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
