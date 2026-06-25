import { Text as EmailText } from '@react-email/components';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const textVariants = cva('text-base leading-[26px]', {
  variants: {
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
    },
  },
  defaultVariants: {
    tone: 'muted',
    weight: 'normal',
  },
});

type TextProps = React.ComponentProps<typeof EmailText> & VariantProps<typeof textVariants>;

function Text({ className, tone = 'muted', weight = 'normal', ...props }: TextProps) {
  return <EmailText className={cn('my-4', textVariants({ tone, weight }), className)} {...props} />;
}

export { Text, textVariants };
