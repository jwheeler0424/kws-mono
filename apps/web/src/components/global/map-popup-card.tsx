import { useQuery } from '@tanstack/react-query';

import { markerCardByListingKeyOptions } from '@/features/mls/options/search';

import PropertyCard from './property-card';
import PropertyCardSkeleton from './property-card-skeleton';

export function MapPopupCard({ listingKey }: { listingKey: string }) {
  const { data, isPending, isError } = useQuery(markerCardByListingKeyOptions(listingKey));

  if (isPending && !data) {
    return <PropertyCardSkeleton className='w-full max-w-none' />;
  }

  if (isError && !data) {
    return <div className='w-72 p-3 text-sm text-gray-700'>Property details unavailable.</div>;
  }

  if (!data) {
    return <div className='w-72 p-3 text-sm text-gray-700'>Property details unavailable.</div>;
  }

  return <PropertyCard listing={data} className='z-9998 cursor-pointer' />;
}

export default MapPopupCard;
