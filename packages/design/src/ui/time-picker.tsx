'use client';

import type { Matcher } from 'react-day-picker';

import { cva, type VariantProps } from 'class-variance-authority';
import { format } from 'date-fns';
import { CalendarIcon, CheckIcon, Clock3Icon, XIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { PickerSurface, type PickerContainerMode } from './picker-surface';
import { ScrollArea } from './scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Separator } from './separator';

export type TimeValue = {
  hour: number;
  minute: number;
  second?: number;
};

const pickerTriggerVariants = cva('justify-between text-left font-normal data-[empty=true]:text-muted-foreground', {
  variants: {
    uiVariant: {
      default: '',
      scheduler:
        'h-10 rounded-xl border-border/70 bg-background/80 shadow-xs supports-backdrop-filter:backdrop-blur-xs',
    },
    density: {
      default: '',
      compact: 'h-8 rounded-lg text-xs',
    },
  },
  defaultVariants: {
    uiVariant: 'scheduler',
    density: 'default',
  },
});

const pickerPanelVariants = cva('p-2', {
  variants: {
    uiVariant: {
      default: '',
      scheduler: 'rounded-xl bg-background/95 p-2.5 shadow-md supports-backdrop-filter:backdrop-blur-xs',
    },
    density: {
      default: '',
      compact: 'p-2',
    },
  },
  defaultVariants: {
    uiVariant: 'scheduler',
    density: 'default',
  },
});

type TimePickerProps = {
  value?: TimeValue;
  defaultValue?: TimeValue;
  onValueChange?: (value: TimeValue | undefined) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'segmented' | 'native';
  hourCycle?: 12 | 24;
  minuteStep?: number;
  secondStep?: number;
  showSeconds?: boolean;
  placeholder?: string;
  clearable?: boolean;
  containerMode?: PickerContainerMode;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  uiVariant?: VariantProps<typeof pickerPanelVariants>['uiVariant'];
  density?: VariantProps<typeof pickerPanelVariants>['density'];
};

type DateTimePickerProps = {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Array<Matcher>;
  hourCycle?: 12 | 24;
  minuteStep?: number;
  secondStep?: number;
  showSeconds?: boolean;
  placeholder?: string;
  clearable?: boolean;
  containerMode?: PickerContainerMode;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  uiVariant?: VariantProps<typeof pickerPanelVariants>['uiVariant'];
  density?: VariantProps<typeof pickerPanelVariants>['density'];
  calendarProps?: Omit<
    React.ComponentProps<typeof Calendar>,
    'mode' | 'selected' | 'onSelect' | 'defaultMonth' | 'disabled'
  >;
};

function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: {
  prop?: T;
  defaultProp?: T;
  onChange?: (value: T) => void;
}) {
  const [uncontrolled, setUncontrolled] = React.useState<T | undefined>(defaultProp);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolled;

  const setValue = React.useCallback(
    (nextValue: React.SetStateAction<T | undefined>) => {
      const resolvedValue =
        typeof nextValue === 'function' ? (nextValue as (previous: T | undefined) => T | undefined)(value) : nextValue;

      if (!isControlled) {
        setUncontrolled(resolvedValue);
      }

      if (resolvedValue !== undefined) {
        onChange?.(resolvedValue);
      }
    },
    [isControlled, onChange, value],
  );

  return [value, setValue] as const;
}

function normalizeStep(step: number | undefined, fallback: number) {
  const safeValue = Number(step ?? fallback);
  if (!Number.isFinite(safeValue) || safeValue <= 0) {
    return fallback;
  }

  return Math.floor(safeValue);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function normalizeTimeValue(value: TimeValue, minuteStep: number, secondStep: number, showSeconds: boolean) {
  const hour = Math.min(23, Math.max(0, Math.floor(value.hour)));
  const minute = Math.min(59, Math.max(0, Math.floor(value.minute / minuteStep) * minuteStep));
  const second = showSeconds
    ? Math.min(59, Math.max(0, Math.floor((value.second ?? 0) / secondStep) * secondStep))
    : undefined;

  return { hour, minute, second };
}

function formatTimeValue(value: TimeValue, hourCycle: 12 | 24, showSeconds: boolean) {
  if (hourCycle === 24) {
    return `${pad(value.hour)}:${pad(value.minute)}${showSeconds ? `:${pad(value.second ?? 0)}` : ''}`;
  }

  const meridiem = value.hour >= 12 ? 'PM' : 'AM';
  const hour12 = value.hour % 12 || 12;
  return `${pad(hour12)}:${pad(value.minute)}${showSeconds ? `:${pad(value.second ?? 0)}` : ''} ${meridiem}`;
}

function parseNativeTime(rawValue: string, showSeconds: boolean) {
  if (!rawValue) {
    return undefined;
  }

  const [hourPart, minutePart, secondPart] = rawValue.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const second = showSeconds ? Number(secondPart ?? 0) : undefined;

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || (showSeconds && !Number.isFinite(second))) {
    return undefined;
  }

  return {
    hour,
    minute,
    second,
  } satisfies TimeValue;
}

function toNativeTime(value: TimeValue | undefined, showSeconds: boolean) {
  if (!value) {
    return '';
  }

  return `${pad(value.hour)}:${pad(value.minute)}${showSeconds ? `:${pad(value.second ?? 0)}` : ''}`;
}

function getDefaultTime(minuteStep: number, secondStep: number, showSeconds: boolean) {
  const now = new Date();
  return normalizeTimeValue(
    {
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: showSeconds ? now.getSeconds() : undefined,
    },
    minuteStep,
    secondStep,
    showSeconds,
  );
}

function isSameTime(first: TimeValue | undefined, second: TimeValue) {
  if (!first) {
    return false;
  }

  return first.hour === second.hour && first.minute === second.minute && (first.second ?? 0) === (second.second ?? 0);
}

function getTimeSlotOptions(step: number): Array<TimeValue> {
  const output: Array<TimeValue> = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += step) {
      output.push({ hour, minute, second: 0 });
    }
  }

  return output;
}

function buildDisabledMatchers({
  minDate,
  maxDate,
  disabledDates,
}: {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Array<Matcher>;
}) {
  const disabled = disabledDates ? (Array.isArray(disabledDates) ? [...disabledDates] : [disabledDates]) : [];

  if (minDate) {
    disabled.push({ before: minDate });
  }

  if (maxDate) {
    disabled.push({ after: maxDate });
  }

  return disabled.length > 0 ? disabled : undefined;
}

function isSlotDisabled(baseDate: Date | undefined, slot: TimeValue, minDate?: Date, maxDate?: Date) {
  if (!baseDate) {
    return false;
  }

  const candidate = new Date(baseDate);
  candidate.setHours(slot.hour, slot.minute, slot.second ?? 0, 0);

  if (minDate && candidate < minDate) {
    return true;
  }

  if (maxDate && candidate > maxDate) {
    return true;
  }

  return false;
}

function TimeFields({
  value,
  onValueChange,
  hourCycle,
  minuteStep,
  secondStep,
  showSeconds,
}: {
  value?: TimeValue;
  onValueChange: (value: TimeValue) => void;
  hourCycle: 12 | 24;
  minuteStep: number;
  secondStep: number;
  showSeconds: boolean;
}) {
  const normalizedValue = value ?? getDefaultTime(minuteStep, secondStep, showSeconds);
  const hourValue = normalizedValue.hour;
  const minuteValue = normalizedValue.minute;
  const secondValue = normalizedValue.second ?? 0;

  const displayHour = hourCycle === 24 ? hourValue : hourValue % 12 || 12;
  const meridiem = hourValue >= 12 ? 'PM' : 'AM';

  const minuteOptions = React.useMemo(() => {
    const output: Array<number> = [];
    for (let minute = 0; minute < 60; minute += minuteStep) {
      output.push(minute);
    }
    return output;
  }, [minuteStep]);

  const secondOptions = React.useMemo(() => {
    const output: Array<number> = [];
    for (let second = 0; second < 60; second += secondStep) {
      output.push(second);
    }
    return output;
  }, [secondStep]);

  const hourOptions = React.useMemo(() => {
    if (hourCycle === 24) {
      return Array.from({ length: 24 }, (_, index) => index);
    }

    return Array.from({ length: 12 }, (_, index) => index + 1);
  }, [hourCycle]);

  const updateTime = (next: Partial<TimeValue> & { meridiem?: 'AM' | 'PM' }) => {
    let nextHour = next.hour ?? hourValue;
    const nextMinute = next.minute ?? minuteValue;
    const nextSecond = showSeconds ? (next.second ?? secondValue) : undefined;

    if (hourCycle === 12) {
      const requestedMeridiem = next.meridiem ?? meridiem;
      const hour12 = nextHour % 12 || 12;
      nextHour = requestedMeridiem === 'PM' ? (hour12 === 12 ? 12 : hour12 + 12) : hour12 === 12 ? 0 : hour12;
    }

    onValueChange(
      normalizeTimeValue(
        {
          hour: nextHour,
          minute: nextMinute,
          second: nextSecond,
        },
        minuteStep,
        secondStep,
        showSeconds,
      ),
    );
  };

  return (
    <div className='grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2'>
      <div className='space-y-1'>
        <p className='px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>Hour</p>
        <Select value={String(displayHour)} onValueChange={(rawValue) => updateTime({ hour: Number(rawValue) })}>
          <SelectTrigger className='h-9 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='start'>
            {hourOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {pad(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-1'>
        <p className='px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>Minute</p>
        <Select value={String(minuteValue)} onValueChange={(rawValue) => updateTime({ minute: Number(rawValue) })}>
          <SelectTrigger className='h-9 w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='start'>
            {minuteOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {pad(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSeconds ? (
        <div className='space-y-1'>
          <p className='px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>Second</p>
          <Select value={String(secondValue)} onValueChange={(rawValue) => updateTime({ second: Number(rawValue) })}>
            <SelectTrigger className='h-9 w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align='start'>
              {secondOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {pad(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {hourCycle === 12 ? (
        <div className='space-y-1'>
          <p className='px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase'>Period</p>
          <Select value={meridiem} onValueChange={(rawValue) => updateTime({ meridiem: rawValue as 'AM' | 'PM' })}>
            <SelectTrigger className='h-9 w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align='start'>
              <SelectItem value='AM'>AM</SelectItem>
              <SelectItem value='PM'>PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

function TimePicker({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  mode = 'segmented',
  hourCycle = 24,
  minuteStep = 5,
  secondStep = 5,
  showSeconds = false,
  placeholder = 'Select time',
  clearable = true,
  containerMode = 'auto',
  triggerVariant = 'outline',
  triggerSize = 'default',
  className,
  contentClassName,
  disabled,
  readOnly,
  required,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  uiVariant = 'scheduler',
  density = 'default',
}: TimePickerProps) {
  const safeMinuteStep = normalizeStep(minuteStep, 5);
  const safeSecondStep = normalizeStep(secondStep, 5);

  const [selectedTime, setSelectedTime] = useControllableState<TimeValue>({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const displayValue = selectedTime ? formatTimeValue(selectedTime, hourCycle, showSeconds) : placeholder;
  const actionButtonSize = density === 'compact' ? 'sm' : 'default';

  if (mode === 'native') {
    return (
      <Input
        type='time'
        aria-required={required}
        className={className}
        disabled={disabled}
        readOnly={readOnly}
        step={showSeconds ? safeSecondStep : safeMinuteStep * 60}
        value={toNativeTime(selectedTime, showSeconds)}
        onChange={(event) => {
          const parsed = parseNativeTime(event.target.value, showSeconds);
          if (!parsed) {
            setSelectedTime(undefined);
            return;
          }

          setSelectedTime(normalizeTimeValue(parsed, safeMinuteStep, safeSecondStep, showSeconds));
        }}
      />
    );
  }

  const slotStep = Math.max(15, safeMinuteStep);
  const timeSlots = React.useMemo(() => getTimeSlotOptions(slotStep), [slotStep]);

  return (
    <PickerSurface
      open={Boolean(isOpen)}
      onOpenChange={setIsOpen}
      mode={containerMode}
      disabled={disabled || readOnly}
      trigger={
        <Button
          variant={triggerVariant}
          size={triggerSize}
          data-empty={!selectedTime}
          aria-required={required}
          className={cn(pickerTriggerVariants({ uiVariant, density }), 'w-56', className)}>
          <span className='truncate'>{displayValue}</span>
          <Clock3Icon data-icon='inline-end' className='text-muted-foreground' />
        </Button>
      }
      popoverContentProps={{
        align: 'start',
        className: cn('w-[23rem] p-0', contentClassName),
      }}
      drawerContentProps={{ className: cn('h-auto p-0', contentClassName) }}>
      <div className={cn('flex flex-col gap-2', pickerPanelVariants({ uiVariant, density }))}>
        {showSeconds ? (
          <div className='rounded-lg bg-background/35 p-2'>
            <TimeFields
              value={selectedTime}
              onValueChange={setSelectedTime}
              hourCycle={hourCycle}
              minuteStep={safeMinuteStep}
              secondStep={safeSecondStep}
              showSeconds
            />
          </div>
        ) : (
          <>
            <div className='rounded-lg bg-muted/25 px-2.5 py-2 text-sm'>
              <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>Selected time</p>
              <p className='font-medium'>{displayValue}</p>
            </div>
            <div className='rounded-lg bg-background/35 p-1.5'>
              <p className='px-1 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Available times
              </p>
              <ScrollArea className='h-52'>
                <div className='grid grid-cols-2 gap-1.5 pr-2'>
                  {timeSlots.map((slot) => (
                    <Button
                      key={`${slot.hour}-${slot.minute}`}
                      variant={isSameTime(selectedTime, slot) ? 'default' : 'outline'}
                      size='xs'
                      className='justify-center'
                      onClick={() =>
                        setSelectedTime(normalizeTimeValue(slot, safeMinuteStep, safeSecondStep, showSeconds))
                      }>
                      {formatTimeValue(slot, hourCycle, false)}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <div className='flex items-center justify-between gap-1.5 px-1 pt-2'>
          <div className='flex gap-1.5'>
            <Button
              variant='muted'
              size='sm'
              onClick={() => {
                setSelectedTime(getDefaultTime(safeMinuteStep, safeSecondStep, showSeconds));
                setIsOpen(false);
              }}>
              Now
            </Button>
            {clearable ? (
              <Button
                variant='ghost-destructive'
                size='sm'
                onClick={() => {
                  setSelectedTime(undefined);
                  setIsOpen(false);
                }}>
                <XIcon data-icon='inline-start' />
                Clear
              </Button>
            ) : null}
          </div>
          <div className='flex gap-1.5'>
            <Button variant='outline' size={actionButtonSize} className='min-w-22' onClick={() => setIsOpen(false)}>
              {cancelLabel}
            </Button>
            <Button variant='default' size={actionButtonSize} className='min-w-22' onClick={() => setIsOpen(false)}>
              <CheckIcon data-icon='inline-start' />
              {applyLabel}
            </Button>
          </div>
        </div>
      </div>
    </PickerSurface>
  );
}

function DateTimePicker({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen = false,
  onOpenChange,
  minDate,
  maxDate,
  disabledDates,
  hourCycle = 24,
  minuteStep = 5,
  secondStep = 5,
  showSeconds = false,
  placeholder = 'Pick date and time',
  clearable = true,
  containerMode = 'auto',
  triggerVariant = 'outline',
  triggerSize = 'default',
  className,
  contentClassName,
  disabled,
  readOnly,
  required,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  uiVariant = 'scheduler',
  density = 'default',
  calendarProps,
}: DateTimePickerProps) {
  const safeMinuteStep = normalizeStep(minuteStep, 5);
  const safeSecondStep = normalizeStep(secondStep, 5);

  const [selectedDateTime, setSelectedDateTime] = useControllableState<Date>({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const selectedTime = selectedDateTime
    ? {
        hour: selectedDateTime.getHours(),
        minute: selectedDateTime.getMinutes(),
        second: selectedDateTime.getSeconds(),
      }
    : undefined;

  const computedDisabledDates = buildDisabledMatchers({ minDate, maxDate, disabledDates });

  const displayValue = selectedDateTime
    ? `${format(selectedDateTime, 'PPP')} ${formatTimeValue(selectedTime!, hourCycle, showSeconds)}`
    : placeholder;
  const actionButtonSize = density === 'compact' ? 'sm' : 'default';

  const slotStep = Math.max(15, safeMinuteStep);
  const timeSlots = React.useMemo(() => getTimeSlotOptions(slotStep), [slotStep]);

  return (
    <PickerSurface
      open={Boolean(isOpen)}
      onOpenChange={setIsOpen}
      mode={containerMode}
      disabled={disabled || readOnly}
      trigger={
        <Button
          variant={triggerVariant}
          size={triggerSize}
          data-empty={!selectedDateTime}
          aria-required={required}
          className={cn(pickerTriggerVariants({ uiVariant, density }), 'w-80', className)}>
          <span className='truncate'>{displayValue}</span>
          <CalendarIcon data-icon='inline-end' className='text-muted-foreground' />
        </Button>
      }
      popoverContentProps={{
        align: 'start',
        className: cn('w-auto p-0 md:min-w-[40rem]', contentClassName),
      }}
      drawerContentProps={{ className: cn('h-auto p-0', contentClassName) }}>
      <div className={cn('flex flex-col gap-2', pickerPanelVariants({ uiVariant, density }))}>
        <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_11rem]'>
          <div className='rounded-lg bg-background/35 p-1.5'>
            <Calendar
              mode='single'
              selected={selectedDateTime}
              onSelect={(nextDate) => {
                if (!nextDate) {
                  setSelectedDateTime(undefined);
                  return;
                }

                const baselineTime = selectedTime ?? getDefaultTime(safeMinuteStep, safeSecondStep, showSeconds);
                const nextDateTime = new Date(nextDate);
                nextDateTime.setHours(baselineTime.hour, baselineTime.minute, baselineTime.second ?? 0, 0);
                setSelectedDateTime(nextDateTime);
              }}
              defaultMonth={selectedDateTime}
              disabled={computedDisabledDates}
              {...calendarProps}
            />
          </div>

          <div className='rounded-lg bg-background/35 p-1.5'>
            <p className='px-1 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              Available times
            </p>
            {showSeconds ? (
              <TimeFields
                value={selectedTime}
                onValueChange={(nextTime) => {
                  const nextDate = selectedDateTime ? new Date(selectedDateTime) : new Date();
                  nextDate.setHours(nextTime.hour, nextTime.minute, nextTime.second ?? 0, 0);
                  setSelectedDateTime(nextDate);
                }}
                hourCycle={hourCycle}
                minuteStep={safeMinuteStep}
                secondStep={safeSecondStep}
                showSeconds
              />
            ) : (
              <ScrollArea className='h-71'>
                <div className='grid gap-1 pr-2'>
                  {timeSlots.map((slot) => {
                    const disabledSlot = isSlotDisabled(selectedDateTime, slot, minDate, maxDate);

                    return (
                      <Button
                        key={`${slot.hour}-${slot.minute}`}
                        variant={isSameTime(selectedTime, slot) ? 'default' : 'outline'}
                        size='xs'
                        className='justify-center'
                        disabled={disabledSlot}
                        onClick={() => {
                          const nextDate = selectedDateTime ? new Date(selectedDateTime) : new Date();
                          nextDate.setHours(slot.hour, slot.minute, slot.second ?? 0, 0);
                          setSelectedDateTime(nextDate);
                        }}>
                        {formatTimeValue(slot, hourCycle, false)}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <Separator className='opacity-40' />

        <div className='flex items-center justify-between gap-1.5'>
          <div>
            {clearable ? (
              <Button
                variant='ghost-destructive'
                size='sm'
                onClick={() => {
                  setSelectedDateTime(undefined);
                  setIsOpen(false);
                }}>
                <XIcon data-icon='inline-start' />
                Clear
              </Button>
            ) : null}
          </div>
          <div className='flex gap-1.5'>
            <Button variant='outline' size={actionButtonSize} className='min-w-22' onClick={() => setIsOpen(false)}>
              {cancelLabel}
            </Button>
            <Button variant='default' size={actionButtonSize} className='min-w-22' onClick={() => setIsOpen(false)}>
              <CheckIcon data-icon='inline-start' />
              {applyLabel}
            </Button>
          </div>
        </div>
      </div>
    </PickerSurface>
  );
}

export { DateTimePicker, TimePicker, type DateTimePickerProps, type TimePickerProps };

