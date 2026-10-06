import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCarouselValue, type CarouselApi } from './carousel';
import { FileUpload, FileUploadItem, FileUploadItemPreview } from './file-upload';
import { InputDebounced, type InputDebouncedHandle } from './input-debounced';
import { TextareaDebounced } from './textarea-debounced';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('lint cleanup regressions', () => {
  it('updates carousel snapshots on selection and reinitialization and removes listeners', () => {
    const listeners = new Map<string, () => void>();
    let selectedIndex = 0;
    const on = vi.fn<(event: string, listener: () => void) => void>((event, listener) => {
      listeners.set(event, listener);
    });
    const off = vi.fn<(event: string) => void>((event) => {
      listeners.delete(event);
    });
    const api = {
      on,
      off,
      selectedScrollSnap: () => selectedIndex,
    } as unknown as NonNullable<CarouselApi>;
    const { result, unmount } = renderHook(() =>
      useCarouselValue(api, (instance) => instance.selectedScrollSnap(), 0),
    );

    expect(result.current).toBe(0);
    act(() => {
      selectedIndex = 2;
      listeners.get('select')?.();
    });
    expect(result.current).toBe(2);
    act(() => {
      selectedIndex = 1;
      listeners.get('reInit')?.();
    });
    expect(result.current).toBe(1);

    unmount();
    expect(off).toHaveBeenCalledTimes(2);
    expect(listeners.size).toBe(0);
  });

  it('reads an already initialized carousel when its API becomes available', () => {
    const api = {
      on: vi.fn<(event: string, listener: () => void) => void>(),
      off: vi.fn<(event: string, listener: () => void) => void>(),
      selectedScrollSnap: () => 3,
    } as unknown as NonNullable<CarouselApi>;
    const { result, rerender } = renderHook(
      ({ instance }: { instance: CarouselApi }) =>
        useCarouselValue(instance, (carousel) => carousel.selectedScrollSnap(), 0),
      { initialProps: { instance: undefined as CarouselApi } },
    );
    expect(result.current).toBe(0);
    rerender({ instance: api });
    expect(result.current).toBe(3);
  });

  it('debounces input changes, updates delay options, and invokes the latest callback', async () => {
    vi.useFakeTimers();
    const initialCallback = vi.fn<(value: string | undefined) => void>();
    const nextCallback = vi.fn<(value: string | undefined) => void>();
    const onDebounceEnd = vi.fn<() => void>();
    const { rerender } = render(
      <InputDebounced
        delay={100}
        onDebouncedChange={initialCallback}
        onDebounceEnd={onDebounceEnd}
      />,
    );
    await act(() => vi.runAllTimers());
    initialCallback.mockClear();
    onDebounceEnd.mockClear();

    rerender(
      <InputDebounced delay={50} onDebouncedChange={nextCallback} onDebounceEnd={onDebounceEnd} />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Seattle' } });
    await act(() => vi.advanceTimersByTime(49));
    expect(nextCallback).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(1));
    expect(nextCallback).toHaveBeenLastCalledWith('Seattle');
    expect(initialCallback).not.toHaveBeenCalled();
    expect(onDebounceEnd).toHaveBeenCalledOnce();
  });

  it('flushes pending input changes through its imperative handle', async () => {
    vi.useFakeTimers();
    const handle = React.createRef<InputDebouncedHandle>();
    const onDebouncedChange = vi.fn<(value: string | undefined) => void>();
    render(<InputDebounced ref={handle} delay={100} onDebouncedChange={onDebouncedChange} />);
    await act(() => vi.runAllTimers());
    onDebouncedChange.mockClear();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bellevue' } });
    act(() => handle.current?.flush());
    expect(onDebouncedChange).toHaveBeenLastCalledWith('Bellevue');
  });

  it('restarts pending input work when the delay changes', async () => {
    vi.useFakeTimers();
    const onDebouncedChange = vi.fn<(value: string | undefined) => void>();
    const { rerender } = render(
      <InputDebounced delay={100} onDebouncedChange={onDebouncedChange} />,
    );
    await act(() => vi.runAllTimers());
    onDebouncedChange.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pending' } });
    await act(() => vi.advanceTimersByTime(20));
    rerender(<InputDebounced delay={50} onDebouncedChange={onDebouncedChange} />);
    await act(() => vi.advanceTimersByTime(49));
    expect(onDebouncedChange).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTime(1));
    expect(onDebouncedChange).toHaveBeenLastCalledWith('Pending');
  });

  it('debounces textarea changes and cancels pending work on unmount', async () => {
    vi.useFakeTimers();
    const onDebouncedChange = vi.fn<(value: string) => void>();
    const onDebounceEnd = vi.fn<() => void>();
    const { unmount } = render(
      <TextareaDebounced
        delay={50}
        onDebouncedChange={onDebouncedChange}
        onDebounceEnd={onDebounceEnd}
      />,
    );
    await act(() => vi.runAllTimers());
    onDebouncedChange.mockClear();
    onDebounceEnd.mockClear();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A new home' } });
    await act(() => vi.advanceTimersByTime(50));
    expect(onDebouncedChange).toHaveBeenLastCalledWith('A new home');
    expect(onDebounceEnd).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pending' } });
    unmount();
    await act(() => vi.runAllTimers());
    expect(onDebounceEnd).toHaveBeenCalledOnce();
  });

  it('creates and revokes image preview URLs under strict effects', () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:preview');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    class PreviewURL extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', PreviewURL);
    const file = new File(['image'], 'home.png', { type: 'image/png' });
    const { unmount } = render(
      <React.StrictMode>
        <FileUpload defaultValue={[file]}>
          <FileUploadItem value={file}>
            <FileUploadItemPreview />
          </FileUploadItem>
        </FileUpload>
      </React.StrictMode>,
    );

    expect(screen.getByRole('img').getAttribute('src')).toBe('blob:preview');
    expect(createObjectURL).toHaveBeenCalledWith(file);
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(createObjectURL.mock.calls.length);
    expect(revokeObjectURL).toHaveBeenLastCalledWith('blob:preview');
  });
});
