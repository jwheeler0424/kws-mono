import { jsonLd, type JsonLdBase } from './common';
import type { LocalBusinessAddress } from './local-business';

export type OpenHouseLocation =
  | { name: string; address: LocalBusinessAddress }
  | { url: string }

export type OpenHouseSchemaInput = {
  name: string
  url: string
  startDate: string
  endDate?: string
  location: OpenHouseLocation
  description?: string
  image?: string | string[]
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled'
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode'
  offers?: {
    price?: number | string
    priceCurrency?: string
    url?: string
  }
  /** Optional if you have recurring open houses. */
  eventSchedule?: {
    repeatFrequency: string
    startTime?: string
    endTime?: string
    byDay?: string[]
    byMonthDay?: number[]
    scheduleTimezone?: string
  }
}

function postalAddress(address: LocalBusinessAddress) {
  return { '@type': 'PostalAddress', ...address }
}

export function openHouseSchema(input: OpenHouseSchemaInput): JsonLdBase<'Event'> {
  return jsonLd({
    '@type': 'Event',
    name: input.name,
    url: input.url,
    startDate: input.startDate,
    ...(input.endDate ? { endDate: input.endDate } : {}),
    location:
      'url' in input.location
        ? { '@type': 'VirtualLocation', url: input.location.url }
        : { '@type': 'Place', name: input.location.name, address: postalAddress(input.location.address) },
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    eventStatus: `https://schema.org/${input.eventStatus ?? 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${input.eventAttendanceMode ?? 'OfflineEventAttendanceMode'}`,
    ...(input.offers
      ? {
        offers: {
          '@type': 'Offer',
          ...(input.offers.price !== undefined ? { price: input.offers.price } : {}),
          ...(input.offers.priceCurrency ? { priceCurrency: input.offers.priceCurrency } : {}),
          ...(input.offers.url ? { url: input.offers.url } : {}),
        },
      }
      : {}),
    ...(input.eventSchedule
      ? {
        eventSchedule: {
          '@type': 'Schedule',
          ...input.eventSchedule,
        },
      }
      : {}),
  })
}