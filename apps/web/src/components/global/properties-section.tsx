import type { PropertyCardPageResult } from '@/packages/mls/queries/property-cards.queries';
import type { TPropertyCard } from '@/types/property';

import VirtualPropertyGrid from '@/components/global/virtual-property-grid';

interface PropertiesSectionProps {
  title: string;
  properties?: PropertyCardPageResult<TPropertyCard> | undefined;
  emptyText?: string;
  virtualization?: {
    threshold?: number;
    rowEstimate?: number;
    getOverscanRows?: (columns: number) => number;
  };
}

export default function PropertiesSection({
  properties,
  title,
  emptyText,
  virtualization,
}: PropertiesSectionProps) {
  const items = properties?.items ?? [];
  return (
    <VirtualPropertyGrid
      title={title}
      items={items}
      emptyText={emptyText}
      virtualization={virtualization}
    />
  );
}
