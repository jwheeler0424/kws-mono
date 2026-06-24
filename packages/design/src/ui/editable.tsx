'use client';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { InputHidden } from './input-hidden';

const ROOT_NAME = 'Editable';
const LABEL_NAME = 'EditableLabel';
const AREA_NAME = 'EditableArea';
const PREVIEW_NAME = 'EditablePreview';
const INPUT_NAME = 'EditableInput';
const TRIGGER_NAME = 'EditableTrigger';
const TOOLBAR_NAME = 'EditableToolbar';
const CANCEL_NAME = 'EditableCancel';
const SUBMIT_NAME = 'EditableSubmit';

type Direction = 'ltr' | 'rtl' | 'auto';

type PreviewElement = HTMLDivElement;
type SubmitElement = HTMLButtonElement;
type InputElement = HTMLInputElement;

interface StoreState {
  value: string;
  editing: boolean;
}

interface Store {
  subscribe: (callback: () => void) => () => void;
  getState: () => StoreState;
  setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void;
  notify: () => void;
}

const StoreContext = React.createContext<Store | null>(null);

function useStoreContext(consumerName: string) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T, ogStore?: Store | null): T {
  const contextStore = React.useContext(StoreContext);
  const store = ogStore ?? contextStore;

  if (!store) {
    throw new Error(`\`useStore\` must be used within \`${ROOT_NAME}\``);
  }

  const getSnapshot = React.useCallback(() => selector(store.getState()), [store, selector]);

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface EditableContextValue {
  rootId: string;
  inputId: string;
  labelId: string;
  defaultValue: string;
  onCancel: () => void;
  onEdit: () => void;
  onSubmit: (value: string) => void;
  onEnterKeyDown?: (event: KeyboardEvent) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  dir?: Direction;
  maxLength?: number;
  placeholder?: string;
  triggerMode: 'click' | 'dblclick' | 'focus';
  autosize: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
}

const EditableContext = React.createContext<EditableContextValue | null>(null);

function useEditableContext(consumerName: string) {
  const context = React.useContext(EditableContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
  }
  return context;
}

export interface EditableProps extends Omit<useRender.ComponentProps<'div'>, 'onSubmit'> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultEditing?: boolean;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onSubmit?: (value: string) => void;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onEnterKeyDown?: (event: KeyboardEvent) => void;
  dir?: Direction;
  maxLength?: number;
  name?: string;
  placeholder?: string;
  triggerMode?: EditableContextValue['triggerMode'];
  autosize?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  invalid?: boolean;
}

function Editable(props: EditableProps) {
  const {
    value: valueProp,
    defaultValue = '',
    defaultEditing,
    editing: editingProp,
    onValueChange,
    onEditingChange,
    onCancel: onCancelProp,
    onEdit: onEditProp,
    onSubmit: onSubmitProp,
    onEscapeKeyDown,
    onEnterKeyDown,
    dir,
    maxLength,
    name,
    placeholder,
    triggerMode = 'click',
    render,
    autosize = false,
    disabled,
    required,
    readOnly,
    invalid,
    className,
    id,
    ref,
    ...rootProps
  } = props;

  const instanceId = React.useId();
  const rootId = id ?? instanceId;
  const inputId = React.useId();
  const labelId = React.useId();

  const previousValueRef = React.useRef(defaultValue);
  const [formTrigger, setFormTrigger] = React.useState<HTMLElement | null>(null);

  const handleRootRef = React.useCallback((node: HTMLElement | null) => {
    setFormTrigger(node);
  }, []);

  const isFormControl = formTrigger ? !!formTrigger.closest('form') : true;

  // 2. Native replacement for useLazyRef
  const listenersRef = React.useRef<Set<() => void>>(null);
  if (listenersRef.current === null) {
    listenersRef.current = new Set();
  }

  const stateRef = React.useRef<StoreState>(null);
  if (stateRef.current === null) {
    stateRef.current = {
      value: valueProp ?? defaultValue,
      editing: editingProp ?? defaultEditing ?? false,
    };
  }

  // 3. Native replacement for useAsRef
  const propsRef = React.useRef({
    onValueChange,
    onEditingChange,
    onCancel: onCancelProp,
    onEdit: onEditProp,
    onSubmit: onSubmitProp,
    onEscapeKeyDown,
    onEnterKeyDown,
  });

  useIsoLayoutEffect(() => {
    propsRef.current = {
      onValueChange,
      onEditingChange,
      onCancel: onCancelProp,
      onEdit: onEditProp,
      onSubmit: onSubmitProp,
      onEscapeKeyDown,
      onEnterKeyDown,
    };
  });

  const store = React.useMemo<Store>(() => {
    return {
      subscribe: (cb) => {
        listenersRef.current!.add(cb);
        return () => listenersRef.current!.delete(cb);
      },
      getState: () => stateRef.current!,
      setState: (key, value) => {
        if (Object.is(stateRef.current![key], value)) return;

        if (key === 'value' && typeof value === 'string') {
          stateRef.current!.value = value;
          propsRef.current.onValueChange?.(value);
        } else if (key === 'editing' && typeof value === 'boolean') {
          stateRef.current!.editing = value;
          propsRef.current.onEditingChange?.(value);
        } else {
          stateRef.current![key] = value;
        }

        store.notify();
      },
      notify: () => {
        for (const cb of listenersRef.current!) {
          cb();
        }
      },
    };
  }, []);

  const value = useStore((state) => state.value, store);

  useIsoLayoutEffect(() => {
    if (valueProp !== undefined) {
      store.setState('value', valueProp);
    }
  }, [valueProp, store]);

  useIsoLayoutEffect(() => {
    if (editingProp !== undefined) {
      store.setState('editing', editingProp);
    }
  }, [editingProp, store]);

  const onCancel = React.useCallback(() => {
    const prevValue = previousValueRef.current;
    store.setState('value', prevValue);
    store.setState('editing', false);
    propsRef.current.onCancel?.();
  }, [store]);

  const onEdit = React.useCallback(() => {
    const currentValue = store.getState().value;
    previousValueRef.current = currentValue;
    store.setState('editing', true);
    propsRef.current.onEdit?.();
  }, [store]);

  const onSubmit = React.useCallback(
    (newValue: string) => {
      store.setState('value', newValue);
      store.setState('editing', false);
      propsRef.current.onSubmit?.(newValue);
    },
    [store],
  );

  const contextValue = React.useMemo<EditableContextValue>(
    () => ({
      rootId,
      inputId,
      labelId,
      defaultValue,
      onSubmit,
      onEdit,
      onCancel,
      onEscapeKeyDown,
      onEnterKeyDown,
      dir,
      maxLength,
      placeholder,
      triggerMode,
      autosize,
      disabled,
      readOnly,
      required,
      invalid,
    }),
    [
      rootId,
      inputId,
      labelId,
      defaultValue,
      onSubmit,
      onCancel,
      onEdit,
      onEscapeKeyDown,
      onEnterKeyDown,
      dir,
      maxLength,
      placeholder,
      triggerMode,
      autosize,
      disabled,
      required,
      readOnly,
      invalid,
    ],
  );

  const defaultProps: useRender.ElementProps<'div'> & { 'data-slot': string } = {
    'data-slot': 'editable',
    id,
    className: cn('flex min-w-0 flex-col gap-2', className),
  };

  const renderedRoot = useRender({
    defaultTagName: 'div',
    ref: [ref, handleRootRef].filter(Boolean) as Array<React.Ref<HTMLDivElement>>,
    render,
    props: mergeProps<'div'>(defaultProps, rootProps),
  });

  return (
    <StoreContext.Provider value={store}>
      <EditableContext.Provider value={contextValue}>
        {renderedRoot}
        {isFormControl && (
          <InputHidden
            type='hidden'
            control={formTrigger}
            name={name}
            value={value}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
          />
        )}
      </EditableContext.Provider>
    </StoreContext.Provider>
  );
}

export interface EditableLabelProps extends useRender.ComponentProps<'label'> {}

function EditableLabel(props: EditableLabelProps) {
  const { className, children, ref, render, ...labelProps } = props;
  const context = useEditableContext(LABEL_NAME);

  const defaultProps: useRender.ElementProps<'label'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-invalid'?: string;
    'data-required'?: string;
  } = {
    'data-disabled': context.disabled ? '' : undefined,
    'data-invalid': context.invalid ? '' : undefined,
    'data-required': context.required ? '' : undefined,
    'data-slot': 'editable-label',
    id: context.labelId,
    htmlFor: context.inputId,
    className: cn(
      "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 data-required:after:ml-0.5 data-required:after:text-destructive data-required:after:content-['*']",
      className,
    ),
    children,
  };

  return useRender({
    defaultTagName: 'label',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLLabelElement>>,
    render,
    props: mergeProps<'label'>(defaultProps, labelProps),
  });
}

export interface EditableAreaProps extends useRender.ComponentProps<'div'> {}

function EditableArea(props: EditableAreaProps) {
  const { className, ref, render, ...areaProps } = props;
  const context = useEditableContext(AREA_NAME);
  const editing = useStore((state) => state.editing);

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-editing'?: string;
  } = {
    role: 'group',
    'data-disabled': context.disabled ? '' : undefined,
    'data-editing': editing ? '' : undefined,
    'data-slot': 'editable-area',
    dir: context.dir,
    className: cn(
      'relative inline-block min-w-0 data-disabled:cursor-not-allowed data-disabled:opacity-50',
      className,
    ),
  };

  return useRender({
    defaultTagName: 'div',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLDivElement>>,
    render,
    props: mergeProps<'div'>(defaultProps, areaProps),
  });
}

export interface EditablePreviewProps extends useRender.ComponentProps<'div'> {}

function EditablePreview(props: EditablePreviewProps) {
  const {
    onClick: onClickProp,
    onDoubleClick: onDoubleClickProp,
    onFocus: onFocusProp,
    onKeyDown: onKeyDownProp,
    className,
    ref,
    render,
    children,
    ...previewProps
  } = props;

  const context = useEditableContext(PREVIEW_NAME);
  const value = useStore((state) => state.value);
  const editing = useStore((state) => state.editing);

  const propsRef = React.useRef({
    onClick: onClickProp,
    onDoubleClick: onDoubleClickProp,
    onFocus: onFocusProp,
    onKeyDown: onKeyDownProp,
  });

  useIsoLayoutEffect(() => {
    propsRef.current = {
      onClick: onClickProp,
      onDoubleClick: onDoubleClickProp,
      onFocus: onFocusProp,
      onKeyDown: onKeyDownProp,
    };
  });

  const onTrigger = React.useCallback(() => {
    if (context.disabled || context.readOnly) return;
    context.onEdit();
  }, [context]);

  const onClick = React.useCallback(
    (event: React.MouseEvent<PreviewElement>) => {
      propsRef.current.onClick?.(event);
      if (event.defaultPrevented || context.triggerMode !== 'click') return;
      onTrigger();
    },
    [onTrigger, context.triggerMode],
  );

  const onDoubleClick = React.useCallback(
    (event: React.MouseEvent<PreviewElement>) => {
      propsRef.current.onDoubleClick?.(event);
      if (event.defaultPrevented || context.triggerMode !== 'dblclick') return;
      onTrigger();
    },
    [onTrigger, context.triggerMode],
  );

  const onFocus = React.useCallback(
    (event: React.FocusEvent<PreviewElement>) => {
      propsRef.current.onFocus?.(event);
      if (event.defaultPrevented || context.triggerMode !== 'focus') return;
      onTrigger();
    },
    [onTrigger, context.triggerMode],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<PreviewElement>) => {
      propsRef.current.onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === 'Enter') {
        const nativeEvent = event.nativeEvent;
        if (context.onEnterKeyDown) {
          context.onEnterKeyDown(nativeEvent);
          if (nativeEvent.defaultPrevented) return;
        }
        onTrigger();
      }
    },
    [onTrigger, context],
  );

  if (editing || context.readOnly) return null;

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
    'data-empty'?: string;
  } = {
    role: 'button',
    'aria-disabled': context.disabled || context.readOnly,
    'data-empty': !value ? '' : undefined,
    'data-disabled': context.disabled ? '' : undefined,
    'data-readonly': context.readOnly ? '' : undefined,
    'data-slot': 'editable-preview',
    tabIndex: context.disabled || context.readOnly ? undefined : 0,
    onClick,
    onDoubleClick,
    onFocus,
    onKeyDown,
    className: cn(
      'cursor-text truncate rounded-sm border border-transparent py-1 text-base focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden data-disabled:cursor-not-allowed data-disabled:opacity-50 data-empty:text-muted-foreground data-readonly:cursor-default md:text-sm',
      className,
    ),
    children: children ?? (value || context.placeholder),
  };

  return useRender({
    defaultTagName: 'div',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLDivElement>>,
    render,
    props: mergeProps<'div'>(defaultProps, previewProps),
  });
}

export interface EditableInputProps extends useRender.ComponentProps<'input'> {}

function EditableInput(props: EditableInputProps) {
  const {
    onBlur: onBlurProp,
    onChange: onChangeProp,
    onKeyDown: onKeyDownProp,
    className,
    disabled,
    readOnly,
    required,
    maxLength,
    ref,
    render,
    ...inputProps
  } = props;

  const context = useEditableContext(INPUT_NAME);
  const store = useStoreContext(INPUT_NAME);
  const value = useStore((state) => state.value);
  const editing = useStore((state) => state.editing);
  const inputRef = React.useRef<InputElement>(null);

  const propsRef = React.useRef({
    onBlur: onBlurProp,
    onChange: onChangeProp,
    onKeyDown: onKeyDownProp,
  });

  useIsoLayoutEffect(() => {
    propsRef.current = {
      onBlur: onBlurProp,
      onChange: onChangeProp,
      onKeyDown: onKeyDownProp,
    };
  });

  const isDisabled = disabled || context.disabled;
  const isReadOnly = readOnly || context.readOnly;
  const isRequired = required || context.required;

  const onAutosize = React.useCallback(
    (target: InputElement) => {
      if (!context.autosize) return;

      if (target instanceof HTMLTextAreaElement) {
        target.style.height = '0';
        target.style.height = `${target.scrollHeight}px`;
      } else {
        target.style.width = '0';
        target.style.width = `${target.scrollWidth + 4}px`;
      }
    },
    [context.autosize],
  );

  const onBlur = React.useCallback(
    (event: React.FocusEvent<InputElement>) => {
      if (isDisabled || isReadOnly) return;

      propsRef.current.onBlur?.(event);
      if (event.defaultPrevented) return;

      const relatedTarget = event.relatedTarget;
      const isAction =
        relatedTarget instanceof HTMLElement &&
        (relatedTarget.closest(`[data-slot="editable-trigger"]`) ||
          relatedTarget.closest(`[data-slot="editable-cancel"]`));

      if (!isAction) {
        context.onSubmit(value);
      }
    },
    [value, context, isDisabled, isReadOnly],
  );

  const onChange = React.useCallback(
    (event: React.ChangeEvent<InputElement>) => {
      if (isDisabled || isReadOnly) return;

      propsRef.current.onChange?.(event);
      if (event.defaultPrevented) return;

      store.setState('value', event.target.value);
      onAutosize(event.target);
    },
    [store, onAutosize, isDisabled, isReadOnly],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<InputElement>) => {
      if (isDisabled || isReadOnly) return;

      propsRef.current.onKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        const nativeEvent = event.nativeEvent;
        if (context.onEscapeKeyDown) {
          context.onEscapeKeyDown(nativeEvent);
          if (nativeEvent.defaultPrevented) return;
        }
        context.onCancel();
      } else if (event.key === 'Enter') {
        context.onSubmit(value);
      }
    },
    [value, context, isDisabled, isReadOnly],
  );

  useIsoLayoutEffect(() => {
    if (!editing || isDisabled || isReadOnly || !inputRef.current) return;

    const frameId = window.requestAnimationFrame(() => {
      if (!inputRef.current) return;

      inputRef.current.focus();
      inputRef.current.select();
      onAutosize(inputRef.current);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [editing, onAutosize, isDisabled, isReadOnly]);

  if (!editing && !isReadOnly) return null;

  const defaultProps: useRender.ElementProps<'input'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
    'data-required'?: string;
  } = {
    'aria-required': isRequired,
    'aria-invalid': context.invalid,
    'data-slot': 'editable-input',
    dir: context.dir,
    disabled: isDisabled,
    readOnly: isReadOnly,
    required: isRequired,
    id: context.inputId,
    'aria-labelledby': context.labelId,
    maxLength,
    placeholder: context.placeholder,
    value,
    onBlur,
    onChange,
    onKeyDown,
    className: cn(
      'flex rounded-sm border border-input bg-transparent py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      context.autosize ? 'w-auto' : 'w-full',
      className,
    ),
  };

  return useRender({
    defaultTagName: 'input',
    ref: [ref, inputRef].filter(Boolean) as Array<React.Ref<HTMLInputElement>>,
    render,
    props: mergeProps<'input'>(defaultProps, inputProps),
  });
}

export interface EditableTriggerProps extends useRender.ComponentProps<'button'> {
  forceMount?: boolean;
}

function EditableTrigger(props: EditableTriggerProps) {
  const { forceMount = false, ref, render, ...triggerProps } = props;
  const context = useEditableContext(TRIGGER_NAME);
  const editing = useStore((state) => state.editing);

  const onTrigger = React.useCallback(() => {
    if (context.disabled || context.readOnly) return;
    context.onEdit();
  }, [context]);

  if (!forceMount && (editing || context.readOnly)) return null;

  const defaultProps: useRender.ElementProps<'button'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
  } = {
    type: 'button',
    'aria-controls': context.rootId,
    'aria-disabled': context.disabled || context.readOnly,
    'data-disabled': context.disabled ? '' : undefined,
    'data-readonly': context.readOnly ? '' : undefined,
    'data-slot': 'editable-trigger',
    onClick: context.triggerMode === 'click' ? onTrigger : undefined,
    onDoubleClick: context.triggerMode === 'dblclick' ? onTrigger : undefined,
  };

  return useRender({
    defaultTagName: 'button',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLButtonElement>>,
    render,
    props: mergeProps<'button'>(defaultProps, triggerProps),
  });
}

export interface EditableToolbarProps extends useRender.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

function EditableToolbar(props: EditableToolbarProps) {
  const { className, orientation = 'horizontal', ref, render, ...toolbarProps } = props;
  const context = useEditableContext(TOOLBAR_NAME);

  const defaultProps: useRender.ElementProps<'div'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
  } = {
    role: 'toolbar',
    'aria-controls': context.rootId,
    'aria-orientation': orientation,
    'data-slot': 'editable-toolbar',
    dir: context.dir,
    className: cn('flex items-center gap-2', orientation === 'vertical' && 'flex-col', className),
  };

  return useRender({
    defaultTagName: 'div',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLDivElement>>,
    render,
    props: mergeProps<'div'>(defaultProps, toolbarProps),
  });
}

export interface EditableCancelProps extends useRender.ComponentProps<'button'> {}

function EditableCancel(props: EditableCancelProps) {
  const { onClick: onClickProp, ref, render, ...cancelProps } = props;
  const context = useEditableContext(CANCEL_NAME);
  const editing = useStore((state) => state.editing);

  const propsRef = React.useRef({
    onClick: onClickProp,
  });

  useIsoLayoutEffect(() => {
    propsRef.current = {
      onClick: onClickProp,
    };
  });

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (context.disabled || context.readOnly) return;

      propsRef.current.onClick?.(event);
      if (event.defaultPrevented) return;

      context.onCancel();
    },
    [context],
  );

  if (!editing && !context.readOnly) return null;

  const defaultProps: useRender.ElementProps<'button'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
  } = {
    type: 'button',
    'aria-controls': context.rootId,
    'data-slot': 'editable-cancel',
    onClick,
  };

  return useRender({
    defaultTagName: 'button',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLButtonElement>>,
    render,
    props: mergeProps<'button'>(defaultProps, cancelProps),
  });
}

export interface EditableSubmitProps extends useRender.ComponentProps<'button'> {}

function EditableSubmit(props: EditableSubmitProps) {
  const { onClick: onClickProp, ref, render, ...submitProps } = props;
  const context = useEditableContext(SUBMIT_NAME);
  const value = useStore((state) => state.value);
  const editing = useStore((state) => state.editing);

  const propsRef = React.useRef({
    onClick: onClickProp,
  });

  useIsoLayoutEffect(() => {
    propsRef.current = {
      onClick: onClickProp,
    };
  });

  const onClick = React.useCallback(
    (event: React.MouseEvent<SubmitElement>) => {
      if (context.disabled || context.readOnly) return;

      propsRef.current.onClick?.(event);
      if (event.defaultPrevented) return;

      context.onSubmit(value);
    },
    [context, value],
  );

  if (!editing && !context.readOnly) return null;

  const defaultProps: useRender.ElementProps<'button'> & {
    'data-slot': string;
    'data-disabled'?: string;
    'data-readonly'?: string;
  } = {
    type: 'button',
    'aria-controls': context.rootId,
    'data-slot': 'editable-submit',
    onClick,
  };

  return useRender({
    defaultTagName: 'button',
    ref: [ref].filter(Boolean) as Array<React.Ref<HTMLButtonElement>>,
    render,
    props: mergeProps<'button'>(defaultProps, submitProps),
  });
}

export {
  Editable,
  EditableArea,
  EditableCancel,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableSubmit,
  EditableToolbar,
  EditableTrigger,
  //
  useStore as useEditable,
};
