/* @vitest-environment jsdom */

import type { TPropertyCard } from '@kws/schema';

import { useVirtualizer } from '@tanstack/react-virtual';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VirtualPropertyGrid } from './virtual-property-grid';

vi.mock('@/components/global/property-card', () => ({ PropertyCard: () => null }));
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn<(options: { scrollMargin: number }) => unknown>((options) => ({
    options,
    getVirtualItems: () => [{ index: 0, key: 'row', start: options.scrollMargin }],
    getTotalSize: () => 440,
    measure: () => {},
  })),
}));

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const top =
      this.getAttribute('data-slot') === 'scroll-area-viewport'
        ? 80
        : this.tagName === 'MAIN'
          ? 420
          : 360;
    return new DOMRect(0, top, 1200, 800);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('VirtualPropertyGrid scroll viewport', () => {
  it('observes the nearest ScrollArea viewport instead of window', () => {
    const { container } = render(
      <div data-slot='scroll-area-viewport'>
        <VirtualPropertyGrid
          title='Listings'
          items={[{ listingKey: 'NWM-Test' } as TPropertyCard]}
        />
      </div>,
    );

    const options = vi.mocked(useVirtualizer).mock.lastCall?.[0];
    expect(options?.getScrollElement()).toBe(
      container.querySelector('[data-slot="scroll-area-viewport"]'),
    );
  });

  it('measures the card grid offset in the scroll viewport coordinate system', () => {
    const { container } = render(
      <div data-slot='scroll-area-viewport'>
        <VirtualPropertyGrid
          title='Listings'
          items={[{ listingKey: 'NWM-Test' } as TPropertyCard]}
        />
      </div>,
    );
    const viewport = container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!;
    viewport.scrollTop = 2000;
    fireEvent.resize(window);

    expect(vi.mocked(useVirtualizer).mock.lastCall?.[0].scrollMargin).toBe(2340);
  });
});
