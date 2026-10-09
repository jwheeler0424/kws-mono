import { Separator } from '@kws/design/ui/separator';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { formatInTimeZone } from 'date-fns-tz';
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
import { ListingAttribution } from '@/components/global/listing-attribution';
import PropertyMap from '@/components/global/map-wrapper';
import { PropertySlideshow } from '@/components/global/property-slideshow';
import { listingDetailOptions } from '@/features/mls/options';
import { useSeo } from '@/lib/tools';
import { cn } from '@/lib/utils';
import {
  getAddressCityStateZip,
  getAddressStreet,
  getBathroomCount,
  getBedroomCount,
  getLivingArea,
  getPropertyLevels,
  getPropertyStatus,
  getPropertyStatusClassName,
  numberFormat,
  parseNwmBooleanFlag,
} from '@/lib/utils/properties';

export const Route = createFileRoute('/listings/$listingKey')({
  loader: async ({ context, params }) => {
    const property = await context.queryClient.ensureQueryData(
      listingDetailOptions({ listingKey: params.listingKey }),
    );
    return { property, siteConfig: context.siteConfig };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };

    const { seo } = useSeo(loaderData.siteConfig);
    const property = loaderData.property;
    const listingId = property?.listingId?.replace(/^\D+/, '');
    const title =
      property?.internetAddressDisplayYN === false
        ? `Seattle Listing${listingId ? ` ${listingId}` : ''}`
        : property?.unparsedAddress || 'Seattle Property Listing';

    return {
      meta: [
        ...seo({
          title,
          description:
            property?.publicRemarks?.slice(0, 160) ??
            'View property details and photos in Seattle.',
        }),
      ],
    };
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
  const shouldHidePhotos =
    parseNwmBooleanFlag(property.NWM?.NWM_IDXMustRemovePhotosYN) ||
    parseNwmBooleanFlag(property.NWM?.NWM_IDXMustRemovePrimaryPhotoYN);
  const livingArea = getLivingArea({ ...property, ...property.NWM });

  return (
    <main className='w-full'>
      <section className='relative w-full'>
        {!shouldHidePhotos ? (
          <PropertySlideshow
            media={property.media}
            className='relative h-full w-full bg-gray-700 object-center'
            autoplay
          />
        ) : null}
      </section>
      <header
        className={cn(
          'page-content relative flex flex-col items-start justify-between gap-6 text-white md:flex-row md:gap-8',
        )}>
        <section className={cn('flex w-full flex-col')}>
          <main className={cn('-ml-px flex h-fit flex-col gap-1')}>
            <h1 className={cn('m-0! font-sans! text-2xl! font-bold! text-gray-900!')}>
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
                  getPropertyStatusClassName(propertyStatus),
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
                  {livingArea === null
                    ? 'Not listed'
                    : numberFormat({
                        value: livingArea.value,
                        showSymbol: false,
                        showSymbolSpace: false,
                        showTrailingZeros: false,
                      })}
                </span>
              </div>
              <p className={cn('m-0! text-center text-xs! font-medium text-gray-900')}>
                {livingArea === null ? 'Area Size' : (livingArea.units ?? 'Sq. Ft.')}
              </p>
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
            'flex h-fit w-full min-w-0 flex-col items-start gap-2 py-1 md:my-4 md:max-w-80',
          )}>
          <ListingAttribution
            firm={property.listOfficeName}
            broker={property.listAgentFullName}
            phone={property.listAgentPreferredPhone}
            email={property.listAgentEmail}
            buyerFirm={property.buyerOfficeName}
            sold={property.standardStatus === 'Closed'}
          />
          <Link
            to='/contact'
            search={{
              listingKey: property.listingKey,
              address:
                property.internetAddressDisplayYN === false
                  ? `MLS# ${property.listingId?.replace(/^\D+/g, '')}`
                  : `${getAddressStreet(property)}, ${getAddressCityStateZip(property)}`,
            }}
            variant={'outlinePrimary'}
            size={'md'}
            className={cn('ml-0.5 drop-shadow-none')}>
            Request Info
          </Link>
        </aside>
      </header>
      <section
        className={cn(
          'page-content flex h-full flex-col items-start justify-between gap-8 pt-0 md:flex-row-reverse',
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
                'mt-4! font-sans! text-3xl! font-bold! tracking-normal! text-gray-900!',
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
                className={cn('font-sans! text-base! font-bold! tracking-normal! text-gray-900!')}>
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
                    {property.onMarketDate
                      ? formatInTimeZone(
                          property.onMarketDate,
                          'America/Los_Angeles',
                          'MMMM d, yyyy',
                        )
                      : 'Not provided'}
                  </span>
                  <br />
                  <span className={cn('text-xs! font-medium! text-gray-400! uppercase!')}>
                    Listed
                  </span>
                </section>
                <section>
                  <span className={cn('font-semibold! text-gray-900!')}>
                    {property.modificationTimestamp
                      ? formatInTimeZone(
                          property.modificationTimestamp,
                          'America/Los_Angeles',
                          'MMMM d, yyyy',
                        )
                      : 'Not provided'}
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
                      'font-sans! text-base! font-bold! tracking-normal! text-gray-900!',
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
