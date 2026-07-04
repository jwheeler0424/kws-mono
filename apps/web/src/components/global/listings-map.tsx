import type { TListingMarker } from '@kws/types';

import { ClientOnly } from '@tanstack/react-router';
import { BeatLoader } from 'react-spinners';

import { MapView } from './map';

export function ListingsMap({
  markers,
  markersLoading = false,
}: {
  markers: TListingMarker[];
  markersLoading?: boolean;
}) {
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
