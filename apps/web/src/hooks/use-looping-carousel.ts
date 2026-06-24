import useEmblaCarousel from 'embla-carousel-react';
import React from 'react';

export function getLoopedIndex(currentIndex: number, direction: 1 | -1, length: number): number {
  if (length <= 0) return 0;
  return (currentIndex + direction + length) % length;
}

export function findIndexById(ids: string[], id: string | null): number {
  if (!id) return -1;
  return ids.findIndex((itemId) => itemId === id);
}

export type UseLoopingCarouselIdsOptions = {
  ids: string[];
  activeId: string | null;
  onActiveIdChange: (nextId: string | null) => void;
};

export type UseLoopingCarouselIdsResult = {
  emblaRef: (node: HTMLElement | null) => void;
  emblaApi:
  | {
    selectedScrollSnap: () => number;
    scrollTo: (index: number, jump?: boolean) => void;
    scrollPrev: () => void;
    scrollNext: () => void;
    on: (event: 'select' | 'reInit', callback: () => void) => void;
    off: (event: 'select' | 'reInit', callback: () => void) => void;
  }
  | undefined;
  selectedIndex: number;
  moveBy: (direction: 1 | -1) => void;
};

export function useLoopingCarouselIds({
  ids,
  activeId,
  onActiveIdChange,
}: UseLoopingCarouselIdsOptions): UseLoopingCarouselIdsResult {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    loop: ids.length > 1,
    align: 'start',
  });

  React.useEffect(() => {
    if (!emblaApi) return;

    const syncFromEmbla = () => {
      const nextIndex = emblaApi.selectedScrollSnap();
      setSelectedIndex(nextIndex);

      if (ids.length > 0) {
        const nextId = ids[nextIndex] ?? null;
        onActiveIdChange(nextId);
      }
    };

    syncFromEmbla();
    emblaApi.on('select', syncFromEmbla);
    emblaApi.on('reInit', syncFromEmbla);

    return () => {
      emblaApi.off('select', syncFromEmbla);
      emblaApi.off('reInit', syncFromEmbla);
    };
  }, [emblaApi, ids, onActiveIdChange]);

  React.useEffect(() => {
    if (!emblaApi || ids.length === 0 || !activeId) return;

    const targetIndex = findIndexById(ids, activeId);
    if (targetIndex < 0) return;

    if (emblaApi.selectedScrollSnap() !== targetIndex) {
      emblaApi.scrollTo(targetIndex, true);
    }
  }, [activeId, emblaApi, ids]);

  const moveBy = React.useCallback(
    (direction: 1 | -1) => {
      if (ids.length <= 1) return;

      if (emblaApi) {
        if (direction === -1) {
          emblaApi.scrollPrev();
        } else {
          emblaApi.scrollNext();
        }
        return;
      }

      const nextIndex = getLoopedIndex(selectedIndex, direction, ids.length);
      const nextId = ids[nextIndex] ?? null;
      setSelectedIndex(nextIndex);
      onActiveIdChange(nextId);
    },
    [emblaApi, ids, onActiveIdChange, selectedIndex],
  );

  return {
    emblaRef,
    emblaApi,
    selectedIndex,
    moveBy,
  };
}
