'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      data-size={size}
      className={cn(
        'peer group/switch relative box-content inline-flex shrink-0 items-center rounded-full p-0.75 transition-colors duration-150 ease-in-out outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-input data-[size=default]:h-4 data-[size=default]:w-9 data-[size=sm]:h-3 data-[size=sm]:w-7 motion-reduce:transition-none dark:aria-invalid:ring-destructive/40 dark:data-unchecked:bg-muted/70',
        className,
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className='pointer-events-none block rounded-full ring-0 transition-all duration-150 ease-in-out group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-checked:bg-primary-foreground group-data-[size=default]/switch:data-checked:translate-x-[125%] group-data-[size=sm]/switch:data-checked:translate-x-[125%] data-unchecked:bg-card data-unchecked:ring-1 data-unchecked:ring-border/80 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 motion-reduce:transition-none'
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
