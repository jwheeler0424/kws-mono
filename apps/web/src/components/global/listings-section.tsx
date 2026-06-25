import type { CursorResult, TPropertyCard } from '@kws/types';

import VirtualPropertyGrid from '@/components/global/virtual-property-grid';

interface ListingsSectionProps {
  title: string;
  properties?: CursorResult<TPropertyCard> | undefined;
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

export default function ListingsSection({
  properties,
  title,
  emptyText,
  pageSize = 48,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  virtualization,
}: ListingsSectionProps) {
  const items = properties?.items ?? [];

  return (
    <VirtualPropertyGrid
      title={title}
      items={items}
      emptyText={emptyText}
      pageSize={pageSize}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      virtualization={virtualization}
    />
  );
}
