'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useMergedRefs } from '@base-ui/utils/useMergedRefs';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import {
    FileArchiveIcon,
    FileAudioIcon,
    FileCodeIcon,
    FileCogIcon,
    FileIcon,
    FileTextIcon,
    FileVideoIcon,
} from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/utils';

const ROOT_NAME = 'FileUpload';
const DROPZONE_NAME = 'FileUploadDropzone';
const TRIGGER_NAME = 'FileUploadTrigger';
const LIST_NAME = 'FileUploadList';
const ITEM_NAME = 'FileUploadItem';
const ITEM_PREVIEW_NAME = 'FileUploadItemPreview';
const ITEM_METADATA_NAME = 'FileUploadItemMetadata';
const ITEM_PROGRESS_NAME = 'FileUploadItemProgress';
const ITEM_DELETE_NAME = 'FileUploadItemDelete';
const CLEAR_NAME = 'FileUploadClear';

const FILE_UPLOAD_ERRORS = {
  [ROOT_NAME]: `\`${ROOT_NAME}\` must be used as root component`,
  [DROPZONE_NAME]: `\`${DROPZONE_NAME}\` must be within \`${ROOT_NAME}\``,
  [TRIGGER_NAME]: `\`${TRIGGER_NAME}\` must be within \`${ROOT_NAME}\``,
  [LIST_NAME]: `\`${LIST_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${ROOT_NAME}\``,
  [ITEM_PREVIEW_NAME]: `\`${ITEM_PREVIEW_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_METADATA_NAME]: `\`${ITEM_METADATA_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_PROGRESS_NAME]: `\`${ITEM_PROGRESS_NAME}\` must be within \`${ITEM_NAME}\``,
  [ITEM_DELETE_NAME]: `\`${ITEM_DELETE_NAME}\` must be within \`${ITEM_NAME}\``,
  [CLEAR_NAME]: `\`${CLEAR_NAME}\` must be within \`${ROOT_NAME}\``,
} as const;

function useObjectUrl(file?: File) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  return url;
}

type Direction = 'ltr' | 'rtl';

const DirectionContext = React.createContext<Direction | undefined>(undefined);

function useDirection(dirProp?: Direction): Direction {
  const contextDir = React.useContext(DirectionContext);
  return dirProp ?? contextDir ?? 'ltr';
}

interface FileState {
  file: File;
  progress: number;
  error?: string;
  status: 'idle' | 'uploading' | 'error' | 'success';
}

interface StoreState {
  files: Map<File, FileState>;
  dragOver: boolean;
  invalid: boolean;
}

type StoreAction =
  | { variant: 'ADD_FILES'; files: Array<File> }
  | { variant: 'SET_FILES'; files: Array<File>; silent?: boolean }
  | { variant: 'SET_PROGRESS'; file: File; progress: number }
  | { variant: 'SET_SUCCESS'; file: File }
  | { variant: 'SET_ERROR'; file: File; error: string }
  | { variant: 'REMOVE_FILE'; file: File }
  | { variant: 'SET_DRAG_OVER'; dragOver: boolean }
  | { variant: 'SET_INVALID'; invalid: boolean }
  | { variant: 'CLEAR' };

function createStore(
  listeners: Set<() => void>,
  files: Map<File, FileState>,
  onValueChange?: (files: Array<File>) => void,
  invalid?: boolean,
) {
  const initialState: StoreState = {
    files,
    dragOver: false,
    invalid: invalid ?? false,
  };

  let state = initialState;

  function reducer(prevState: StoreState, action: StoreAction): StoreState {
    switch (action.variant) {
      case 'ADD_FILES': {
        for (const file of action.files) {
          files.set(file, {
            file,
            progress: 0,
            status: 'idle',
          });
        }

        if (onValueChange) {
          const fileList = Array.from(files.values()).map((fileState) => fileState.file);
          onValueChange(fileList);
        }
        return { ...prevState, files };
      }

      case 'SET_FILES': {
        const newFileSet = new Set(action.files);
        for (const existingFile of files.keys()) {
          if (!newFileSet.has(existingFile)) {
            files.delete(existingFile);
          }
        }

        for (const file of action.files) {
          const existingState = files.get(file);
          if (!existingState) {
            files.set(file, {
              file,
              progress: 0,
              status: 'idle',
            });
          }
        }

        if (onValueChange && !action.silent) {
          const fileList = Array.from(files.values()).map((fileState) => fileState.file);
          onValueChange(fileList);
        }

        return { ...prevState, files };
      }

      case 'SET_PROGRESS': {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            progress: action.progress,
            status: 'uploading',
          });
        }
        return { ...prevState, files };
      }

      case 'SET_SUCCESS': {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            progress: 100,
            status: 'success',
          });
        }
        return { ...prevState, files };
      }

      case 'SET_ERROR': {
        const fileState = files.get(action.file);
        if (fileState) {
          files.set(action.file, {
            ...fileState,
            error: action.error,
            status: 'error',
          });
        }
        return { ...prevState, files };
      }

      case 'REMOVE_FILE': {
        files.delete(action.file);

        if (onValueChange) {
          const fileList = Array.from(files.values()).map((fileState) => fileState.file);
          onValueChange(fileList);
        }
        return { ...prevState, files };
      }

      case 'SET_DRAG_OVER': {
        return { ...prevState, dragOver: action.dragOver };
      }

      case 'SET_INVALID': {
        return { ...prevState, invalid: action.invalid };
      }

      case 'CLEAR': {
        files.clear();
        if (onValueChange) {
          onValueChange([]);
        }
        return { ...prevState, files, invalid: false };
      }

      default:
        return prevState;
    }
  }

  function getState() {
    return state;
  }

  function dispatch(action: StoreAction) {
    state = reducer(state, action);
    for (const listener of listeners) {
      listener();
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, dispatch, subscribe };
}

const StoreContext = React.createContext<ReturnType<typeof createStore> | null>(null);
StoreContext.displayName = ROOT_NAME;

function useStoreContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

function useStore<T>(selector: (state: StoreState) => T): T {
  const store = useStoreContext(ROOT_NAME);

  const lastValueRef = useRefWithInit<{
    hasValue: boolean;
    value: T | null;
    state: StoreState | null;
  }>(() => ({
    hasValue: false,
    value: null,
    state: null,
  }));

  const getSnapshot = React.useCallback(() => {
    const state = store.getState();
    const prevValue = lastValueRef.current;

    if (prevValue.hasValue && prevValue.state === state) {
      return prevValue.value as T;
    }

    const nextValue = selector(state);
    prevValue.hasValue = true;
    prevValue.value = nextValue;
    prevValue.state = state;
    return nextValue;
  }, [store, selector, lastValueRef]);

  return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

interface FileUploadContextValue {
  inputId: string;
  dropzoneId: string;
  listId: string;
  labelId: string;
  disabled: boolean;
  dir: Direction;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null);

function useFileUploadContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(FileUploadContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

interface FileUploadRootProps extends Omit<useRender.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
  value?: Array<File>;
  defaultValue?: Array<File>;
  onValueChange?: (files: Array<File>) => void;
  onAccept?: (files: Array<File>) => void;
  onFileAccept?: (file: File) => void;
  onFileReject?: (file: File, message: string) => void;
  onFileValidate?: (file: File) => string | null | undefined;
  onUpload?: (
    files: Array<File>,
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    },
  ) => Promise<void> | void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  dir?: Direction;
  label?: string;
  name?: string;
  inputProps?: React.ComponentPropsWithRef<'input'>;
  disabled?: boolean;
  invalid?: boolean;
  multiple?: boolean;
  required?: boolean;
}

const FileUploadRoot = React.forwardRef<HTMLDivElement, FileUploadRootProps>((props, forwardedRef) => {
  const {
    value,
    defaultValue,
    onValueChange,
    accept,
    dir: dirProp,
    label,
    name,
    inputProps,
    render,
    disabled = false,
    invalid = false,
    multiple = false,
    required = false,
    children,
    className,
    ...rootProps
  } = props;

  const inputId = React.useId();
  const dropzoneId = React.useId();
  const listId = React.useId();
  const labelId = React.useId();

  const dir = useDirection(dirProp);
  const propsRef = React.useRef(props);
  const listeners = useRefWithInit(() => new Set<() => void>()).current;
  const files = useRefWithInit<Map<File, FileState>>(() => new Map()).current;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const syncingInputRef = React.useRef(false);
  const handlingInputChangeRef = React.useRef(false);
  const lastInputFilesSignatureRef = React.useRef('');
  const invalidTimeoutRef = React.useRef<number | null>(null);
  const isControlled = value !== undefined;

  const store = React.useMemo(
    () => createStore(listeners, files, onValueChange, invalid),
    [listeners, files, onValueChange, invalid],
  );

  useIsoLayoutEffect(() => {
    propsRef.current = props;
  });

  const contextValue = React.useMemo<FileUploadContextValue>(
    () => ({
      dropzoneId,
      inputId,
      listId,
      labelId,
      dir,
      disabled,
      inputRef,
    }),
    [dropzoneId, inputId, listId, labelId, dir, disabled],
  );

  const { ref: inputForwardedRef, onChange: _inputOnChange, ...restInputProps } = inputProps ?? {};
  const mergedInputRef = useMergedRefs(inputRef, inputForwardedRef);

  React.useEffect(() => {
    if (isControlled) {
      store.dispatch({ variant: 'SET_FILES', files: value, silent: true });
    } else if (defaultValue && defaultValue.length > 0 && !store.getState().files.size) {
      store.dispatch({
        variant: 'SET_FILES',
        files: defaultValue,
        silent: true,
      });
    }
  }, [value, defaultValue, isControlled, store]);

  React.useEffect(() => {
    return () => {
      if (invalidTimeoutRef.current !== null) {
        window.clearTimeout(invalidTimeoutRef.current);
      }
    };
  }, []);

  const syncInputFiles = React.useCallback((nextFiles: Array<File>, emitChangeEvent: boolean) => {
    const input = inputRef.current;
    if (!input || typeof DataTransfer === 'undefined') return;

    const signature = nextFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|');

    if (lastInputFilesSignatureRef.current === signature) {
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of nextFiles) {
      dataTransfer.items.add(file);
    }

    input.files = dataTransfer.files;
    lastInputFilesSignatureRef.current = signature;

    if (emitChangeEvent) {
      syncingInputRef.current = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      syncingInputRef.current = false;
    }
  }, []);

  React.useEffect(() => {
    const syncFromStore = () => {
      const stateFiles = Array.from(store.getState().files.values()).map((item) => item.file);
      syncInputFiles(stateFiles, !handlingInputChangeRef.current);
    };

    syncFromStore();
    return store.subscribe(syncFromStore);
  }, [store, syncInputFiles]);

  const onFilesUpload = React.useCallback(
    async (uploadFiles: Array<File>) => {
      try {
        for (const file of uploadFiles) {
          store.dispatch({ variant: 'SET_PROGRESS', file, progress: 0 });
        }

        if (propsRef.current.onUpload) {
          await propsRef.current.onUpload(uploadFiles, {
            onProgress: (file, progress) => {
              store.dispatch({
                variant: 'SET_PROGRESS',
                file,
                progress: Math.min(Math.max(0, progress), 100),
              });
            },
            onSuccess: (file) => {
              store.dispatch({ variant: 'SET_SUCCESS', file });
            },
            onError: (file, error) => {
              store.dispatch({
                variant: 'SET_ERROR',
                file,
                error: error.message ?? 'Upload failed',
              });
            },
          });
        } else {
          for (const file of uploadFiles) {
            store.dispatch({ variant: 'SET_SUCCESS', file });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        for (const file of uploadFiles) {
          store.dispatch({
            variant: 'SET_ERROR',
            file,
            error: errorMessage,
          });
        }
      }
    },
    [store, propsRef],
  );

  const onFilesChange = React.useCallback(
    (originalFiles: Array<File>) => {
      if (propsRef.current.disabled) return;

      let filesToProcess = [...originalFiles];
      let hasInvalid = false;

      if (!propsRef.current.multiple && filesToProcess.length > 1) {
        const rejectedFiles = filesToProcess.slice(1);
        filesToProcess = filesToProcess.slice(0, 1);

        for (const file of rejectedFiles) {
          propsRef.current.onFileReject?.(file, 'Only one file can be selected');
        }

        hasInvalid = true;
      }

      if (propsRef.current.maxFiles) {
        const currentCount = store.getState().files.size;
        const remainingSlotCount = Math.max(0, propsRef.current.maxFiles - currentCount);

        if (remainingSlotCount < filesToProcess.length) {
          const rejectedFiles = filesToProcess.slice(remainingSlotCount);
          hasInvalid = true;

          filesToProcess = filesToProcess.slice(0, remainingSlotCount);

          for (const file of rejectedFiles) {
            let rejectionMessage = `Maximum ${propsRef.current.maxFiles} files allowed`;

            if (propsRef.current.onFileValidate) {
              const validationMessage = propsRef.current.onFileValidate(file);
              if (validationMessage) {
                rejectionMessage = validationMessage;
              }
            }

            propsRef.current.onFileReject?.(file, rejectionMessage);
          }
        }
      }

      const acceptedFiles: Array<File> = [];

      for (const file of filesToProcess) {
        let rejected = false;
        let rejectionMessage = '';

        if (propsRef.current.onFileValidate) {
          const validationMessage = propsRef.current.onFileValidate(file);
          if (validationMessage) {
            rejectionMessage = validationMessage;
            propsRef.current.onFileReject?.(file, rejectionMessage);
            rejected = true;
            hasInvalid = true;
            continue;
          }
        }

        if (propsRef.current.accept) {
          const acceptTypes = propsRef.current.accept.split(',').map((t) => t.trim());
          const fileType = file.type;
          const fileExtension = `.${file.name.split('.').pop()}`;

          if (
            !acceptTypes.some(
              (type) =>
                type === fileType ||
                type === fileExtension ||
                (type.includes('/*') && fileType.startsWith(type.replace('/*', '/'))),
            )
          ) {
            rejectionMessage = 'File type not accepted';
            propsRef.current.onFileReject?.(file, rejectionMessage);
            rejected = true;
            hasInvalid = true;
          }
        }

        if (propsRef.current.maxSize && file.size > propsRef.current.maxSize) {
          rejectionMessage = 'File too large';
          propsRef.current.onFileReject?.(file, rejectionMessage);
          rejected = true;
          hasInvalid = true;
        }

        if (!rejected) {
          acceptedFiles.push(file);
        }
      }

      if (hasInvalid) {
        store.dispatch({ variant: 'SET_INVALID', invalid: hasInvalid });
        if (invalidTimeoutRef.current !== null) {
          window.clearTimeout(invalidTimeoutRef.current);
        }
        invalidTimeoutRef.current = window.setTimeout(() => {
          store.dispatch({ variant: 'SET_INVALID', invalid: false });
        }, 2000);
      }

      if (acceptedFiles.length > 0) {
        if (propsRef.current.multiple) {
          store.dispatch({ variant: 'ADD_FILES', files: acceptedFiles });
        } else {
          store.dispatch({ variant: 'SET_FILES', files: [acceptedFiles[0]] });
        }

        if (propsRef.current.onAccept) {
          propsRef.current.onAccept(acceptedFiles);
        }

        for (const file of acceptedFiles) {
          propsRef.current.onFileAccept?.(file);
        }

        if (propsRef.current.onUpload) {
          requestAnimationFrame(() => {
            void onFilesUpload(acceptedFiles);
          });
        }
      }
    },
    [store, propsRef, onFilesUpload],
  );

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handlingInputChangeRef.current = true;

      try {
        propsRef.current.inputProps?.onChange?.(event);

        if (syncingInputRef.current) {
          return;
        }

        const inputFiles = Array.from(event.target.files ?? []);
        onFilesChange(inputFiles);
      } finally {
        handlingInputChangeRef.current = false;
      }
    },
    [onFilesChange, propsRef],
  );

  return (
    <DirectionContext.Provider value={dir}>
      <StoreContext.Provider value={store}>
        <FileUploadContext.Provider value={contextValue}>
          {useRender({
            defaultTagName: 'div',
            render,
            ref: forwardedRef,
            props: mergeProps<'div'>(
              {
                dir,
                className: cn('relative flex flex-col gap-2', className),
                children: (
                  <>
                    {children}
                    <input
                      type='file'
                      id={inputId}
                      aria-labelledby={labelId}
                      aria-describedby={dropzoneId}
                      tabIndex={-1}
                      accept={accept}
                      name={name}
                      disabled={disabled}
                      multiple={multiple}
                      required={required}
                      className='sr-only'
                      {...restInputProps}
                      ref={mergedInputRef}
                      onChange={onInputChange}
                    />
                    <span id={labelId} className='sr-only'>
                      {label ?? 'File upload'}
                    </span>
                  </>
                ),
              },
              rootProps,
            ),
            state: {
              slot: 'file-upload',
              disabled,
            },
          })}
        </FileUploadContext.Provider>
      </StoreContext.Provider>
    </DirectionContext.Provider>
  );
});
FileUploadRoot.displayName = ROOT_NAME;

interface FileUploadDropzoneProps extends useRender.ComponentProps<'div'> {}

const FileUploadDropzone = React.forwardRef<HTMLDivElement, FileUploadDropzoneProps>((props, forwardedRef) => {
  const { render, className, ...dropzoneProps } = props;

  const context = useFileUploadContext(DROPZONE_NAME);
  const store = useStoreContext(DROPZONE_NAME);
  const dragOver = useStore((state) => state.dragOver);
  const invalid = useStore((state) => state.invalid);
  const propsRef = React.useRef(dropzoneProps);

  useIsoLayoutEffect(() => {
    propsRef.current = dropzoneProps;
  });

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      const target = event.target;

      const isFromTrigger = target instanceof HTMLElement && target.closest('[data-slot="file-upload-trigger"]');

      if (!isFromTrigger) {
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef],
  );

  const onDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragOver?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: 'SET_DRAG_OVER', dragOver: true });
    },
    [store, propsRef],
  );

  const onDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragEnter?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: 'SET_DRAG_OVER', dragOver: true });
    },
    [store, propsRef],
  );

  const onDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDragLeave?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: 'SET_DRAG_OVER', dragOver: false });
    },
    [store, propsRef],
  );

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      propsRef.current?.onDrop?.(event);

      if (event.defaultPrevented) return;

      event.preventDefault();
      store.dispatch({ variant: 'SET_DRAG_OVER', dragOver: false });

      const files = Array.from(event.dataTransfer.files);
      const inputElement = context.inputRef.current;
      if (!inputElement) return;

      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }

      inputElement.files = dataTransfer.files;
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [store, context.inputRef, propsRef],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      propsRef.current?.onKeyDown?.(event);

      if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        context.inputRef.current?.click();
      }
    },
    [context.inputRef, propsRef],
  );

  return useRender({
    defaultTagName: 'div',
    render,
    ref: forwardedRef,
    props: mergeProps<'div'>(
      {
        role: 'region',
        id: context.dropzoneId,
        'aria-controls': `${context.inputId} ${context.listId}`,
        'aria-disabled': context.disabled,
        'aria-invalid': invalid,
        dir: context.dir,
        tabIndex: context.disabled ? undefined : 0,
        className: cn(
          'group/dropzone relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 p-6 transition-colors outline-none select-none hover:border-chart-3/60 hover:bg-secondary/30 focus-visible:border-ring/50 data-[disabled]:pointer-events-none data-[dragging]:border-primary data-[invalid]:border-destructive data-[invalid]:ring-destructive/20',
          className,
        ),
        onClick,
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
        onKeyDown,
      },
      dropzoneProps,
    ),
    state: {
      slot: 'file-upload-dropzone',
      disabled: context.disabled,
      dragging: dragOver,
      invalid,
    },
  });
});
FileUploadDropzone.displayName = DROPZONE_NAME;

interface FileUploadTriggerProps extends useRender.ComponentProps<'button'> {}

const FileUploadTrigger = React.forwardRef<HTMLButtonElement, FileUploadTriggerProps>((props, forwardedRef) => {
  const { render, ...triggerProps } = props;
  const context = useFileUploadContext(TRIGGER_NAME);
  const propsRef = React.useRef(triggerProps);

  useIsoLayoutEffect(() => {
    propsRef.current = triggerProps;
  });

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      context.inputRef.current?.click();
    },
    [context.inputRef, propsRef],
  );

  return useRender({
    defaultTagName: 'button',
    render,
    ref: forwardedRef,
    props: mergeProps<'button'>(
      {
        type: 'button',
        'aria-controls': context.inputId,
        disabled: context.disabled,
        onClick,
      },
      triggerProps,
    ),
    state: {
      slot: 'file-upload-trigger',
      disabled: context.disabled,
    },
  });
});
FileUploadTrigger.displayName = TRIGGER_NAME;

interface FileUploadListProps extends useRender.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical';
  forceMount?: boolean;
}

const FileUploadList = React.forwardRef<HTMLDivElement, FileUploadListProps>((props, forwardedRef) => {
  const { className, orientation = 'vertical', render, forceMount, ...listProps } = props;

  const context = useFileUploadContext(LIST_NAME);

  const shouldRender = forceMount || useStore((state) => state.files.size > 0);

  return useRender({
    defaultTagName: 'div',
    render,
    ref: forwardedRef,
    props: mergeProps<'div'>(
      {
        role: 'list',
        id: context.listId,
        'aria-orientation': orientation,
        dir: context.dir,
        className: cn(
          'flex animate-in flex-col gap-2 fade-in-0 slide-in-from-top-2',
          orientation === 'horizontal' && 'flex-row overflow-x-auto p-1.5',
          className,
        ),
      },
      listProps,
    ),
    state: {
      slot: 'file-upload-list',
      orientation,
      active: shouldRender,
    },
    enabled: shouldRender,
  });
});
FileUploadList.displayName = LIST_NAME;

interface FileUploadItemContextValue {
  id: string;
  fileState: FileState | undefined;
  nameId: string;
  sizeId: string;
  statusId: string;
  messageId: string;
}

const FileUploadItemContext = React.createContext<FileUploadItemContextValue | null>(null);

function useFileUploadItemContext(name: keyof typeof FILE_UPLOAD_ERRORS) {
  const context = React.useContext(FileUploadItemContext);
  if (!context) {
    throw new Error(FILE_UPLOAD_ERRORS[name]);
  }
  return context;
}

interface FileUploadItemProps extends useRender.ComponentProps<'div'> {
  value: File;
}

const FileUploadItem = React.forwardRef<HTMLDivElement, FileUploadItemProps>((props, forwardedRef) => {
  const { value, render, className, ...itemProps } = props;

  const id = React.useId();
  const statusId = `${id}-status`;
  const nameId = `${id}-name`;
  const sizeId = `${id}-size`;
  const messageId = `${id}-message`;

  const context = useFileUploadContext(ITEM_NAME);
  const fileState = useStore((state) => state.files.get(value));
  const fileCount = useStore((state) => state.files.size);
  const fileIndex = useStore((state) => {
    const files = Array.from(state.files.keys());
    return files.indexOf(value) + 1;
  });

  const itemContext = React.useMemo(
    () => ({
      id,
      fileState,
      nameId,
      sizeId,
      statusId,
      messageId,
    }),
    [id, fileState, statusId, nameId, sizeId, messageId],
  );

  if (!fileState) return null;

  const statusText = fileState.error
    ? `Error: ${fileState.error}`
    : fileState.status === 'uploading'
      ? `Uploading: ${fileState.progress}% complete`
      : fileState.status === 'success'
        ? 'Upload complete'
        : 'Ready to upload';

  const describedBy = fileState ? `${nameId} ${sizeId} ${statusId} ${fileState.error ? messageId : ''}` : undefined;

  return (
    <FileUploadItemContext.Provider value={itemContext}>
      {useRender({
        defaultTagName: 'div',
        render,
        ref: forwardedRef,
        props: mergeProps<'div'>(
          {
            role: 'listitem',
            id,
            'aria-setsize': fileCount,
            'aria-posinset': fileIndex,
            'aria-describedby': describedBy,
            'aria-labelledby': nameId,
            dir: context.dir,
            className: cn(
              'relative flex items-center gap-2.5 rounded-md border p-3 has-[_[data-slot=file-upload-progress]]:flex-col has-[_[data-slot=file-upload-progress]]:items-start',
              className,
            ),
            children: (
              <>
                {props.children}
                <span id={statusId} className='sr-only'>
                  {statusText}
                </span>
              </>
            ),
          },
          itemProps,
        ),
        state: {
          slot: 'file-upload-item',
          status: fileState.status,
          error: !!fileState.error,
        },
        enabled: !!fileState,
      })}
    </FileUploadItemContext.Provider>
  );
});
FileUploadItem.displayName = ITEM_NAME;

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${sizes[i]}`;
}

function getFileIcon(file: File) {
  const type = file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (type.startsWith('video/')) {
    return <FileVideoIcon />;
  }

  if (type.startsWith('audio/')) {
    return <FileAudioIcon />;
  }

  if (type.startsWith('text/') || ['txt', 'md', 'rtf', 'pdf'].includes(extension)) {
    return <FileTextIcon />;
  }

  if (
    ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'xml', 'php', 'py', 'rb', 'java', 'c', 'cpp', 'cs'].includes(
      extension,
    )
  ) {
    return <FileCodeIcon />;
  }

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return <FileArchiveIcon />;
  }

  if (['exe', 'msi', 'app', 'apk', 'deb', 'rpm'].includes(extension) || type.startsWith('application/')) {
    return <FileCogIcon />;
  }

  return <FileIcon />;
}

interface FileUploadItemPreviewProps extends useRender.ComponentProps<'div'> {
  preview?: (file: File) => React.ReactNode;
}

const FileUploadItemPreview = React.forwardRef<HTMLDivElement, FileUploadItemPreviewProps>((props, forwardedRef) => {
  const { render, preview, children, className, ...previewProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME);

  const isImage = itemContext.fileState?.file.type.startsWith('image/');
  const imageUrl = useObjectUrl(isImage ? itemContext.fileState?.file : undefined);

  const onPreviewRender = React.useCallback(
    (file: File) => {
      if (preview) return preview(file);

      if (isImage && imageUrl) {
        return <img src={imageUrl} alt={file.name} className='size-full rounded object-cover' />;
      }

      return getFileIcon(file);
    },
    [imageUrl, isImage, preview],
  );

  return useRender({
    defaultTagName: 'div',
    render,
    ref: forwardedRef,
    props: mergeProps<'div'>(
      {
        'aria-labelledby': itemContext.nameId,
        className: cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-md',
          isImage ? 'object-cover' : 'bg-accent/50 [&>svg]:size-7',
          className,
        ),
        children: (
          <>
            {itemContext.fileState ? onPreviewRender(itemContext.fileState.file) : null}
            {children}
          </>
        ),
      },
      previewProps,
    ),
    state: {
      slot: 'file-upload-preview',
      image: !!isImage,
    },
    enabled: !!itemContext.fileState,
  });
});
FileUploadItemPreview.displayName = ITEM_PREVIEW_NAME;

interface FileUploadItemMetadataProps extends useRender.ComponentProps<'div'> {}

const FileUploadItemMetadata = React.forwardRef<HTMLDivElement, FileUploadItemMetadataProps>((props, forwardedRef) => {
  const { render, children, className, ...metadataProps } = props;

  const context = useFileUploadContext(ITEM_METADATA_NAME);
  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME);

  return useRender({
    defaultTagName: 'div',
    render,
    ref: forwardedRef,
    props: mergeProps<'div'>(
      {
        dir: context.dir,
        className: cn('flex min-w-0 flex-1 flex-col', className),
        children: children ?? (
          <>
            <span id={itemContext.nameId} className='truncate text-sm font-medium'>
              {itemContext.fileState?.file.name}
            </span>
            <span id={itemContext.sizeId} className='text-xs text-muted-foreground'>
              {itemContext.fileState ? formatBytes(itemContext.fileState.file.size) : null}
            </span>
            {itemContext.fileState?.error && (
              <span id={itemContext.messageId} className='text-xs text-destructive'>
                {itemContext.fileState?.error}
              </span>
            )}
          </>
        ),
      },
      metadataProps,
    ),
    state: {
      slot: 'file-upload-metadata',
      error: !!itemContext.fileState?.error,
    },
    enabled: !!itemContext.fileState,
  });
});
FileUploadItemMetadata.displayName = ITEM_METADATA_NAME;

interface FileUploadItemProgressProps extends useRender.ComponentProps<'div'> {
  circular?: boolean;
  size?: number;
}

const FileUploadItemProgress = React.forwardRef<HTMLDivElement, FileUploadItemProgressProps>((props, forwardedRef) => {
  const { circular, size = 40, render, className, ...progressProps } = props;

  const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME);
  const fileState = itemContext.fileState;
  const progress = fileState?.progress ?? 0;
  const isCircular = !!circular;
  const isSuccess = fileState?.status === 'success';
  const isEnabled = !!fileState && !(isCircular && isSuccess);

  const circumference = 2 * Math.PI * ((size - 4) / 2);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return useRender({
    defaultTagName: 'div',
    render,
    ref: forwardedRef,
    props: mergeProps<'div'>(
      {
        role: 'progressbar',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': progress,
        'aria-valuetext': `${progress}%`,
        'aria-labelledby': itemContext.nameId,
        className: cn(
          isCircular
            ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20',
          className,
        ),
        children: isCircular ? (
          <svg
            className='-rotate-90 transform'
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill='none'
            stroke='currentColor'>
            <circle className='text-primary/20' strokeWidth='2' cx={size / 2} cy={size / 2} r={(size - 4) / 2} />
            <circle
              className='text-primary transition-all'
              strokeWidth='2'
              strokeLinecap='round'
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              cx={size / 2}
              cy={size / 2}
              r={(size - 4) / 2}
            />
          </svg>
        ) : (
          <div
            className='h-full w-full flex-1 bg-primary transition-all'
            style={{
              transform: `translateX(-${100 - progress}%)`,
            }}
          />
        ),
      },
      progressProps,
    ),
    state: {
      slot: 'file-upload-progress',
      circular: isCircular,
    },
    enabled: isEnabled,
  });
});
FileUploadItemProgress.displayName = ITEM_PROGRESS_NAME;

interface FileUploadItemDeleteProps extends useRender.ComponentProps<'button'> {}

const FileUploadItemDelete = React.forwardRef<HTMLButtonElement, FileUploadItemDeleteProps>((props, forwardedRef) => {
  const { render, ...deleteProps } = props;

  const store = useStoreContext(ITEM_DELETE_NAME);
  const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME);
  const propsRef = React.useRef(deleteProps);

  useIsoLayoutEffect(() => {
    propsRef.current = deleteProps;
  });

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (!itemContext.fileState || event.defaultPrevented) return;

      store.dispatch({
        variant: 'REMOVE_FILE',
        file: itemContext.fileState.file,
      });
    },
    [store, itemContext.fileState, propsRef],
  );

  return useRender({
    defaultTagName: 'button',
    render,
    ref: forwardedRef,
    props: mergeProps<'button'>(
      {
        type: 'button',
        'aria-controls': itemContext.id ?? undefined,
        'aria-describedby': itemContext.nameId ?? undefined,
        onClick,
      },
      deleteProps,
    ),
    state: {
      slot: 'file-upload-item-delete',
    },
    enabled: !!itemContext.fileState,
  });
});
FileUploadItemDelete.displayName = ITEM_DELETE_NAME;

interface FileUploadClearProps extends useRender.ComponentProps<'button'> {
  forceMount?: boolean;
}

const FileUploadClear = React.forwardRef<HTMLButtonElement, FileUploadClearProps>((props, forwardedRef) => {
  const { render, forceMount, disabled, ...clearProps } = props;

  const context = useFileUploadContext(CLEAR_NAME);
  const store = useStoreContext(CLEAR_NAME);
  const propsRef = React.useRef(clearProps);

  useIsoLayoutEffect(() => {
    propsRef.current = clearProps;
  });

  const isDisabled = disabled || context.disabled;

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      propsRef.current?.onClick?.(event);

      if (event.defaultPrevented) return;

      store.dispatch({ variant: 'CLEAR' });
    },
    [store, propsRef],
  );

  const shouldRender = forceMount || useStore((state) => state.files.size > 0);

  return useRender({
    defaultTagName: 'button',
    render,
    ref: forwardedRef,
    props: mergeProps<'button'>(
      {
        type: 'button',
        'aria-controls': context.listId,
        disabled: isDisabled,
        onClick,
      },
      clearProps,
    ),
    state: {
      slot: 'file-upload-clear',
      disabled: isDisabled,
    },
    enabled: !!shouldRender,
  });
});
FileUploadClear.displayName = CLEAR_NAME;

const FileUpload = FileUploadRoot;
const Root = FileUploadRoot;
const Trigger = FileUploadTrigger;
const Dropzone = FileUploadDropzone;
const List = FileUploadList;
const Item = FileUploadItem;
const ItemPreview = FileUploadItemPreview;
const ItemMetadata = FileUploadItemMetadata;
const ItemProgress = FileUploadItemProgress;
const ItemDelete = FileUploadItemDelete;
const Clear = FileUploadClear;

export {
    Clear,
    Dropzone,
    FileUpload,
    FileUploadClear,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadItemProgress,
    FileUploadList,
    FileUploadTrigger,
    Item,
    ItemDelete,
    ItemMetadata,
    ItemPreview,
    ItemProgress,
    List,
    //
    Root,
    Trigger,
    //
    useStore as useFileUpload
};

