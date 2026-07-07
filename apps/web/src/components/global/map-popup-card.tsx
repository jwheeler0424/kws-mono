import { useQuery } from '@tanstack/react-query';

import { propertyByListingKeyOptions } from '@/features/mls/options/properties';

import PropertyCard from './property-card';
import PropertyCardSkeleton from './property-card-skeleton';

export function MapPopupCard({ listingKey }: { listingKey: string }) {
  const { data, isLoading } = useQuery({
    ...propertyByListingKeyOptions({ listingKey }),
    staleTime: 0,
    gcTime: 0,
    retry: 0,
  });

  if (isLoading) {
    return <PropertyCardSkeleton className='w-full max-w-none' />;
  }

  if (!data) {
    return <div className='w-72 p-3 text-sm text-gray-700'>Property details unavailable.</div>;
  }

  return <PropertyCard listing={data} className='z-9998 cursor-pointer' />;
}

export default MapPopupCard;
