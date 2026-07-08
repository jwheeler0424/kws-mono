import type { TListingsSearch } from '@kws/types';

import { useQuery } from '@tanstack/react-query';
import { ClientOnly } from '@tanstack/react-router';
import React from 'react';
import { BeatLoader } from 'react-spinners';

import { listingsForSearchAndFilterOptions } from '@/features/mls/options/listings';

import { MapView } from './map';

export function ListingsMap({ search }: { search: Partial<TListingsSearch> }) {
  const { data, isPending, isFetching } = useQuery(listingsForSearchAndFilterOptions(search));
  const markers = React.useMemo(() => data?.markers || [], [data]);
  const markersLoading = isPending || isFetching;
  return (
    <div className='relative h-[60vh] w-full overflow-hidden portrait:h-[60vh] landscape:h-[60vh] landscape:lg:h-[calc(80vh-4rem)]'>
      <ClientOnly
        fallback={
          <main className='flex h-full w-full flex-1 items-center justify-center py-20'>
            <BeatLoader color='#ff0000' loading={true} size={15} />
          </main>
        }>
        <MapView properties={markers} markersLoading={markersLoading} />
      </ClientOnly>
    </div>
  );
}

export default ListingsMap;
