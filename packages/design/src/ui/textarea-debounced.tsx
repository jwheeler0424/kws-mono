import type { DebouncerOptions } from '@tanstack/pacer';

import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { Debouncer } from '@tanstack/pacer';
import * as React from 'react';

import { Textarea } from './textarea';

type Mode = 'leading' | 'trailing' | 'both';

export type TextareaDebouncedHandle = {
  flush: () => void;
  cancel: () => void;
  reset: () => void;
  setOptions: (options: Partial<DebouncerOptions<(next: string) => void>>) => void;
  getDebouncedValue: () => string;
  getPendingValue: () => string;
};

export type TextareaDebouncedProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
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
  onDebouncedChange?: (value: string) => void;
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
    value: string;
    debouncedValue: string;
  }) => string | null | undefined;
  devKey?: string;
  ref?: React.Ref<HTMLTextAreaElement | TextareaDebouncedHandle>;
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

function isNonValueChangingKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (!NON_VALUE_KEYS.has(e.key)) {
    return false;
  }

  return true;
}

function normalizeTextareaValue(
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

function TextareaDebounced({
  value: controlledValue,
  defaultValue,
  mode,
  onChange,
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
  devKey = 'TextareaDebounced',
  ref,
  ...rest
}: TextareaDebouncedProps) {
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
    normalizeTextareaValue(defaultValue),
  );
  const [debouncedValue, setDebouncedValue] = React.useState<string>(() => {
    if (isControlled) return normalizeTextareaValue(controlledValue);
    return normalizeTextareaValue(defaultValue);
  });
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  const textareaValue = isControlled ? normalizeTextareaValue(controlledValue) : uncontrolledValue;

  // Map mode -> leading/trailing
  const { resolvedLeading, resolvedTrailing } = React.useMemo(() => {
    if (mode === 'leading') return { resolvedLeading: true, resolvedTrailing: false };
    if (mode === 'both') return { resolvedLeading: true, resolvedTrailing: true };
    return { resolvedLeading: leading, resolvedTrailing: trailing };
  }, [mode, leading, trailing]);

  const debouncer = React.useMemo(() => {
    const fn = (next: string) => {
      setDebouncedValue(next);
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

  // Push latest textarea value through the debouncer.
  useIsoLayoutEffect(() => {
    setIsDebouncing((prev) => (prev ? prev : true));
    onDebounceStartRef.current?.();
    debouncer.maybeExecute(textareaValue);
    return () => {
      if (cancelOnUnmount) debouncer.cancel();
    };
  }, [textareaValue, debouncer, cancelOnUnmount]);

  // Fire consumer callback when the debounced value updates.
  const emitDebouncedChange = React.useCallback((nextValue: string) => {
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
    ref as React.Ref<TextareaDebouncedHandle>,
    () => ({
      flush: () => debouncer.flush(),
      cancel: () => debouncer.cancel(),
      reset: () => debouncer.reset(),
      setOptions: (options) => debouncer.setOptions(options),
      getDebouncedValue: () => debouncedValue,
      getPendingValue: () => textareaValue,
      getStatusMessage: () => {
        if (!getStatusMessage) return undefined;
        return getStatusMessage({
          isDebouncing,
          value: textareaValue,
          debouncedValue: debouncedValue,
        });
      },
    }),
    [debouncer, debouncedValue, textareaValue, getStatusMessage, isDebouncing],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    if (!isControlled) setUncontrolledValue(next);

    onChange?.(event);
  };

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (flushOnBlur) debouncer.flush();
    rest.onBlur?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (cancelOnEscape && event.key === 'Escape') {
      debouncer.cancel();
      if (!isControlled) {
        // Revert uncontrolled textarea to the last settled debounced value.
        setUncontrolledValue(normalizeTextareaValue(debouncedValue));
      }
    } else if (extendOnKeyDown && isNonValueChangingKey(event)) {
      setIsDebouncing((prev) => (prev ? prev : true));
      onDebounceStartRef.current?.();
      debouncer.maybeExecute(textareaValue);
    }
    rest.onKeyDown?.(event);
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (extendOnKeyUp && isNonValueChangingKey(event)) {
      setIsDebouncing((prev) => (prev ? prev : true));
      onDebounceStartRef.current?.();
      debouncer.maybeExecute(textareaValue);
    }
    rest.onKeyUp?.(event);
  };

  const ariaInvalid = rest['aria-invalid'] === true || rest['aria-invalid'] === 'true' || undefined;

  const ariaDescribedBy =
    [rest['aria-describedby'], describedById].filter(Boolean).join(' ') || undefined;

  return (
    <Textarea
      ref={ref as React.Ref<HTMLTextAreaElement>}
      value={textareaValue}
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

TextareaDebounced.displayName = 'TextareaDebounced';

export { TextareaDebounced };
