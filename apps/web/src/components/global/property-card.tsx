import type { TPropertyCard } from '@kws/types';

import { PROPERTY_IMAGE_PLACEHOLDER_URL } from '@kws/config/constants/properties';
import { Separator } from '@kws/design/ui/separator';
import { Link } from '@tanstack/react-router';
import { BathIcon, BedDoubleIcon, LayersIcon, MapPinnedIcon } from 'lucide-react';

import {
  PROPERTY_CARD_HEIGHT,
  PROPERTY_CARD_MAX_WIDTH,
} from '@/components/global/property-card.constants';
import { cn } from '@/lib/utils';
import {
  getAddressCityStateZip,
  getAddressStreet,
  getBathroomCount,
  getPropertyLevels,
  getPropertyStatus,
  getYearsOld,
  numberFormat,
} from '@/lib/utils/properties';

import { Badge } from './badge';
import { Button } from './button';

interface PropertyCardProps extends React.ComponentPropsWithRef<typeof Link> {
  listing: TPropertyCard;
  className?: string;
}

export function PropertyCard({ listing, className, ref }: PropertyCardProps) {
  const showAddress = listing.internetAddressDisplayYN && listing.NWM_ShowMapLink !== 'false';
  const cardImageUrl =
    listing.primaryPhotoPreviewUrl ||
    listing.primaryPhotoFullUrl ||
    listing.primaryPhotoUrl ||
    PROPERTY_IMAGE_PLACEHOLDER_URL;
  const cardStyles = {
    '--property-card-height': `${PROPERTY_CARD_HEIGHT}px`,
    '--property-card-width': `${PROPERTY_CARD_MAX_WIDTH}px`,
  } as React.CSSProperties;

  return (
    <Link
      to={`/listings/$listingKey`}
      params={{ listingKey: listing.listingKey }}
      preload='intent'
      className={cn(
        'group flex h-(--property-card-height) min-w-70 w-full max-w-(--property-card-width) flex-col rounded-none bg-white p-2 no-underline! shadow-md',
        className,
      )}
      style={cardStyles}
      onClick={(e) => e.stopPropagation()}
      ref={ref}>
      <>
        <section
          className={cn(
            'relative aspect-video h-auto w-full overflow-hidden rounded-t object-cover object-center',
          )}>
          {cardImageUrl &&
          listing.NWM_IDXMustRemovePhotosYN !== null &&
          listing.NWM_IDXMustRemovePhotosYN !== undefined &&
          Boolean(listing.NWM_IDXMustRemovePhotosYN) !== false &&
          listing.NWM_IDXMustRemovePrimaryPhotoYN !== null &&
          listing.NWM_IDXMustRemovePrimaryPhotoYN !== undefined &&
          Boolean(listing.NWM_IDXMustRemovePrimaryPhotoYN) !== false ? (
            <img
              src={cardImageUrl}
              alt={listing.unparsedAddress ?? 'Property Photo'}
              sizes='400px, (min-width: 768px) 600px'
              loading='lazy'
              className={cn(
                'flex h-full w-full items-center justify-center bg-gray-700 object-cover object-center text-center leading-[100%] transition-transform duration-200 ease-linear group-hover:scale-110',
              )}
            />
          ) : null}
          <Badge
            className={cn('absolute top-0 right-0 rounded-none rounded-bl text-xs font-normal')}>
            {getPropertyStatus(listing.standardStatus ?? 'Coming Soon')}
          </Badge>
          <aside className='absolute bottom-0 left-0 h-auto w-full bg-black/25 p-1'>
            <p className='m-0 max-w-full text-xs whitespace-normal text-white'>
              Provided by NWMLS, {listing.officeName ?? listing.memberFullName}
            </p>
          </aside>
        </section>
        <main className={cn('w-full rounded-b border border-t-0 border-gray-100/50 p-2')}>
          <header className={cn('w-full space-y-2')}>
            <p
              className={cn(
                'm-0! truncate! overflow-hidden! text-[11px]! font-medium! text-gray-300 uppercase!',
              )}>
              {listing.propertySubType ?? listing.propertyType}
              {listing.yearBuilt ? ` • ${getYearsOld(listing.yearBuilt)}` : null}
            </p>
            <h3 className={cn('font-sans! font-semibold! tracking-normal! text-gray-900')}>
              {listing.internetAutomatedValuationDisplayYN === false
                ? 'Unavailable'
                : numberFormat({ value: parseInt(listing.listPrice ?? '0') })}
            </h3>
            <div
              aria-hidden={!showAddress}
              className={cn(
                'flex h-10 items-start justify-start gap-1.5 text-xs',
                showAddress ? 'visible' : 'invisible',
              )}>
              <MapPinnedIcon className={'inline-block size-5 text-gray-700'} />
              <p
                className={cn(
                  'm-0! flex flex-col truncate! overflow-hidden! text-xs! leading-5! text-gray-700!',
                )}>
                <span className={'truncate!'}>
                  {showAddress ? getAddressStreet(listing) : '\u00a0'}
                </span>
                <span>{showAddress ? getAddressCityStateZip(listing) : '\u00a0'}</span>
              </p>
            </div>
            <div className={cn('flex items-center justify-start gap-1.5')}>
              <div className={cn('flex items-center justify-end gap-1')}>
                <img
                  alt='MLS Logo'
                  src='/assets/images/Symbol-Color-NWMLS.jpg'
                  width='50'
                  height='30'
                  className='h-auto w-5'
                />
              </div>
              <div className={cn('m-0 text-xs font-medium text-gray-700 uppercase')}>
                MLS&reg;: {listing.listingId?.replace(/^\D+/g, '')}
              </div>
            </div>
          </header>
          <Separator orientation='horizontal' className={cn('my-3! bg-gray-100/50')} />
          <article className={cn('flex justify-evenly gap-2 text-gray-900 @sm:gap-4')}>
            <section className={cn('flex flex-col')}>
              <div className={cn('flex items-center justify-start gap-1! text-xs! leading-4!')}>
                <BedDoubleIcon className={'inline-block size-5 text-gray-700'} />
                <span>{listing.bedroomsTotal}</span>
              </div>
              <p className={cn('m-0! text-[11px]! font-medium! text-gray-700')}>Beds</p>
            </section>
            <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
            <section className={cn('flex flex-col')}>
              <div className={cn('flex items-center justify-start gap-1 text-xs! leading-4')}>
                <BathIcon className={'inline-block size-5 text-gray-700'} />
                <span>{getBathroomCount(listing)}</span>
              </div>
              <p className={cn('m-0! text-[11px]! font-medium! text-gray-700')}>Baths</p>
            </section>
            <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
            <section className={cn('flex flex-col')}>
              <div className={cn('flex items-center justify-start gap-1 text-xs! leading-4')}>
                <LayersIcon className={'inline-block size-5 text-gray-700'} />
                <span>{getPropertyLevels(listing.levels) ?? '1'}</span>
              </div>
              <p className={cn('m-0! text-[11px]! font-medium! text-gray-700')}>Levels</p>
            </section>
          </article>
          <Separator orientation='horizontal' className={cn('my-3 bg-gray-100/50')} />
          <section className={cn('flex items-center justify-between px-0.5')}>
            <div className={cn('m-0! text-[11px]! font-medium! text-gray-300 uppercase!')}>
              Area Size
            </div>
            <div className={cn('flex items-center justify-end gap-1')}>
              <span className={cn('text-xs! font-semibold! text-gray-700!')}>
                {numberFormat({
                  value: parseInt(listing.livingArea ?? '0'),
                  showSymbol: false,
                  showSymbolSpace: false,
                  showTrailingZeros: false,
                })}
              </span>
              <span className={cn('m-0! text-[11px]! font-medium! text-gray-300')}>
                {listing.livingAreaUnits ?? 'SqFt'}
              </span>
            </div>
          </section>
        </main>
        <footer className={cn('flex w-full items-center justify-end pt-2')}>
          <Button
            data-type='property-card-cta'
            data-property={listing.listingId}
            variant={'outlinePrimary'}
            size={'sm'}
            className={cn(
              'w-full rounded shadow drop-shadow-none group-hover:bg-polaris-primary group-hover:text-white',
            )}
            onClick={(e) => e.stopPropagation()}>
            View Property
          </Button>
        </footer>
      </>
    </Link>
  );
}

export default PropertyCard;
