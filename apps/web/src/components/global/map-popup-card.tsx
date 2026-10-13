import { useQuery } from '@tanstack/react-query';

import { propertyByListingKeyOptions } from '@/features/mls/options/properties';

import MapPropertyCard from './map-property-card';

function MapPropertyCardSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-label='Loading property details'
      className='w-full overflow-hidden rounded-sm bg-white p-2 shadow-md'>
      <div className='aspect-video animate-pulse rounded-sm bg-gray-200' />
      <div className='space-y-3 p-2'>
        <div className='h-4 w-3/4 animate-pulse rounded bg-gray-200' />
        <div className='h-3 w-1/2 animate-pulse rounded bg-gray-200' />
        <div className='h-px w-full bg-gray-100' />
        <div className='h-4 w-2/3 animate-pulse rounded bg-gray-200' />
        <div className='h-px w-full bg-gray-100' />
        <div className='h-3 w-5/6 animate-pulse rounded bg-gray-200' />
        <div className='h-3 w-2/3 animate-pulse rounded bg-gray-200' />
      </div>
    </div>
  );
}

export function MapPopupCard({ listingKey }: { listingKey: string }) {
  const { data, isLoading } = useQuery({
    ...propertyByListingKeyOptions({ listingKey }),
    staleTime: 0,
    gcTime: 0,
    retry: 0,
  });

  if (isLoading) {
    return <MapPropertyCardSkeleton />;
  }

  if (!data) {
    return <div className='w-72 p-3 text-sm text-gray-700'>Property details unavailable.</div>;
  }

  return <MapPropertyCard listing={data} />;
}

export default MapPopupCard;
