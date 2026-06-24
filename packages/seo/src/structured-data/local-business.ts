import { jsonLd, type JsonLdBase } from './common'

export type LocalBusinessAddress = {
  streetAddress: string
  addressLocality: string
  addressRegion?: string
  postalCode: string
  addressCountry: string
}

export type OpeningHoursSpecificationInput = {
  dayOfWeek: string | string[]
  opens: string
  closes: string
}

export type LocalBusinessSchemaInput = {
  name: string
  image?: string | string[]
  url?: string
  telephone?: string
  priceRange?: string
  address: LocalBusinessAddress
  geo?: { latitude: number; longitude: number }
  /** Simple opening hours text patterns, e.g. `["Mo-Fr 09:00-17:00", "Sa 10:00-14:00"]`. */
  openingHours?: string[]
  /** More structured opening hours. */
  openingHoursSpecification?: OpeningHoursSpecificationInput[]
  contactPoint?: { telephone: string; contactType: string; email?: string; areaServed?: string }
}

function postalAddress(address: LocalBusinessAddress) {
  return { '@type': 'PostalAddress', ...address }
}

function geoCoordinates(geo?: { latitude: number; longitude: number }) {
  return geo ? { geo: { '@type': 'GeoCoordinates', ...geo } } : {}
}

export function localBusinessSchema(input: LocalBusinessSchemaInput): JsonLdBase<'LocalBusiness'> {
  return jsonLd({
    '@type': 'LocalBusiness',
    name: input.name,
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
    address: postalAddress(input.address),
    ...geoCoordinates(input.geo),
    ...(input.openingHours?.length ? { openingHours: input.openingHours } : {}),
    ...(input.openingHoursSpecification?.length
      ? {
        openingHoursSpecification: input.openingHoursSpecification.map((hours) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: hours.dayOfWeek,
          opens: hours.opens,
          closes: hours.closes,
        })),
      }
      : {}),
    ...(input.contactPoint
      ? {
        contactPoint: {
          '@type': 'ContactPoint',
          ...input.contactPoint,
        },
      }
      : {}),
  })
}