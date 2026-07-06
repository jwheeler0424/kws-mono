import type { PropertyListing } from '@kws/types';
import type { ColumnDef, RowData } from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  //allows us to define custom properties for our columns
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'range' | 'select';
  }
}

export type PropertySearchMarker = Pick<
  PropertyListing,
  | 'listingKey'
  | 'listPrice'
  | 'bedroomsTotal'
  | 'bathroomsTotalInteger'
  | 'livingArea'
  | 'latitude'
  | 'longitude'
>;

export const columns: ColumnDef<PropertySearchMarker>[] = [
  {
    accessorKey: 'listingKey',
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    accessorKey: 'listPrice',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
  {
    accessorKey: 'bedroomsTotal',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
  {
    accessorKey: 'bathroomsTotalInteger',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
  {
    accessorKey: 'livingArea',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
  {
    accessorKey: 'latitude',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
  {
    accessorKey: 'longitude',
    sortingFn: 'alphanumeric',
    filterFn: 'inNumberRange',
    meta: {
      filterVariant: 'range',
    },
  },
];
