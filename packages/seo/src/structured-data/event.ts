import { jsonLd, type JsonLdBase } from './common';
import type { LocalBusinessAddress } from './local-business';
import type { ProductOfferInput } from './product';

export type EventLocation =
  | { name: string; address: LocalBusinessAddress }
  | { url: string }

export type EventSchemaInput = {
  name: string
  startDate: string
  endDate?: string
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled'
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode'
  location: EventLocation
  image?: string | string[]
  description?: string
  url?: string
  offers?: ProductOfferInput
}

function postalAddress(address: LocalBusinessAddress) {
  return { '@type': 'PostalAddress', ...address }
}

export function eventSchema(input: EventSchemaInput): JsonLdBase<'Event'> {
  return jsonLd({
    '@type': 'Event',
    name: input.name,
    startDate: input.startDate,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    ...(input.url ? { url: input.url } : {}),
    eventStatus: `https://schema.org/${input.eventStatus ?? 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${input.eventAttendanceMode ?? 'OfflineEventAttendanceMode'}`,
    location:
      'url' in input.location
        ? { '@type': 'VirtualLocation', url: input.location.url }
        : { '@type': 'Place', name: input.location.name, address: postalAddress(input.location.address) },
    ...(input.image ? { image: input.image } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.offers
      ? {
        offers: {
          '@type': 'Offer',
          price: input.offers.price,
          priceCurrency: input.offers.priceCurrency,
          availability: `https://schema.org/${input.offers.availability ?? 'InStock'}`,
          ...(input.offers.url ? { url: input.offers.url } : {}),
          ...(input.offers.priceValidUntil ? { priceValidUntil: input.offers.priceValidUntil } : {}),
        },
      }
      : {}),
  })
}