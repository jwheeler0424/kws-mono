import type { TPropertyCard } from '@kws/schema';

import VirtualPropertyGrid from '@/components/global/virtual-property-grid';

interface PropertiesSectionProps {
  title: string;
  properties?: TPropertyCard[] | undefined;
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
  const items = properties ?? [];
  return (
    <VirtualPropertyGrid
      title={title}
      items={items}
      emptyText={emptyText}
      virtualization={virtualization}
    />
  );
}
