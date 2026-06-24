import { useDirection } from '@base-ui/react/direction-provider';
import { mergeProps } from '@base-ui/react/merge-props';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import type { InputDebouncedProps } from './input-debounced';
import type { TextareaDebouncedProps } from './textarea-debounced';

import { Button } from './button';
import { Input } from './input';
import { InputDebounced } from './input-debounced';
import {
  InputGroupInput,
  InputGroupInputDebounced,
  InputGroupTextarea,
  InputGroupTextareaDebounced,
} from './input-group';
import { InputHidden } from './input-hidden';
import { Label } from './label';
import { Textarea } from './textarea';
import { TextareaDebounced } from './textarea-debounced';

type InputValue = string;
type InputElement = HTMLInputElement | HTMLTextAreaElement;

const DATA_INPUT_TAGS_ITEM_ATTR = 'data-input-tags-collection-item';

interface InputTagsContextValue {
  value: Array<InputValue>;
  onValueChange: (value: Array<InputValue>) => void;
  onItemAdd: (textValue: string, options?: { viaPaste?: boolean }) => boolean;
  onItemRemove: (index: number) => void;
  onItemUpdate: (index: number, newTextValue: string) => void;
  onInputKeydown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  highlightedIndex: number | null;
  setHighlightedIndex: (index: number | null) => void;
  editingIndex: number | null;
  setEditingIndex: (index: number | null) => void;
  displayValue: (value: InputValue) => string;
  onItemLeave: () => void;
  inputRef: React.RefObject<InputElement | null>;
  addOnPaste: boolean;
  addOnTab: boolean;
  delimiter: string;
  disabled: boolean;
  editable: boolean;
  isInvalidInput: boolean;
  loop: boolean;
  readOnly: boolean;
  blurBehavior: 'add' | 'clear' | undefined;
  max: number;
  dir: 'ltr' | 'rtl';
  id: string;
  inputId: string;
  labelId: string;
  valuesId: string;
}

const InputTagsContext = React.createContext<InputTagsContextValue | null>(null);

function useInputTagsContext(consumerName: string) {
  const context = React.useContext(InputTagsContext);
  if (!context) {
    throw new Error(`${consumerName} must be used within InputTags`);
  }
  return context;
}

interface InputTagsItemContextValue {
  id: string;
  value: InputValue;
  index: number;
  isHighlighted: boolean;
  isEditing: boolean;
  disabled?: boolean;
  textId: string;
  displayValue: string;
}

const InputTagsItemContext = React.createContext<InputTagsItemContextValue | null>(null);

function useInputTagsItemContext(consumerName: string) {
  const context = React.useContext(InputTagsItemContext);
  if (!context) {
    throw new Error(`${consumerName} must be used within InputTagsItem`);
  }
  return context;
}

function composeEventHandlers<E>(
  originalEventHandler?: (event: E) => void,
  ourEventHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {},
) {
  return function handleEvent(event: E) {
    originalEventHandler?.(event);

    if (!checkForDefaultPrevented || !(event as unknown as Event).defaultPrevented) {
      return ourEventHandler?.(event);
    }
  };
}

function compareNodePosition(a: Node, b: Node) {
  const position = a.compareDocumentPosition(b);

  if (
    position & Node.DOCUMENT_POSITION_FOLLOWING ||
    position & Node.DOCUMENT_POSITION_CONTAINED_BY
  ) {
    return -1;
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINS) {
    return 1;
  }

  return 0;
}

function useItemCollection<TElement extends HTMLElement>(
  ref: React.RefObject<TElement | null>,
  attr = DATA_INPUT_TAGS_ITEM_ATTR,
) {
  const getItems = React.useCallback(() => {
    const collectionNode = ref.current;
    if (!collectionNode) return [];

    const items = Array.from(collectionNode.querySelectorAll(`[${attr}]`));
    if (items.length === 0) return [];

    return items.sort(compareNodePosition);
  }, [ref, attr]);

  const getEnabledItems = React.useCallback(() => {
    const items = getItems();
    return items.filter((item) => item.getAttribute('aria-disabled') !== 'true');
  }, [getItems]);

  return { getEnabledItems };
}

interface UseControllableStateParams<T> {
  prop?: T;
  defaultProp?: T;
  onChange?: (state: T) => void;
}

function useControllableState<T>({ prop, defaultProp, onChange }: UseControllableStateParams<T>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<T | undefined>(defaultProp);
  const prevValueRef = React.useRef(uncontrolledValue);

  useIsoLayoutEffect(() => {
    if (prop !== undefined) return;
    if (prevValueRef.current === uncontrolledValue) return;
    prevValueRef.current = uncontrolledValue;
    if (uncontrolledValue !== undefined) {
      onChange?.(uncontrolledValue);
    }
  }, [onChange, prop, uncontrolledValue]);

  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledValue;

  const setValue = React.useCallback(
    (nextValue: React.SetStateAction<T | undefined>) => {
      if (isControlled) {
        const resolvedValue =
          typeof nextValue === 'function'
            ? (nextValue as (value: T | undefined) => T | undefined)(prop)
            : nextValue;

        if (resolvedValue !== undefined && resolvedValue !== prop) {
          onChange?.(resolvedValue);
        }
        return;
      }

      setUncontrolledValue(nextValue);
    },
    [isControlled, onChange, prop],
  );

  return [value, setValue] as const;
}

const inputTagsControlClassName =
  'flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';

const inputTagsTextareaControlClassName =
  'flex-1 bg-transparent py-2 outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none';

type InputTagsProps = Omit<
  React.ComponentPropsWithoutRef<'fieldset'>,
  'value' | 'defaultValue' | 'onInvalid' | 'children'
> & {
  value?: Array<InputValue>;
  defaultValue?: Array<InputValue>;
  onValueChange?: (value: Array<InputValue>) => void;
  onValidate?: (value: InputValue) => boolean;
  onInvalid?: (value: InputValue) => void;
  displayValue?: (value: InputValue) => string;
  addOnPaste?: boolean;
  addOnTab?: boolean;
  disabled?: boolean;
  editable?: boolean;
  loop?: boolean;
  blurBehavior?: 'add' | 'clear';
  delimiter?: string;
  max?: number;
  required?: boolean;
  readOnly?: boolean;
  dir?: 'ltr' | 'rtl';
  name?: string;
  id?: string;
  children?: React.ReactNode | ((context: { value: Array<InputValue> }) => React.ReactNode);
};

function InputTags({ className, ...props }: InputTagsProps) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    onValidate,
    onInvalid,
    displayValue = (value: InputValue) => value,
    addOnPaste = false,
    addOnTab = false,
    disabled = false,
    editable = false,
    loop = false,
    blurBehavior,
    delimiter = ',',
    max = Number.POSITIVE_INFINITY,
    readOnly = false,
    required = false,
    name,
    children,
    dir: dirProp,
    id: idProp,
    onClick,
    onKeyDown: onKeyDownProp,
    onMouseDown,
    onBlur,
    ...rootProps
  } = props;

  const [value = [], setValue] = useControllableState<Array<InputValue>>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [isInvalidInput, setIsInvalidInput] = React.useState(false);
  const collectionRef = React.useRef<HTMLFieldSetElement>(null);
  const inputRef = React.useRef<InputElement>(null);
  const reactId = React.useId();
  const reactInputId = React.useId();
  const reactLabelId = React.useId();
  const id = idProp ?? `dice-${reactId}`;
  const inputId = `dice-${reactInputId}`;
  const labelId = `dice-${reactLabelId}`;
  const valuesId = `${id}-values`;
  const resolvedDirection = useDirection() || dirProp || 'ltr';
  const { getEnabledItems } = useItemCollection(collectionRef);
  const isFormControl = collectionRef.current
    ? Boolean(collectionRef.current.closest('form'))
    : true;

  const onItemAdd = React.useCallback(
    (textValue: string, options?: { viaPaste?: boolean }) => {
      if (disabled || readOnly) return false;

      if (addOnPaste && options?.viaPaste) {
        const splitValues = textValue
          .split(delimiter)
          .map((v) => v.trim())
          .filter(Boolean);

        if (value.length + splitValues.length > max && max > 0) {
          onInvalid?.(textValue);
          return false;
        }

        const dedupedValues = [...new Set(splitValues.filter((v) => !value.includes(v)))];
        const validValues = dedupedValues.filter((v) => !onValidate || onValidate(v));

        if (validValues.length === 0) {
          for (const invalidValue of splitValues) {
            if (value.includes(invalidValue)) {
              onInvalid?.(invalidValue);
            }
          }
          return false;
        }

        setValue([...value, ...validValues]);
        return true;
      }

      if (value.length >= max && max > 0) {
        onInvalid?.(textValue);
        return false;
      }

      const trimmedValue = textValue.trim();

      if (!trimmedValue) return false;

      if (onValidate && !onValidate(trimmedValue)) {
        setIsInvalidInput(true);
        onInvalid?.(trimmedValue);
        return false;
      }

      if (value.includes(trimmedValue)) {
        setIsInvalidInput(true);
        onInvalid?.(trimmedValue);
        return true;
      }

      setValue([...value, trimmedValue]);
      setHighlightedIndex(null);
      setEditingIndex(null);
      setIsInvalidInput(false);
      return true;
    },
    [addOnPaste, delimiter, disabled, max, onInvalid, onValidate, readOnly, setValue, value],
  );

  const onItemUpdate = React.useCallback(
    (index: number, newTextValue: string) => {
      if (disabled || readOnly) return;
      if (index === -1) return;

      const trimmedValue = newTextValue.trim();
      if (!trimmedValue) return;

      const exists = value.some((existingValue, valueIndex) => {
        if (valueIndex === index) return false;
        return existingValue === trimmedValue;
      });

      if (exists || (onValidate && !onValidate(trimmedValue))) {
        setIsInvalidInput(true);
        onInvalid?.(trimmedValue);
        return;
      }

      const newValues = [...value];
      newValues[index] = displayValue(trimmedValue);
      setValue(newValues);
      setHighlightedIndex(index);
      setEditingIndex(null);
      setIsInvalidInput(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [disabled, displayValue, onInvalid, onValidate, readOnly, setValue, value],
  );

  const onItemRemove = React.useCallback(
    (index: number) => {
      if (disabled || readOnly) return;
      if (index === -1) return;

      const newValues = [...value];
      newValues.splice(index, 1);
      setValue(newValues);
      setHighlightedIndex(null);
      setEditingIndex(null);
      inputRef.current?.focus();
    },
    [disabled, readOnly, setValue, value],
  );

  const onItemLeave = React.useCallback(() => {
    setHighlightedIndex(null);
    setEditingIndex(null);
    inputRef.current?.focus();
  }, []);

  const onInputKeydown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      const isArrowLeft =
        (event.key === 'ArrowLeft' && resolvedDirection === 'ltr') ||
        (event.key === 'ArrowRight' && resolvedDirection === 'rtl');
      const isArrowRight =
        (event.key === 'ArrowRight' && resolvedDirection === 'ltr') ||
        (event.key === 'ArrowLeft' && resolvedDirection === 'rtl');

      if (target.value && target.selectionStart !== 0) {
        setHighlightedIndex(null);
        setEditingIndex(null);
        return;
      }

      function findNextEnabledIndex(
        currentIndex: number | null,
        direction: 'next' | 'prev',
      ): number | null {
        const enabledItems = getEnabledItems();
        const enabledIndices = enabledItems
          .map((item) => {
            const index = Number(item.getAttribute('data-input-tags-index'));
            return Number.isFinite(index) ? index : null;
          })
          .filter((index): index is number => index !== null);

        if (enabledIndices.length === 0) return null;

        if (currentIndex === null) {
          return direction === 'prev'
            ? (enabledIndices[enabledIndices.length - 1] ?? null)
            : (enabledIndices[0] ?? null);
        }

        const currentEnabledIndex = enabledIndices.indexOf(currentIndex);
        if (direction === 'next') {
          return currentEnabledIndex >= enabledIndices.length - 1
            ? loop
              ? (enabledIndices[0] ?? null)
              : null
            : (enabledIndices[currentEnabledIndex + 1] ?? null);
        }

        return currentEnabledIndex <= 0
          ? loop
            ? (enabledIndices[enabledIndices.length - 1] ?? null)
            : null
          : (enabledIndices[currentEnabledIndex - 1] ?? null);
      }

      switch (event.key) {
        case 'Delete':
        case 'Backspace': {
          if (target.selectionStart !== 0 || target.selectionEnd !== 0) break;

          if (highlightedIndex !== null) {
            const nextIndex = findNextEnabledIndex(highlightedIndex, 'next');
            const prevIndex = findNextEnabledIndex(highlightedIndex, 'prev');
            const newIndex =
              event.key === 'Delete' ? (nextIndex ?? prevIndex) : (prevIndex ?? nextIndex);

            onItemRemove(highlightedIndex);
            setHighlightedIndex(newIndex);
            event.preventDefault();
          } else if (event.key === 'Backspace' && value.length > 0) {
            setHighlightedIndex(findNextEnabledIndex(null, 'prev'));
            event.preventDefault();
          }
          break;
        }

        case 'Enter': {
          if (highlightedIndex !== null && editable && !disabled) {
            setEditingIndex(highlightedIndex);
            event.preventDefault();
          }
          break;
        }

        case 'ArrowLeft':
        case 'ArrowRight': {
          if (
            target.selectionStart === 0 &&
            isArrowLeft &&
            highlightedIndex === null &&
            value.length > 0
          ) {
            setHighlightedIndex(findNextEnabledIndex(null, 'prev'));
            event.preventDefault();
          } else if (
            target.selectionStart === 0 &&
            isArrowRight &&
            highlightedIndex === null &&
            value.length > 0
          ) {
            setHighlightedIndex(findNextEnabledIndex(null, 'next'));
            event.preventDefault();
          } else if (highlightedIndex !== null) {
            const nextIndex = findNextEnabledIndex(highlightedIndex, isArrowLeft ? 'prev' : 'next');
            if (nextIndex !== null) {
              setHighlightedIndex(nextIndex);
              event.preventDefault();
            } else if (isArrowRight) {
              setHighlightedIndex(null);
              requestAnimationFrame(() => target.setSelectionRange(0, 0));
            }
          }
          break;
        }

        case 'Home': {
          if (value.length > 0) {
            setHighlightedIndex(findNextEnabledIndex(null, 'next'));
            event.preventDefault();
          }
          break;
        }

        case 'End': {
          if (value.length > 0) {
            setHighlightedIndex(findNextEnabledIndex(null, 'prev'));
            event.preventDefault();
          }
          break;
        }

        case 'Escape': {
          if (highlightedIndex !== null) setHighlightedIndex(null);
          if (editingIndex !== null) setEditingIndex(null);
          requestAnimationFrame(() => target.setSelectionRange(0, 0));
          break;
        }
      }
    },
    [
      disabled,
      editable,
      editingIndex,
      getEnabledItems,
      highlightedIndex,
      loop,
      onItemRemove,
      resolvedDirection,
      value.length,
    ],
  );

  const getIsClickedInEmptyRoot = React.useCallback((target: HTMLElement) => {
    return (
      collectionRef.current?.contains(target) &&
      !target.hasAttribute(DATA_INPUT_TAGS_ITEM_ATTR) &&
      target.tagName !== 'INPUT' &&
      target.tagName !== 'TEXTAREA'
    );
  }, []);

  return (
    <InputTagsContext.Provider
      value={{
        value,
        onValueChange: (nextValue) => setValue(nextValue),
        onItemAdd,
        onItemRemove,
        onItemUpdate,
        onInputKeydown,
        highlightedIndex,
        setHighlightedIndex,
        editingIndex,
        setEditingIndex,
        displayValue,
        onItemLeave,
        inputRef,
        addOnPaste,
        addOnTab,
        delimiter,
        disabled,
        editable,
        isInvalidInput,
        loop,
        readOnly,
        blurBehavior,
        max,
        dir: resolvedDirection,
        id,
        inputId,
        labelId,
        valuesId,
      }}>
      <fieldset
        id={id}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        data-slot='input-tags'
        data-disabled={disabled ? '' : undefined}
        data-invalid={isInvalidInput ? '' : undefined}
        data-readonly={readOnly ? '' : undefined}
        dir={resolvedDirection}
        className={cn('m-0 flex w-95 min-w-0 flex-col gap-2 border-0 p-0', className)}
        {...rootProps}
        ref={collectionRef}
        onClick={composeEventHandlers(onClick, (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (getIsClickedInEmptyRoot(target) && document.activeElement !== inputRef.current) {
            event.currentTarget.focus();
            inputRef.current?.focus();
          }
        })}
        onKeyDown={composeEventHandlers(onKeyDownProp, (event) => {
          if (disabled || readOnly) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;

          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (getIsClickedInEmptyRoot(target)) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        })}
        onMouseDown={composeEventHandlers(onMouseDown, (event) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return;

          if (getIsClickedInEmptyRoot(target)) {
            event.preventDefault();
          }
        })}
        onBlur={composeEventHandlers(onBlur, (event) => {
          if (
            event.relatedTarget !== inputRef.current &&
            !collectionRef.current?.contains(event.relatedTarget)
          ) {
            requestAnimationFrame(() => setHighlightedIndex(null));
          }
        })}>
        {typeof children === 'function' ? children({ value }) : children}
        {isFormControl && name && (
          <InputHidden
            type='hidden'
            control={collectionRef.current}
            name={name}
            value={value}
            disabled={disabled}
            required={required}
          />
        )}
      </fieldset>
    </InputTagsContext.Provider>
  );
}

function InputTagsLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const context = useInputTagsContext('InputTagsLabel');

  return (
    <Label
      id={context.labelId}
      htmlFor={context.inputId}
      data-slot='input-tags-label'
      className={cn(
        'text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}

function InputTagsList({ className, ...props }: React.ComponentProps<'ul'>) {
  const context = useInputTagsContext('InputTagsList');

  return (
    <ul
      id={props.id ?? context.valuesId}
      data-slot='input-tags-list'
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function InputTagsValues({ className, ...props }: React.ComponentProps<'ul'>) {
  const context = useInputTagsContext('InputTagsValues');

  return (
    <ul
      id={props.id ?? context.valuesId}
      data-slot='input-tags-values'
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...props}
    />
  );
}

function InputTagsInput({ className, ...props }: React.ComponentPropsWithoutRef<'input'>) {
  const inputProps = useInputTagsInputProps({
    ...props,
    className: cn(inputTagsControlClassName, className),
  });

  return <Input {...(inputProps as React.ComponentPropsWithoutRef<'input'>)} />;
}

function InputTagsInputDebounced({ className, ...props }: Omit<InputDebouncedProps, 'ref'>) {
  const inputProps = useInputTagsInputProps(
    {
      ...props,
      'data-slot': 'input-tags-input-debounced',
      className: cn(inputTagsControlClassName, className),
    } as React.ComponentPropsWithoutRef<'input'>,
    undefined,
    { detectDelimiter: false },
  );

  return <InputDebounced {...(inputProps as InputDebouncedProps)} />;
}

function InputTagsTextarea({ className, ...props }: React.ComponentPropsWithoutRef<'textarea'>) {
  const textareaProps = useInputTagsTextareaProps({
    ...props,
    className: cn(inputTagsTextareaControlClassName, className),
  });

  return <Textarea {...(textareaProps as React.ComponentPropsWithoutRef<'textarea'>)} />;
}

function InputTagsTextareaDebounced({ className, ...props }: Omit<TextareaDebouncedProps, 'ref'>) {
  const textareaProps = useInputTagsTextareaProps(
    {
      ...props,
      'data-slot': 'input-tags-textarea-debounced',
      className: cn(inputTagsTextareaControlClassName, className),
    } as React.ComponentPropsWithoutRef<'textarea'>,
    undefined,
    { detectDelimiter: false, addOnEnter: false, addOnTab: false },
  );

  return <TextareaDebounced {...(textareaProps as TextareaDebouncedProps)} />;
}

function InputTagsInputGroupInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupInput>, 'ref'>) {
  const inputProps = useInputTagsInputProps({
    ...props,
    'data-slot': 'input-tags-input-group-input',
    className: cn(inputTagsControlClassName, className),
  } as React.ComponentPropsWithoutRef<'input'>);

  return <InputGroupInput {...(inputProps as React.ComponentProps<'input'>)} />;
}

function InputTagsInputGroupInputDebounced({
  className,
  ...props
}: Omit<InputDebouncedProps, 'ref'>) {
  const inputProps = useInputTagsInputProps(
    {
      ...props,
      'data-slot': 'input-tags-input-group-input-debounced',
      className: cn(inputTagsControlClassName, className),
    } as React.ComponentPropsWithoutRef<'input'>,
    undefined,
    { detectDelimiter: false },
  );

  return (
    <InputGroupInputDebounced
      {...(inputProps as React.ComponentProps<typeof InputGroupInputDebounced>)}
    />
  );
}

function InputTagsInputGroupTextarea({
  className,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupTextarea>, 'ref'>) {
  const textareaProps = useInputTagsTextareaProps(
    {
      ...props,
      'data-slot': 'input-tags-input-group-textarea',
      className: cn(inputTagsTextareaControlClassName, className),
    } as React.ComponentPropsWithoutRef<'textarea'>,
    undefined,
    { detectDelimiter: false, addOnEnter: false, addOnTab: false },
  );

  return (
    <InputGroupTextarea {...(textareaProps as React.ComponentProps<typeof InputGroupTextarea>)} />
  );
}

function InputTagsInputGroupTextareaDebounced({
  className,
  ...props
}: Omit<TextareaDebouncedProps, 'ref'>) {
  const textareaProps = useInputTagsTextareaProps(
    {
      ...props,
      'data-slot': 'input-tags-input-group-textarea-debounced',
      className: cn(inputTagsTextareaControlClassName, className),
    } as React.ComponentPropsWithoutRef<'textarea'>,
    undefined,
    { detectDelimiter: false, addOnEnter: false, addOnTab: false },
  );

  return (
    <InputGroupTextareaDebounced
      {...(textareaProps as React.ComponentProps<typeof InputGroupTextareaDebounced>)}
    />
  );
}

function InputTagsItem({
  className,
  children,
  value,
  disabled,
  ...props
}: React.ComponentPropsWithoutRef<'li'> & {
  value: InputValue;
  disabled?: boolean;
}) {
  const pointerTypeRef = React.useRef<React.PointerEvent['pointerType']>('touch');
  const context = useInputTagsContext('InputTagsItem');
  const id = `dice-${React.useId()}`;
  const textId = `${id}text`;
  const statusId = `${id}status`;
  const index = context.value.indexOf(value);
  const isHighlighted = index === context.highlightedIndex;
  const isEditing = index === context.editingIndex;
  const itemDisabled = disabled || context.disabled;
  const displayValue = context.displayValue(value);

  const onItemSelect = React.useCallback(() => {
    context.setHighlightedIndex(index);
    context.inputRef.current?.focus();
  }, [context, index]);

  return (
    <InputTagsItemContext.Provider
      value={{
        id,
        value,
        index,
        isHighlighted,
        isEditing,
        disabled: itemDisabled,
        textId,
        displayValue,
      }}>
      <li
        id={id}
        aria-labelledby={textId}
        aria-describedby={itemDisabled ? statusId : undefined}
        tabIndex={itemDisabled ? -1 : 0}
        aria-current={isHighlighted}
        data-slot='input-tags-item'
        data-input-tags-index={index}
        {...{ [DATA_INPUT_TAGS_ITEM_ATTR]: '' }}
        data-state={isHighlighted ? 'active' : 'inactive'}
        data-highlighted={isHighlighted ? '' : undefined}
        data-editing={isEditing ? '' : undefined}
        data-editable={context.editable ? '' : undefined}
        data-disabled={itemDisabled ? '' : undefined}
        className={cn(
          'inline-flex max-w-[calc(100%-8px)] items-center gap-1.5 rounded border bg-transparent px-2.5 py-1 text-sm focus:outline-hidden data-disabled:cursor-not-allowed data-disabled:opacity-50 data-editable:select-none data-editing:bg-transparent data-editing:ring-1 data-editing:ring-ring [&:not([data-editing])]:pr-1.5 [&[data-highlighted]:not([data-editing])]:bg-accent [&[data-highlighted]:not([data-editing])]:text-accent-foreground',
          className,
        )}
        {...props}
        onClick={composeEventHandlers(props.onClick, (event) => {
          event.stopPropagation();
          if (!isEditing && pointerTypeRef.current !== 'mouse') {
            onItemSelect();
          }
        })}
        onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
          if (itemDisabled) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;

          event.preventDefault();
          event.stopPropagation();

          if (event.key === 'Enter' && context.editable && !isEditing) {
            requestAnimationFrame(() => context.setEditingIndex(index));
            return;
          }

          onItemSelect();
        })}
        onDoubleClick={composeEventHandlers(props.onDoubleClick, () => {
          if (context.editable && !itemDisabled) {
            requestAnimationFrame(() => context.setEditingIndex(index));
          }
        })}
        onPointerUp={composeEventHandlers(props.onPointerUp, () => {
          if (pointerTypeRef.current === 'mouse') {
            onItemSelect();
          }
        })}
        onPointerDown={composeEventHandlers(props.onPointerDown, (event) => {
          pointerTypeRef.current = event.pointerType;
        })}
        onPointerMove={composeEventHandlers(props.onPointerMove, (event) => {
          pointerTypeRef.current = event.pointerType;

          if (itemDisabled) {
            context.onItemLeave();
          } else if (pointerTypeRef.current === 'mouse') {
            event.currentTarget.focus({ preventScroll: true });
          }
        })}
        onPointerLeave={composeEventHandlers(props.onPointerLeave, (event) => {
          if (event.currentTarget === document.activeElement) {
            context.onItemLeave();
          }
        })}>
        <InputTagsItemText className='truncate'>{children}</InputTagsItemText>
        {itemDisabled && (
          <span id={statusId} className='sr-only'>
            Disabled
          </span>
        )}
        <InputTagsItemDelete className='size-4 shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100'>
          <X className='size-3.5' />
        </InputTagsItemDelete>
      </li>
    </InputTagsItemContext.Provider>
  );
}

function InputTagsEditableItemText() {
  const context = useInputTagsContext('InputTagsItemText');
  const itemContext = useInputTagsItemContext('InputTagsItemText');
  const [editValue, setEditValue] = React.useState(itemContext.displayValue);
  const editInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const input = editInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const onBlur = React.useCallback(() => {
    setEditValue(itemContext.displayValue);
    context.setEditingIndex(null);
  }, [context, itemContext.displayValue]);

  const onChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;
    target.style.width = '0';
    target.style.width = `${target.scrollWidth + 4}px`;
    setEditValue(target.value);
  }, []);

  const onFocus = React.useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
    event.target.style.width = '0';
    event.target.style.width = `${event.target.scrollWidth + 4}px`;
  }, []);

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        const index = context.value.indexOf(itemContext.value);
        context.onItemUpdate(index, editValue);
      } else if (event.key === 'Escape') {
        setEditValue(itemContext.displayValue);
        context.setEditingIndex(null);
        context.setHighlightedIndex(itemContext.index);
        context.inputRef.current?.focus();
      }
      event.stopPropagation();
    },
    [context, editValue, itemContext.displayValue, itemContext.index, itemContext.value],
  );

  return (
    <Input
      ref={editInputRef}
      type='text'
      autoCapitalize='off'
      autoComplete='off'
      autoCorrect='off'
      spellCheck='false'
      aria-describedby={itemContext.textId}
      value={editValue}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{
        outline: 'none',
        background: 'inherit',
        border: 'none',
        font: 'inherit',
        color: 'inherit',
        padding: 0,
        minWidth: '1ch',
      }}
    />
  );
}

function InputTagsItemText(props: React.ComponentPropsWithoutRef<'span'>) {
  const { children, ...itemTextProps } = props;
  const context = useInputTagsContext('InputTagsItemText');
  const itemContext = useInputTagsItemContext('InputTagsItemText');

  if (itemContext.isEditing && context.editable && !itemContext.disabled) {
    return <InputTagsEditableItemText />;
  }

  return (
    <span id={itemContext.textId} {...itemTextProps}>
      {children ?? itemContext.displayValue}
    </span>
  );
}

function InputTagsItemDelete(props: React.ComponentPropsWithoutRef<typeof Button>) {
  const context = useInputTagsContext('InputTagsItemDelete');
  const itemContext = useInputTagsItemContext('InputTagsItemDelete');
  const disabled = itemContext.disabled || context.disabled;

  if (itemContext.isEditing) {
    return null;
  }

  return (
    <Button
      type='button'
      tabIndex={disabled ? undefined : -1}
      aria-labelledby={itemContext.textId}
      aria-controls={itemContext.id}
      aria-current={itemContext.isHighlighted}
      data-state={itemContext.isHighlighted ? 'active' : 'inactive'}
      data-disabled={disabled ? '' : undefined}
      {...props}
      onClick={composeEventHandlers(props.onClick, () => {
        if (disabled) return;
        const index = context.value.indexOf(itemContext.value);
        context.onItemRemove(index);
      })}
    />
  );
}

function InputTagsClear({
  ...props
}: React.ComponentPropsWithoutRef<typeof Button> & {
  forceMount?: boolean;
}) {
  const { forceMount, ...clearProps } = props;
  const context = useInputTagsContext('InputTagsClear');
  const isVisible = context.value.length > 0;

  if (!forceMount && !isVisible) {
    return null;
  }

  return (
    <Button
      type='button'
      data-slot='input-tags-clear'
      aria-disabled={context.disabled}
      data-state={isVisible ? 'visible' : 'invisible'}
      data-disabled={context.disabled ? '' : undefined}
      {...clearProps}
      onClick={composeEventHandlers(clearProps.onClick, () => {
        if (context.disabled) return;
        context.onValueChange([]);
        context.inputRef.current?.focus();
      })}
    />
  );
}

interface UseInputTagsControlOptions {
  detectDelimiter?: boolean;
  addOnEnter?: boolean;
  addOnTab?: boolean;
}

type InputTagsControlElement = HTMLInputElement | HTMLTextAreaElement;

function handleInputTagsBlur(
  target: InputTagsControlElement,
  context: InputTagsContextValue,
  onCommitValue: (target: InputTagsControlElement) => boolean,
) {
  if (context.blurBehavior === 'add') {
    onCommitValue(target);
  }

  if (context.blurBehavior === 'clear') {
    target.value = '';
  }
}

function handleInputTagsDelimiterChange(
  target: InputTagsControlElement,
  context: InputTagsContextValue,
) {
  const delimiter = context.delimiter;

  if (delimiter === target.value.slice(-1)) {
    const value = target.value.slice(0, -1);
    target.value = '';
    if (value) {
      context.onItemAdd(value);
      context.setHighlightedIndex(null);
    }
  }
}

function handleInputTagsPaste(
  event: React.ClipboardEvent<InputTagsControlElement>,
  context: InputTagsContextValue,
) {
  event.preventDefault();
  const value = event.clipboardData.getData('text');
  context.onItemAdd(value, { viaPaste: true });
  context.setHighlightedIndex(null);
}

function useInputTagsControlBehavior(
  consumerName: string,
  autoFocus: boolean | undefined,
  options: Required<UseInputTagsControlOptions>,
) {
  const context = useInputTagsContext(consumerName);
  const { detectDelimiter, addOnEnter, addOnTab } = options;

  const onCommitValue = React.useCallback(
    (target: HTMLInputElement | HTMLTextAreaElement) => {
      const value = target.value;
      if (!value) return false;

      const isAdded = context.onItemAdd(value);
      if (isAdded) {
        target.value = '';
        context.setHighlightedIndex(null);
      }

      return isAdded;
    },
    [context],
  );

  useIsoLayoutEffect(() => {
    if (!autoFocus) return;

    const animationFrameId = requestAnimationFrame(() => context.inputRef.current?.focus());
    return () => cancelAnimationFrame(animationFrameId);
  }, [autoFocus, context.inputRef]);

  return {
    context,
    detectDelimiter,
    addOnEnter,
    addOnTab,
    onCommitValue,
  };
}

function useInputTagsInputProps(
  props: React.ComponentPropsWithoutRef<'input'>,
  ref?: React.Ref<HTMLInputElement>,
  options: UseInputTagsControlOptions = {},
) {
  const { autoFocus, ...inputProps } = props;
  const behavior = useInputTagsControlBehavior('InputTagsInput', autoFocus, {
    detectDelimiter: options.detectDelimiter ?? true,
    addOnEnter: options.addOnEnter ?? true,
    addOnTab: options.addOnTab ?? true,
  });
  const { context } = behavior;
  const mergedRef = useMergedRefs(context.inputRef as React.Ref<HTMLInputElement>, ref);

  const onCustomKeydown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.defaultPrevented) return;
      const isAdded = behavior.onCommitValue(event.currentTarget);
      if (isAdded) event.preventDefault();
    },
    [behavior],
  );

  const onTab = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!context.addOnTab || !behavior.addOnTab) return;
      onCustomKeydown(event);
    },
    [behavior.addOnTab, context.addOnTab, onCustomKeydown],
  );

  return mergeProps<'input'>(
    {
      type: 'text',
      id: context.inputId,
      autoCapitalize: 'off',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: 'false',
      autoFocus,
      'aria-labelledby': context.labelId,
      'aria-readonly': context.readOnly,
      'aria-controls': context.valuesId,
      dir: context.dir,
      disabled: context.disabled,
      readOnly: context.readOnly,
      ref: mergedRef,
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        if (context.readOnly) return;

        handleInputTagsBlur(event.currentTarget, context, behavior.onCommitValue);
      },
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        if (context.readOnly || !behavior.detectDelimiter) return;

        handleInputTagsDelimiterChange(event.currentTarget, context);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (context.readOnly) return;

        if (event.key === 'Enter' && behavior.addOnEnter) {
          onCustomKeydown(event);
        }

        if (event.key === 'Tab') {
          onTab(event);
        }

        context.onInputKeydown(event);
        if (event.key.length === 1) {
          context.setHighlightedIndex(null);
        }
      },
      onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => {
        if (context.readOnly) return;

        if (context.addOnPaste) {
          handleInputTagsPaste(event, context);
        }
      },
    },
    inputProps,
  );
}

function useInputTagsTextareaProps(
  props: React.ComponentPropsWithoutRef<'textarea'>,
  ref?: React.Ref<HTMLTextAreaElement>,
  options: UseInputTagsControlOptions = {},
) {
  const { autoFocus, ...textareaProps } = props;
  const behavior = useInputTagsControlBehavior('InputTagsTextarea', autoFocus, {
    detectDelimiter: options.detectDelimiter ?? false,
    addOnEnter: options.addOnEnter ?? false,
    addOnTab: options.addOnTab ?? false,
  });
  const { context } = behavior;
  const mergedRef = useMergedRefs(context.inputRef as React.Ref<HTMLTextAreaElement>, ref);

  return mergeProps<'textarea'>(
    {
      id: context.inputId,
      autoCapitalize: 'off',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      autoFocus,
      'aria-labelledby': context.labelId,
      'aria-readonly': context.readOnly,
      'aria-controls': context.valuesId,
      dir: context.dir,
      disabled: context.disabled,
      readOnly: context.readOnly,
      ref: mergedRef,
      onBlur: (event: React.FocusEvent<HTMLTextAreaElement>) => {
        if (context.readOnly) return;

        handleInputTagsBlur(event.currentTarget, context, behavior.onCommitValue);
      },
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (context.readOnly || !behavior.detectDelimiter) return;

        handleInputTagsDelimiterChange(event.currentTarget, context);
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (context.readOnly) return;

        if (event.key === 'Enter' && behavior.addOnEnter && !event.shiftKey) {
          const isAdded = behavior.onCommitValue(event.currentTarget);
          if (isAdded) event.preventDefault();
        }

        if (event.key === 'Tab' && behavior.addOnTab && context.addOnTab) {
          const isAdded = behavior.onCommitValue(event.currentTarget);
          if (isAdded) event.preventDefault();
        }

        context.onInputKeydown(event);
        if (event.key.length === 1) {
          context.setHighlightedIndex(null);
        }
      },
      onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (context.readOnly) return;

        if (context.addOnPaste) {
          handleInputTagsPaste(event, context);
        }
      },
    },
    textareaProps,
  );
}

export {
  InputTags,
  InputTagsClear,
  InputTagsInput,
  InputTagsInputDebounced,
  InputTagsInputGroupInput,
  InputTagsInputGroupInputDebounced,
  InputTagsInputGroupTextarea,
  InputTagsInputGroupTextareaDebounced,
  InputTagsItem,
  InputTagsLabel,
  InputTagsList,
  InputTagsTextarea,
  InputTagsTextareaDebounced,
  InputTagsValues,
};
