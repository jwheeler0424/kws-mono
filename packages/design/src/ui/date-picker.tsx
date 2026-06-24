'use client';
import type { DateRange, Matcher } from 'react-day-picker';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

import { Button } from './button';
import { Calendar } from './calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type DatePickerBaseProps = {
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  valueAsString?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  clearable?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Matcher | Matcher[];
  numberOfMonths?: number;
};

type DatePickerSingleProps = DatePickerBaseProps & {
  mode?: 'single';
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
};

type DatePickerRangeProps = DatePickerBaseProps & {
  mode: 'range';
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
};

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

type DatePickerValue = Date | DateRange | undefined;

function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: {
  prop?: T;
  defaultProp?: T;
  onChange?: (value: T | undefined) => void;
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

      onChange?.(resolvedValue);
    },
    [isControlled, onChange, value],
  );

  return [value, setValue] as const;
}

function getAnchorDate(value: DatePickerValue, mode: 'single' | 'range') {
  if (!value) return undefined;
  if (mode === 'single') {
    return value instanceof Date ? value : undefined;
  }

  const range = value as DateRange;
  return range.from ?? range.to;
}

function toDateString(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function serializeValue(value: DatePickerValue, mode: 'single' | 'range') {
  if (!value) return '';
  if (mode === 'single') {
    if (!(value instanceof Date)) return '';
    return toDateString(value);
  }

  const range = value as DateRange;
  const from = range.from ? toDateString(range.from) : '';
  const to = range.to ? toDateString(range.to) : '';
  if (!from && !to) return '';
  return `${from}..${to}`;
}

function hasValue(value: DatePickerValue, mode: 'single' | 'range') {
  if (!value) return false;
  if (mode === 'single') {
    return value instanceof Date;
  }

  const range = value as DateRange;
  return Boolean(range.from || range.to);
}

function getDisplayText(value: DatePickerValue, mode: 'single' | 'range', placeholder: string, valueAsString?: string) {
  if (valueAsString !== undefined) {
    return valueAsString || placeholder;
  }

  if (!value) return placeholder;

  if (mode === 'single') {
    if (!(value instanceof Date)) return placeholder;
    return format(value, 'PPP');
  }

  const range = value as DateRange;
  if (!range.from && !range.to) return placeholder;
  if (range.from && range.to) {
    return `${format(range.from, 'LLL d, y')} - ${format(range.to, 'LLL d, y')}`;
  }
  if (range.from) {
    return `${format(range.from, 'LLL d, y')} - ...`;
  }

  return `... - ${format(range.to as Date, 'LLL d, y')}`;
}

function getHeaderContent(value: DatePickerValue, mode: 'single' | 'range', fallbackDate?: Date) {
  if (!value) {
    if (!fallbackDate) return null;
    return {
      description: format(fallbackDate, 'yyyy'),
      title: format(fallbackDate, 'eee, MMMM d'),
    };
  }

  if (mode === 'single') {
    if (!(value instanceof Date)) return null;
    return {
      description: format(value, 'yyyy'),
      title: format(value, 'eee, MMMM d'),
    };
  }

  const range = value as DateRange;
  if (!range.from && !range.to) return null;
  if (range.from && range.to) {
    return {
      description: `${format(range.from, 'yyyy')} - ${format(range.to, 'yyyy')}`,
      title: `${format(range.from, 'MMM d')} to ${format(range.to, 'MMM d')}`,
    };
  }

  const active = range.from ?? range.to;
  if (!active) return null;
  return {
    description: format(active, 'yyyy'),
    title: format(active, 'eee, MMMM d'),
  };
}

export function DatePicker({
  mode = 'single',
  value,
  defaultValue,
  onValueChange,
  placeholder,
  className,
  contentClassName,
  valueAsString,
  name,
  id,
  disabled,
  readOnly,
  required,
  onBlur,
  onFocus,
  onChange,
  open,
  defaultOpen,
  onOpenChange,
  clearable = false,
  applyLabel = 'Apply',
  cancelLabel = 'Cancel',
  minDate,
  maxDate,
  disabledDates,
  numberOfMonths,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useControllableState<boolean>({
    prop: open,
    defaultProp: defaultOpen ?? false,
    onChange: (nextOpen) => onOpenChange?.(nextOpen ?? false),
  });
  const [committedValue, setCommittedValue] = useControllableState<DatePickerValue>({
    prop: value,
    defaultProp: defaultValue,
    onChange: onValueChange as (value: DatePickerValue) => void,
  });
  const [draftValue, setDraftValue] = React.useState<DatePickerValue>(committedValue);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    () => getAnchorDate(committedValue, mode) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) return;
    setDraftValue(committedValue);
    const anchor = getAnchorDate(committedValue, mode);
    if (anchor) {
      setCurrentMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    }
  }, [committedValue, isOpen, mode]);

  const effectivePlaceholder = placeholder ?? (mode === 'range' ? 'Pick a date range' : 'Pick a date');
  const headerFallbackDate = getAnchorDate(draftValue, mode) ?? getAnchorDate(committedValue, mode) ?? new Date();
  const headerContent = getHeaderContent(draftValue, mode, headerFallbackDate);

  const emitChange = React.useCallback(
    (nextValue: DatePickerValue) => {
      if (!onChange) return;
      const input = hiddenInputRef.current;
      if (!input) return;
      input.value = serializeValue(nextValue, mode);
      onChange({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
    },
    [mode, onChange],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return;
    if (nextOpen) {
      setDraftValue(committedValue);
      const anchor = getAnchorDate(committedValue, mode);
      if (anchor) {
        setCurrentMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
      }
    } else {
      setDraftValue(committedValue);
    }

    setIsOpen(nextOpen);
  };

  const handleCancel = () => {
    setDraftValue(committedValue);
    setIsOpen(false);
  };

  const handleApply = () => {
    setCommittedValue(draftValue);
    emitChange(draftValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDraftValue(undefined);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {name || onChange ? (
        <input
          ref={hiddenInputRef}
          type='hidden'
          id={id ? `${id}-value` : undefined}
          name={name}
          required={required}
          value={serializeValue(committedValue, mode)}
          readOnly
        />
      ) : null}
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            id={id}
            className={cn(
              'justify-between font-normal',
              !hasValue(committedValue, mode) && 'text-muted-foreground',
              className,
            )}
            disabled={disabled}
            onBlur={onBlur}
            onFocus={onFocus}>
            <span className='pt-0.5'>{getDisplayText(committedValue, mode, effectivePlaceholder, valueAsString)}</span>
            <CalendarIcon />
          </Button>
        }
      />
      <PopoverContent className={cn('w-auto p-0 ring-0', contentClassName)} align='start'>
        <Card className='mx-auto w-fit gap-3.5 ring-border/50'>
          {headerContent ? (
            <CardHeader>
              <CardDescription>{headerContent.description}</CardDescription>
              <CardTitle className='text-2xl font-normal'>{headerContent.title}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent>
            {mode === 'range' ? (
              <Calendar
                mode='range'
                selected={(draftValue as DateRange | undefined) ?? undefined}
                onSelect={(nextValue) => {
                  if (readOnly) return;
                  setDraftValue(nextValue);
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                showOutsideDays
                fixedWeeks
                numberOfMonths={numberOfMonths}
                disabled={disabledDates}
                startMonth={minDate}
                endMonth={maxDate}
                className='p-0 [--cell-size:--spacing(9.5)] [&_.rdp-week]:mt-1.5 [&_.rdp-week]:gap-1.5'
              />
            ) : (
              <Calendar
                mode='single'
                selected={(draftValue as Date | undefined) ?? undefined}
                onSelect={(nextValue) => {
                  if (readOnly) return;
                  setDraftValue(nextValue);
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                showOutsideDays
                fixedWeeks
                numberOfMonths={numberOfMonths}
                disabled={disabledDates}
                startMonth={minDate}
                endMonth={maxDate}
                className='p-0 [--cell-size:--spacing(9.5)] [&_.rdp-week]:mt-1.5 [&_.rdp-week]:gap-1.5'
              />
            )}
          </CardContent>
          <CardFooter className='flex flex-wrap gap-2'>
            <Button variant='outline' className='flex-1' onClick={handleCancel}>
              {cancelLabel}
            </Button>
            {clearable ? (
              <Button
                variant='outline'
                className='flex-1'
                onClick={handleClear}
                disabled={required || !hasValue(draftValue, mode)}>
                Clear
              </Button>
            ) : null}
            <Button variant='default' className='flex-1' onClick={handleApply} disabled={readOnly}>
              {applyLabel}
            </Button>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
