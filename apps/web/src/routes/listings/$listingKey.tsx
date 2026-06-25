import { Separator } from '@kws/design/ui/separator';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  BathIcon,
  BedDoubleIcon,
  CircleCheckBigIcon,
  HammerIcon,
  LayersIcon,
  MapPinnedIcon,
  RulerDimensionLineIcon,
} from 'lucide-react';

import { Badge } from '@/components/global/badge';
import { Link } from '@/components/global/link';
import PropertyMap from '@/components/global/map-wrapper';
import { PropertySlideshow } from '@/components/global/property-slideshow';
import { listingDetailOptions } from '@/features/mls/options';
import { cn } from '@/lib/utils';
import {
  getAddressCityStateZip,
  getAddressStreet,
  getBathroomCount,
  getBedroomCount,
  getPropertyLevels,
  getPropertyStatus,
  numberFormat,
} from '@/lib/utils/properties';
// import { prefetchListingMediaServerFn } from '@/packages/mls/media-sync.service';
// import { propertyDetailByListingKeyOptions } from '@/packages/mls/search.options';

export const Route = createFileRoute('/listings/$listingKey')({
  loader: async ({ context, params }) => {
    // void prefetchListingMediaServerFn({
    //   data: { listingKey: params.listingKey },
    // }).catch(() => undefined);

    return context.queryClient.ensureQueryData(
      listingDetailOptions({ listingKey: params.listingKey }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { listingKey } = Route.useParams();
  const { data: property } = useSuspenseQuery(listingDetailOptions({ listingKey }));

  if (!property) {
    return <div className='p-6 text-sm text-gray-700'>Property details unavailable.</div>;
  }

  const propertyStatus = getPropertyStatus(property.standardStatus ?? 'Coming Soon');

  return (
    <main className='w-full'>
      <section className='relative w-full'>
        {property.NWM?.NWM_IDXMustRemovePhotosYN !== null &&
        property.NWM?.NWM_IDXMustRemovePhotosYN !== undefined &&
        Boolean(property.NWM?.NWM_IDXMustRemovePhotosYN) !== false &&
        property.NWM?.NWM_IDXMustRemovePrimaryPhotoYN !== null &&
        property.NWM?.NWM_IDXMustRemovePrimaryPhotoYN !== undefined &&
        Boolean(property.NWM?.NWM_IDXMustRemovePrimaryPhotoYN) !== false ? (
          <PropertySlideshow
            media={property.media}
            className='relative h-full w-full bg-gray-700 object-center'
          />
        ) : null}
      </section>
      <header
        className={cn(
          'relative mx-auto flex h-full w-11/12 flex-col items-start justify-between px-2 text-white md:flex-row md:gap-4 md:px-5 2xl:px-12',
        )}>
        <section className={cn('my-2 flex w-full flex-col mdmb:mb-4')}>
          <article className={cn('h-8 w-full text-sm! text-gray-400! mddt:mb-2 xldt:mb-4')}>
            Provided by NWMLS, Listed by {property.listOfficeName ?? property.listAgentFullName}
          </article>
          <main className={cn('-ml-px flex h-fit flex-col gap-1')}>
            <h1 className={cn('m-0! font-sans! text-2xl! font-medium! text-gray-900!')}>
              {property.internetAddressDisplayYN === false
                ? 'Unavailable'
                : getAddressStreet(property)}
            </h1>
            <article className={cn('m-0 flex w-full items-center gap-4 text-gray-900')}>
              <div className={cn('flex items-center gap-2')}>
                <MapPinnedIcon className='size-5 text-gray-700' />
                {getAddressCityStateZip(property)}
              </div>
              <Badge
                className={cn(
                  'font-semibold text-white',
                  propertyStatus === 'Available' && 'bg-green-600',
                  propertyStatus === 'Pending' && 'bg-orange-500',
                )}>
                {propertyStatus}
              </Badge>
            </article>
          </main>
          <article
            className={cn(
              'mt-4 flex h-12 w-fit origin-top-left scale-75 items-center justify-start gap-4 text-gray-900 xsmb:scale-[.8] smmb:scale-[.85] mdmb:scale-90 lgmb:scale-95 2xstb:scale-100',
            )}>
            <section className={cn('flex flex-col gap-1')}>
              <div className={cn('flex items-center justify-start gap-1 text-sm leading-4')}>
                <RulerDimensionLineIcon className='size-6 text-gray-900' />
                <span>
                  {numberFormat({
                    value: parseInt(property.livingArea ?? '0'),
                    showSymbol: false,
                    showSymbolSpace: false,
                    showTrailingZeros: false,
                  })}
                </span>
              </div>
              <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>Sq. Ft.</p>
            </section>
            <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
            <section className={cn('flex flex-col gap-1')}>
              <div className={cn('flex items-center justify-start gap-1 text-sm leading-4')}>
                <BedDoubleIcon className='size-6 text-gray-700' />
                <span>{getBedroomCount(property)}</span>
              </div>
              <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>Beds</p>
            </section>
            <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
            <section className={cn('flex flex-col gap-1')}>
              <div className={cn('flex items-center justify-start gap-1 text-sm leading-4')}>
                <BathIcon className='size-6 text-gray-700' />
                <span>{getBathroomCount(property)}</span>
              </div>
              <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>Baths</p>
            </section>
            <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
            <section className={cn('flex flex-col gap-1')}>
              <div className={cn('flex items-center justify-start gap-1 text-sm leading-4')}>
                <LayersIcon className='size-6 text-gray-700' />
                <span>{getPropertyLevels(property.levels) ?? '1'}</span>
              </div>
              <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>Levels</p>
            </section>
            {property.yearBuilt ? (
              <>
                {' '}
                <Separator orientation='vertical' className={cn('bg-gray-100/50')} />
                <section className={cn('flex flex-col gap-1')}>
                  <div className={cn('flex items-center justify-start gap-1 text-sm leading-4')}>
                    <HammerIcon className='size-6 text-gray-900' />
                    <span>{property.yearBuilt}</span>
                  </div>
                  <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>Built</p>
                </section>
              </>
            ) : null}
          </article>
        </section>
        <aside
          className={cn(
            'flex h-fit w-full items-start justify-start gap-1 py-1 sm:w-fit sm:justify-end md:my-4 md:mt-8 lgtb:mt-9 xsdt:mt-9.5 smdt:mt-11.5 xldt:mt-12',
          )}>
          <Link
            href={'/contact?property=' + property.listingId}
            variant={'outlinePrimary'}
            size={'md'}
            className={cn('ml-0.5 drop-shadow-none')}>
            Request Info
          </Link>
        </aside>
      </header>
      <section
        className={cn(
          'mx-auto mt-8 flex h-full w-11/12 flex-col items-start justify-between gap-8 px-2 md:flex-row-reverse md:px-5 2xl:px-12',
        )}>
        {/* Map Component */}
        <div className={cn('aspect-5/6 h-full max-h-80 w-full px-0.5 lg:basis-2/5')}>
          <div
            className={cn(
              'relative mx-auto h-full w-full grow rounded-sm',
              'border border-gray-100/50 shadow-md',
            )}>
            <PropertyMap
              propertyPosition={[Number(property.latitude), Number(property.longitude)]}
            />
          </div>
        </div>
        <div className={cn('flex w-full flex-col gap-1 lg:basis-3/5')}>
          <article className={cn('w-full')}>
            <p
              className={cn(
                'm-0! truncate! overflow-hidden! text-xs! font-medium! text-gray-400! uppercase!',
              )}>
              {property.propertySubType ?? property.propertyType}
            </p>
            <h2
              className={cn(
                'mt-4! font-sans! text-3xl! font-semibold! tracking-normal! text-gray-900!',
              )}>
              {property.internetAutomatedValuationDisplayYN === false
                ? 'Unavailable'
                : property.listPrice
                  ? numberFormat({ value: Number(property.listPrice) })
                  : 'Unavailable'}
            </h2>
          </article>
          <section className={cn('flex w-full flex-col gap-10')}>
            <article className={cn('w-full')}>
              <h3
                className={cn(
                  'font-sans! text-base! font-semibold! tracking-normal! text-gray-900!',
                )}>
                Property Description
              </h3>
              <p className={cn('mt-2! pr-2 pl-0 text-base!')}>{property.publicRemarks}</p>
              <div
                className={cn(
                  'grid-rows-auto mt-4 mb-0 grid list-none grid-cols-1 flex-wrap gap-4 pr-2 pl-0 text-base sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2',
                )}>
                <section>
                  <span className={cn('font-semibold! text-gray-900!')}>
                    {property.listingId?.replace(/^\D+/g, '')}
                  </span>
                  <br />
                  <span className={cn('text-xs! font-medium! text-gray-400! uppercase!')}>
                    MLS&reg; ID
                  </span>
                </section>
                <section>
                  <span className={cn('font-semibold! text-gray-900!')}>
                    {format(property.onMarketDate ?? new Date(), 'MMMM d, yyyy')}
                  </span>
                  <br />
                  <span className={cn('text-xs! font-medium! text-gray-400! uppercase!')}>
                    Listed
                  </span>
                </section>
                <section>
                  <span className={cn('font-semibold! text-gray-900!')}>
                    {format(property.modificationTimestamp!, 'MMMM d, yyyy')}
                  </span>
                  <br />
                  <span className={cn('text-xs! font-medium! text-gray-400! uppercase!')}>
                    Updated
                  </span>
                </section>
              </div>
            </article>
            {property.interiorFeatures &&
              property.interiorFeatures.length > 0 &&
              property.interiorFeatures[0] !== 'None' && (
                <article className={cn('w-full')}>
                  <h3
                    className={cn(
                      'font-sans! text-base! font-semibold! tracking-normal! text-gray-900!',
                    )}>
                    Interior Features
                  </h3>
                  <ul
                    className={cn(
                      'grid-rows-auto mt-4 mb-0 grid list-none grid-cols-1 flex-wrap gap-4 pr-2 pl-0 text-base sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2',
                    )}>
                    {property.interiorFeatures.map((feature) => (
                      <li
                        key={feature}
                        className={cn('m-0! flex w-full items-start justify-start gap-2')}>
                        <CircleCheckBigIcon className='size-5 text-gray-900' />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              )}
          </section>
        </div>
      </section>
    </main>
  );
}
