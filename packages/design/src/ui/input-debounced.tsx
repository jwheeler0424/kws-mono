import type { DebouncerOptions } from '@tanstack/pacer';

import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { Debouncer } from '@tanstack/pacer';
import * as React from 'react';

import { Input } from './input';

type Mode = 'leading' | 'trailing' | 'both';

export type InputDebouncedHandle = {
  flush: () => void;
  cancel: () => void;
  reset: () => void;
  setOptions: (options: Partial<DebouncerOptions<(next: string) => void>>) => void;
  getDebouncedValue: () => string | undefined;
  getPendingValue: () => string | undefined;
};

export type InputDebouncedProps = React.InputHTMLAttributes<HTMLInputElement> & {
  value?:
    | string
    | number
    | (ReadonlyArray<string> & string)
    | (ReadonlyArray<string> & number)
    | undefined;
  defaultValue?:
    | string
    | number
    | (ReadonlyArray<string> & string)
    | (ReadonlyArray<string> & number)
    | undefined;
  delay?: number;
  waitMs?: number;
  mode?: Mode;
  leading?: boolean;
  trailing?: boolean;
  onValueChange?: (value: string | undefined) => void;
  onDebouncedChange?: (value: string | undefined) => void;
  emitOnMount?: boolean;
  flushOnBlur?: boolean;
  cancelOnEscape?: boolean;
  cancelOnUnmount?: boolean;
  extendOnKeyDown?: boolean;
  extendOnKeyUp?: boolean;
  onDebounceStart?: () => void;
  onDebounceEnd?: () => void;
  describedById?: string;
  /**
   * Generate the live status message. Return null/"" to suppress.
   */
  getStatusMessage?: (state: {
    isDebouncing: boolean;
    error?: string;
    value: string | undefined;
    debouncedValue: string | undefined;
  }) => string | null | undefined;
  devKey?: string;
  ref?: React.Ref<HTMLInputElement | InputDebouncedHandle>;
};

const NON_VALUE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Shift',
  'Control',
  'Alt',
  'Meta',
  'Escape',
  'Tab',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

function isNonValueChangingKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (!NON_VALUE_KEYS.has(e.key)) {
    return false;
  }

  return true;
}

function normalizeInputValue(
  value:
    | string
    | number
    | (ReadonlyArray<string> & string)
    | (ReadonlyArray<string> & number)
    | undefined,
): string {
  if (value === undefined || !value) return '';
  return String(value);
}

function normalizeDebouncedValue(value: string): string | undefined {
  if (!value || value === 'undefined' || value === 'null' || value.trim().length <= 0) {
    return undefined;
  }
  return value;
}

function InputDebounced({
  value: controlledValue,
  defaultValue,
  mode,
  onChange,
  onValueChange,
  leading = false,
  trailing = true,
  emitOnMount = false,
  flushOnBlur = false,
  onDebouncedChange,
  onDebounceStart,
  onDebounceEnd,
  delay,
  waitMs = 200,
  cancelOnEscape = false,
  cancelOnUnmount = true,
  extendOnKeyDown = false,
  extendOnKeyUp = false,
  describedById,
  getStatusMessage,
  devKey = 'InputDebounced',
  ref,
  ...rest
}: InputDebouncedProps) {
  const isControlled = controlledValue !== undefined;
  const onDebounceStartRef = React.useRef(onDebounceStart);
  const onDebounceEndRef = React.useRef(onDebounceEnd);
  const onDebouncedChangeRef = React.useRef(onDebouncedChange);

  useIsoLayoutEffect(() => {
    onDebounceStartRef.current = onDebounceStart;
  }, [onDebounceStart]);

  useIsoLayoutEffect(() => {
    onDebounceEndRef.current = onDebounceEnd;
  }, [onDebounceEnd]);

  useIsoLayoutEffect(() => {
    onDebouncedChangeRef.current = onDebouncedChange;
  }, [onDebouncedChange]);

  const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(
    normalizeInputValue(defaultValue),
  );
  const [debouncedValue, setDebouncedValue] = React.useState<string | undefined>(() => {
    const initialValue = isControlled
      ? normalizeInputValue(controlledValue)
      : normalizeInputValue(defaultValue);
    return normalizeDebouncedValue(initialValue);
  });
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  const inputValue = isControlled ? normalizeInputValue(controlledValue) : uncontrolledValue;

  // Map mode -> leading/trailing
  const { resolvedLeading, resolvedTrailing } = React.useMemo(() => {
    if (mode === 'leading') return { resolvedLeading: true, resolvedTrailing: false };
    if (mode === 'both') return { resolvedLeading: true, resolvedTrailing: true };
    return { resolvedLeading: leading, resolvedTrailing: trailing };
  }, [mode, leading, trailing]);

  const debouncer = React.useMemo(() => {
    const fn = (next: string) => {
      setDebouncedValue(normalizeDebouncedValue(next));
      setIsDebouncing(false);
      onDebounceEndRef.current?.();
    };

    return new Debouncer(fn, {
      key: devKey,
      wait: delay ?? waitMs,
      leading: resolvedLeading,
      trailing: resolvedTrailing,
    });
  }, [waitMs, delay, devKey, resolvedLeading, resolvedTrailing]);

  // Push latest input value through the debouncer.
  useIsoLayoutEffect(() => {
    const value = normalizeDebouncedValue(inputValue) ?? '';
    setIsDebouncing((prev) => (prev ? prev : true));
    onDebounceStartRef.current?.();
    debouncer.maybeExecute(value);
    return () => {
      if (cancelOnUnmount) debouncer.cancel();
    };
  }, [inputValue, debouncer, cancelOnUnmount]);

  // Fire consumer callback when the debounced value updates.
  const emitDebouncedChange = React.useCallback((nextValue: string | undefined) => {
    onDebouncedChangeRef.current?.(nextValue);
  }, []);

  const didMountRef = React.useRef(false);
  useIsoLayoutEffect(() => {
    if (!onDebouncedChangeRef.current) return;
    if (!emitOnMount && !didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    emitDebouncedChange(debouncedValue);
  }, [debouncedValue, emitOnMount, emitDebouncedChange]);

  // Expose controls via ref
  React.useImperativeHandle(
    ref as React.Ref<InputDebouncedHandle>,
    () => {
      const input = normalizeDebouncedValue(inputValue);
      return {
        flush: () => debouncer.flush(),
        cancel: () => debouncer.cancel(),
        reset: () => debouncer.reset(),
        setOptions: (options) => debouncer.setOptions(options),
        getDebouncedValue: () => debouncedValue,
        getPendingValue: () => input,
        getStatusMessage: () => {
          if (!getStatusMessage) return '';
          return (
            getStatusMessage({
              isDebouncing,
              value: input,
              debouncedValue: debouncedValue,
            }) ?? ''
          );
        },
      };
    },
    [debouncer, debouncedValue, inputValue, getStatusMessage, isDebouncing],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!isControlled) setUncontrolledValue(next);

    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (flushOnBlur) debouncer.flush();
    rest.onBlur?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (cancelOnEscape && event.key === 'Escape') {
      debouncer.cancel();
      if (!isControlled) {
        // Revert uncontrolled input to the last settled debounced value.
        setUncontrolledValue(normalizeInputValue(debouncedValue));
      }
    } else if (extendOnKeyDown && isNonValueChangingKey(event)) {
      const value = normalizeDebouncedValue(inputValue) ?? '';
      setIsDebouncing((prev) => (prev ? prev : true));
      onDebounceStartRef.current?.();
      debouncer.maybeExecute(value);
    }

    rest.onKeyDown?.(event);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (extendOnKeyUp && isNonValueChangingKey(event)) {
      const value = normalizeDebouncedValue(inputValue) ?? '';
      setIsDebouncing((prev) => (prev ? prev : true));
      onDebounceStartRef.current?.();
      debouncer.maybeExecute(value);
    }
    rest.onKeyUp?.(event);
  };

  const ariaInvalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true' || undefined;

  const ariaDescribedBy =
    [rest['aria-describedby'], describedById].filter(Boolean).join(' ') || undefined;

  return (
    <Input
      ref={ref as React.Ref<HTMLInputElement>}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      data-state={isDebouncing ? 'debouncing' : 'settled'}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      {...rest}
    />
  );
}

export { InputDebounced };
