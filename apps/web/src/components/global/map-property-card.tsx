import type { TPropertyCard } from '@kws/schema';

import { PROPERTY_IMAGE_PLACEHOLDER_URL } from '@kws/config/constants/properties';
import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon, BathIcon, BedDoubleIcon, RulerDimensionLineIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getAddressCityStateZip,
  getAddressStreet,
  getBathroomCount,
  getLivingArea,
  getPropertyStatus,
  numberFormat,
  parseNwmBooleanFlag,
} from '@/lib/utils/properties';

import { Badge } from './badge';
import { ListingAttribution } from './listing-attribution';

export function MapPropertyCard({ listing }: { listing: TPropertyCard }) {
  const showAddress = listing.internetAddressDisplayYN && listing.NWM_ShowMapLink !== 'false';
  const streetAddress = showAddress ? getAddressStreet(listing) : '';
  const cityAddress = showAddress ? getAddressCityStateZip(listing) : '';
  const livingArea = getLivingArea(listing);
  const imageUrl =
    listing.primaryPhotoPreviewUrl ||
    listing.primaryPhotoFullUrl ||
    listing.primaryPhotoUrl ||
    PROPERTY_IMAGE_PLACEHOLDER_URL;
  const shouldHidePhoto =
    parseNwmBooleanFlag(listing.NWM_IDXMustRemovePhotosYN) ||
    parseNwmBooleanFlag(listing.NWM_IDXMustRemovePrimaryPhotoYN);
  const status = getPropertyStatus(listing.standardStatus ?? 'Coming Soon');
  const listingId = listing.listingId?.replace(/^\D+/, '') || listing.listingKey;
  const bathroomCount = getBathroomCount(listing);
  const price = Number(listing.listPrice ?? 0);

  return (
    <Link
      to={`/listings/$listingKey`}
      params={{ listingKey: listing.listingKey }}
      preload='intent'
      className={cn(
        'group flex w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-sm bg-white text-left no-underline! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900',
      )}
      onClick={(event) => event.stopPropagation()}>
      <div className='relative aspect-video w-full overflow-hidden bg-gray-200'>
        {!shouldHidePhoto ? (
          <img
            src={imageUrl}
            alt={streetAddress || 'Listed property'}
            loading='lazy'
            decoding='async'
            className='size-full object-cover transition-transform duration-200 ease-linear group-hover:scale-105'
          />
        ) : null}
        <Badge className='absolute top-0 right-0 rounded-none rounded-bl text-xs font-normal'>
          {status}
        </Badge>
      </div>

      <div className='space-y-2 p-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='min-w-0'>
            <h3 className='m-0! line-clamp-1 text-sm! leading-5! font-semibold! text-balance text-gray-900!'>
              {streetAddress ||
                listing.propertySubType ||
                listing.propertyType ||
                'Property listing'}
            </h3>
            {cityAddress ? (
              <p className='m-0! truncate! text-xs! leading-4! text-gray-600!'>{cityAddress}</p>
            ) : null}
          </div>
          <p className='m-0! shrink-0 text-base! leading-5! font-bold! text-gray-900!'>
            {price > 0 ? numberFormat({ value: price }) : 'Unavailable'}
          </p>
        </div>

        <div
          aria-label='Property details'
          className='flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2 text-xs text-gray-700'>
          {typeof listing.bedroomsTotal === 'number' ? (
            <span className='inline-flex items-center gap-1 whitespace-nowrap'>
              <BedDoubleIcon aria-hidden='true' className='size-4' />
              {listing.bedroomsTotal} bd
            </span>
          ) : null}
          {bathroomCount > 0 ? (
            <span className='inline-flex items-center gap-1 whitespace-nowrap'>
              <BathIcon aria-hidden='true' className='size-4' />
              {bathroomCount} ba
            </span>
          ) : null}
          {livingArea ? (
            <span className='inline-flex items-center gap-1 whitespace-nowrap'>
              <RulerDimensionLineIcon aria-hidden='true' className='size-4' />
              {numberFormat({
                value: livingArea.value,
                showSymbol: false,
                showSymbolSpace: false,
                showTrailingZeros: false,
              })}{' '}
              {livingArea.units ?? 'SqFt'}
            </span>
          ) : null}
        </div>

        <div className='flex w-full min-w-0 items-center gap-1.5 border-t border-gray-100 pt-2'>
          <img
            alt='NWMLS logo'
            src='/assets/images/Symbol-Color-NWMLS.jpg'
            width='50'
            height='30'
            className='h-auto w-6 shrink-0'
          />
          <span className='min-w-0 truncate text-xs font-medium text-gray-700'>
            MLS&reg; ID: {listingId}
          </span>
          <span className='ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-900'>
            View listing
            <ArrowUpRightIcon aria-hidden='true' className='size-3.5' />
          </span>
        </div>

        <div className='border-t border-gray-100 pt-2'>
          <ListingAttribution
            firm={listing.officeName}
            broker={listing.memberFullName}
            phone={listing.listAgentPreferredPhone}
            email={listing.listAgentEmail}
            buyerFirm={listing.buyerOfficeName}
            sold={listing.standardStatus === 'Closed'}
            prominence='sm'
          />
        </div>
      </div>
    </Link>
  );
}

export default MapPropertyCard;
