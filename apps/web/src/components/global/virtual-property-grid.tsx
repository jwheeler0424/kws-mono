import type { TPropertyCard } from '@kws/types';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

import { PropertyCard } from '@/components/global/property-card';
import {
  PROPERTY_CARD_HEIGHT,
  PROPERTY_CARD_MAX_WIDTH,
} from '@/components/global/property-card.constants';
import { cn } from '@/lib/utils';

const LOADER_ROW_ESTIMATE = 96;

export type ResponsiveGridLayout = {
  columns: number;
  columnGap: number;
  rowGap: number;
  paddingX: number;
  paddingY: number;
};

export interface VirtualPropertyGridProps {
  title: string;
  items: TPropertyCard[];
  emptyText?: string;
  pageSize?: number;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => boolean | void;
  virtualization?: {
    threshold?: number;
    rowEstimate?: number;
    getOverscanRows?: (columns: number) => number;
  };
}

export function getResponsiveGridLayout(containerWidth: number): ResponsiveGridLayout {
  const safeWidth = Math.max(containerWidth, 1);
  const paddingX =
    safeWidth < 540
      ? 16
      : safeWidth < 680
        ? 8
        : safeWidth < 1024
          ? 16
          : safeWidth < 1440
            ? 24
            : safeWidth < 2560
              ? 32
              : 40;
  const paddingY = safeWidth < 680 ? 16 : safeWidth < 800 ? 8 : 0;
  const columnGap =
    safeWidth < 540
      ? 32
      : safeWidth < 800
        ? 16
        : safeWidth < 1024
          ? 24
          : safeWidth < 1280
            ? 32
            : safeWidth < 1536
              ? 40
              : safeWidth < 2560
                ? 48
                : 32;
  const rowGap =
    safeWidth < 540
      ? 32
      : safeWidth < 768
        ? 40
        : safeWidth < 1024
          ? 32
          : safeWidth < 1440
            ? 40
            : safeWidth < 2560
              ? 48
              : 40;
  const availableWidth = Math.max(safeWidth - paddingX * 2, PROPERTY_CARD_MAX_WIDTH);
  const fittedColumns = Math.floor(
    (availableWidth + columnGap) / (PROPERTY_CARD_MAX_WIDTH + columnGap),
  );

  return {
    columns: Math.max(1, fittedColumns),
    columnGap,
    rowGap,
    paddingX,
    paddingY,
  };
}

function renderCardGrid(layout: ResponsiveGridLayout, items: TPropertyCard[]) {
  return (
    <div
      className='grid w-full auto-rows-auto place-items-center items-start justify-center'
      style={{
        columnGap: `${layout.columnGap}px`,
        rowGap: `${layout.rowGap}px`,
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        paddingInline: `${layout.paddingX}px`,
        paddingBlock: `${layout.paddingY}px`,
      }}>
      {items.map((listing) => (
        <PropertyCard key={listing.listingKey} listing={listing} />
      ))}
    </div>
  );
}

export function VirtualPropertyGrid({
  title,
  items,
  emptyText,
  pageSize = 48,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  virtualization,
}: VirtualPropertyGridProps) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [scrollMargin, setScrollMargin] = React.useState(0);
  const [isLayoutReady, setIsLayoutReady] = React.useState(false);
  const parentRef = React.useRef<HTMLDivElement>(null);
  const fallbackLoadMoreRef = React.useRef<HTMLDivElement>(null);
  const loadRequestTokenRef = React.useRef<string | null>(null);

  const totalItems = items.length;
  const firstItemKey = items[0]?.listingKey;
  const safePageSize = Math.max(1, pageSize);
  const layout = React.useMemo(() => getResponsiveGridLayout(containerWidth), [containerWidth]);
  const rowsPerPage = Math.max(1, Math.ceil(safePageSize / layout.columns));
  const totalRows = Math.ceil(totalItems / layout.columns);
  const estimatedRowHeight =
    virtualization?.rowEstimate ?? PROPERTY_CARD_HEIGHT + layout.paddingY * 2;
  const hasLoaderRow = hasMore && Boolean(onLoadMore);
  const loaderRowIndex = totalRows;
  const preloadThresholdRows = Math.max(
    1,
    virtualization?.threshold ?? Math.max(1, Math.ceil(rowsPerPage / 2)),
  );
  const overscanRows =
    virtualization?.getOverscanRows?.(layout.columns) ??
    Math.max(4, Math.min(10, layout.columns + 2));

  const syncContainerMetrics = React.useCallback(() => {
    const observedElement = parentRef.current;
    if (!observedElement) {
      return;
    }

    const nextWidth = observedElement.offsetWidth;
    const nextScrollMargin = observedElement.getBoundingClientRect().top + window.scrollY;

    setContainerWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    setIsLayoutReady(nextWidth > 0);
    setScrollMargin((currentMargin) =>
      currentMargin === nextScrollMargin ? currentMargin : nextScrollMargin,
    );
  }, []);

  const getItemKey = React.useCallback(
    (index: number) => {
      if (index === loaderRowIndex) {
        return `loader-${totalRows}-${layout.columns}`;
      }

      const firstListing = items[index * layout.columns];
      return `${firstListing?.listingKey ?? `row-${index}`}-${layout.columns}`;
    },
    [items, layout.columns, loaderRowIndex, totalRows],
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: totalRows + (hasLoaderRow ? 1 : 0),
    estimateSize: (index) => (index === loaderRowIndex ? LOADER_ROW_ESTIMATE : estimatedRowHeight),
    overscan: overscanRows,
    gap: layout.rowGap,
    scrollMargin,
    getItemKey,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const showStaticGridFallback = totalItems > 0 && virtualRows.length === 0;
  const loaderLabel = loadingMore ? 'Loading more properties...' : 'Loading more...';

  React.useLayoutEffect(() => {
    const observedElement = parentRef.current;
    if (!observedElement) {
      return;
    }

    let frame = 0;

    const syncMetrics = () => {
      syncContainerMetrics();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        syncContainerMetrics();
      });
    };

    syncMetrics();

    const resizeObserver = new ResizeObserver(() => {
      syncMetrics();
    });

    resizeObserver.observe(observedElement);
    window.addEventListener('resize', syncMetrics);
    window.addEventListener('load', syncMetrics);
    void document.fonts?.ready.then(syncMetrics);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', syncMetrics);
      window.removeEventListener('load', syncMetrics);
      resizeObserver.unobserve(observedElement);
      resizeObserver.disconnect();
    };
  }, [syncContainerMetrics]);

  React.useLayoutEffect(() => {
    syncContainerMetrics();
  }, [
    items.length,
    layout.columnGap,
    layout.columns,
    layout.paddingX,
    layout.paddingY,
    layout.rowGap,
    syncContainerMetrics,
  ]);

  React.useLayoutEffect(() => {
    rowVirtualizer.measure();
  }, [estimatedRowHeight, hasLoaderRow, layout.columns, layout.rowGap, rowVirtualizer, totalRows]);

  React.useEffect(() => {
    if (!hasLoaderRow) {
      loadRequestTokenRef.current = null;
    }
  }, [hasLoaderRow]);

  React.useEffect(() => {
    if (!hasMore || loadingMore || !onLoadMore || virtualRows.length === 0) {
      return;
    }

    const lastVisible = virtualRows[virtualRows.length - 1];
    const triggerRowIndex = hasLoaderRow ? loaderRowIndex : Math.max(totalRows - 1, 0);
    const triggerToken = `${totalRows}:${layout.columns}`;

    if (
      lastVisible &&
      lastVisible.index >= Math.max(0, triggerRowIndex - preloadThresholdRows) &&
      loadRequestTokenRef.current !== triggerToken
    ) {
      const started = onLoadMore();

      if (started !== false) {
        loadRequestTokenRef.current = triggerToken;
      }
    }
  }, [
    hasLoaderRow,
    hasMore,
    layout.columns,
    loaderRowIndex,
    loadingMore,
    onLoadMore,
    preloadThresholdRows,
    totalRows,
    virtualRows,
  ]);

  React.useEffect(() => {
    loadRequestTokenRef.current = null;
  }, [firstItemKey, totalRows]);

  React.useEffect(() => {
    if (!showStaticGridFallback || !hasMore || loadingMore || !onLoadMore) {
      return;
    }

    const node = fallbackLoadMoreRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [showStaticGridFallback, hasMore, loadingMore, onLoadMore]);

  return (
    <section className='mt-12 w-full' ref={parentRef}>
      <h1 className='my-0! mb-8! text-5xl 2xsdt:mb-12!'>{title}</h1>
      {!isLayoutReady ? (
        <main className='m-0! min-h-16 p-0!' aria-busy='true' />
      ) : items.length ? (
        <>
          {showStaticGridFallback ? (
            <main className='m-0! p-0!'>
              {renderCardGrid(layout, items)}
              {hasLoaderRow ? (
                <div
                  ref={fallbackLoadMoreRef}
                  className='flex w-full items-center justify-center py-6'>
                  <span className='text-gray text-center font-sans text-sm font-thin'>
                    {loaderLabel}
                  </span>
                </div>
              ) : null}
            </main>
          ) : (
            <main
              className='m-0! p-0!'
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}>
              {virtualRows.map((row) => {
                const isLoaderRow = hasLoaderRow && row.index === loaderRowIndex;
                const rowStartIndex = row.index * layout.columns;
                const rowItems = items.slice(rowStartIndex, rowStartIndex + layout.columns);

                return (
                  <div
                    key={row.key}
                    data-index={row.index}
                    className={cn(
                      isLoaderRow
                        ? 'flex w-full items-center justify-center'
                        : 'grid w-full auto-rows-auto place-items-center items-start justify-center',
                    )}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${row.start - rowVirtualizer.options.scrollMargin}px)`,
                      paddingInline: `${layout.paddingX}px`,
                      paddingBlock: `${layout.paddingY}px`,
                      ...(isLoaderRow
                        ? undefined
                        : {
                            columnGap: `${layout.columnGap}px`,
                            gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                          }),
                    }}>
                    {isLoaderRow ? (
                      <span className='text-gray text-center font-sans text-sm font-thin'>
                        {loaderLabel}
                      </span>
                    ) : (
                      rowItems.map((listing) => (
                        <PropertyCard key={listing.listingKey} listing={listing} />
                      ))
                    )}
                  </div>
                );
              })}
            </main>
          )}
        </>
      ) : (
        <div className='my-[clamp(1rem,6vw+0.25rem,3rem)] flex w-full items-center justify-center'>
          <span className='text-gray max-w-full rounded p-[clamp(1rem,6vw+0.25rem,3rem)] text-center font-sans text-base font-thin'>
            {emptyText || 'There are currently no properties to view.'}
          </span>
        </div>
      )}
    </section>
  );
}

export default VirtualPropertyGrid;
