import { Heading as EmailHeading } from '@react-email/components';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const headingVariants = cva('m-0 font-heading text-foreground', {
  variants: {
    level: {
      h1: 'text-[32px] leading-[38px] font-semibold',
      h2: 'text-[28px] leading-8 font-semibold',
      h3: 'text-2xl leading-8 font-semibold',
      h4: 'text-xl leading-7 font-medium',
      h5: 'text-lg leading-7 font-medium',
      h6: 'text-base leading-6 font-medium',
    },
  },
  defaultVariants: {
    level: 'h2',
  },
});

type HeadingProps = React.ComponentProps<typeof EmailHeading> &
  VariantProps<typeof headingVariants>;

function Heading({ className, level = 'h2', ...props }: HeadingProps) {
  return <EmailHeading className={cn(headingVariants({ level }), className)} {...props} />;
}

export { Heading, headingVariants };
