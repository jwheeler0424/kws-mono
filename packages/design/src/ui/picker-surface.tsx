'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { useIsMobile } from '../hooks/use-mobile';
import { Drawer, DrawerContent } from './drawer';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type PickerContainerMode = 'auto' | 'popover' | 'drawer';

type PickerSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: PickerContainerMode;
  trigger: React.ReactElement<Record<string, unknown>>;
  disabled?: boolean;
  popoverContentProps?: Omit<React.ComponentProps<typeof PopoverContent>, 'children'>;
  drawerContentProps?: Omit<React.ComponentProps<typeof DrawerContent>, 'children'>;
  children: React.ReactNode;
};

function PickerSurface({
  open,
  onOpenChange,
  mode = 'auto',
  trigger,
  disabled = false,
  popoverContentProps,
  drawerContentProps,
  children,
}: PickerSurfaceProps) {
  const isMobile = useIsMobile();
  const useDrawer = mode === 'drawer' || (mode === 'auto' && isMobile);

  if (useDrawer) {
    const triggerProps = trigger.props as {
      disabled?: boolean;
      onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    };

    const drawerTrigger = React.isValidElement(trigger)
      ? React.cloneElement(trigger, {
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          disabled: disabled || triggerProps.disabled,
          onClick: (event: React.MouseEvent<HTMLElement>) => {
            triggerProps.onClick?.(event);
            if (!event.defaultPrevented && !disabled) {
              onOpenChange(true);
            }
          },
        })
      : trigger;

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {drawerTrigger}
        <DrawerContent
          className={cn('max-h-[90vh] overflow-hidden p-0', drawerContentProps?.className)}
          {...drawerContentProps}>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger disabled={disabled} render={trigger} />
      <PopoverContent
        initialFocus={false}
        className={cn('w-auto p-0', popoverContentProps?.className)}
        {...popoverContentProps}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export { PickerSurface };
