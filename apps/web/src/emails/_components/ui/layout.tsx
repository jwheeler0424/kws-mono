import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const flexVariants = cva('m-0', {
  variants: {
    direction: {
      row: 'flex flex-row',
      column: 'flex flex-col',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
    wrap: {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    },
  },
  defaultVariants: {
    direction: 'row',
    justify: 'start',
    align: 'center',
    wrap: 'nowrap',
    gap: 2,
  },
});

const gridVariants = cva('m-0 grid', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    },
    justifyItems: {
      start: 'justify-items-start',
      center: 'justify-items-center',
      end: 'justify-items-end',
      stretch: 'justify-items-stretch',
    },
  },
  defaultVariants: {
    columns: 1,
    gap: 2,
    justifyItems: 'start',
  },
});

type FlexProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof flexVariants>;

type GridProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof gridVariants>;

function Flex({
  className,
  direction = 'row',
  justify = 'start',
  align = 'center',
  wrap = 'nowrap',
  gap = 2,
  ...props
}: FlexProps) {
  return (
    <div
      className={cn(flexVariants({ direction, justify, align, wrap, gap }), className)}
      {...props}
    />
  );
}

function Grid({ className, columns = 1, gap = 2, justifyItems = 'start', ...props }: GridProps) {
  return <div className={cn(gridVariants({ columns, gap, justifyItems }), className)} {...props} />;
}

export { Flex, flexVariants, Grid, gridVariants };
