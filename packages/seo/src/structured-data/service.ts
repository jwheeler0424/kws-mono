import type { AggregateRatingSchemaInput } from './aggregate-rating'
import { jsonLd, type JsonLdBase, type JsonLdNode, withoutContext } from './common'
import type { ReviewSchemaInput } from './review'

export type ServiceOfferInput = {
  price: number | string
  priceCurrency: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'LimitedAvailability'
  url?: string
  priceValidUntil?: string
}

export type ServiceProviderInput =
  | JsonLdBase<'Organization' | 'LocalBusiness' | 'RealEstateAgent'>
  | {
    name: string
    url?: string
  }

export type ServiceAreaInput = string | string[]

export type ServiceSchemaInput = {
  name: string
  description?: string
  serviceType?: string
  provider?: ServiceProviderInput
  areaServed?: ServiceAreaInput
  image?: string | string[]
  url?: string
  offers?: ServiceOfferInput
  review?: ReviewSchemaInput | JsonLdBase<'Review'> | Array<ReviewSchemaInput | JsonLdBase<'Review'>>
  aggregateRating?: AggregateRatingSchemaInput | JsonLdBase<'AggregateRating'>
  audience?: {
    audienceType?: string
    name?: string
  }
}

function buildProvider(provider: ServiceProviderInput): Record<string, unknown> {
  if ('@type' in provider) {
    return withoutContext(provider)
  }

  return {
    '@type': 'Organization',
    name: provider.name,
    ...(provider.url ? { url: provider.url } : {}),
  }
}

function buildReviews(
  review: ServiceSchemaInput['review'],
): Array<Record<string, unknown>> | Record<string, unknown> | undefined {
  if (!review) return undefined

  const items = Array.isArray(review) ? review : [review]
  const normalized = items.map((item) => ('@type' in item ? withoutContext(item) : item))
  return Array.isArray(review) ? normalized : normalized[0]
}

export function serviceSchema(input: ServiceSchemaInput): JsonLdBase<'Service'> {
  return jsonLd({
    '@type': 'Service',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.provider ? { provider: buildProvider(input.provider) } : {}),
    ...(input.areaServed
      ? {
        areaServed: Array.isArray(input.areaServed) ? input.areaServed : [input.areaServed],
      }
      : {}),
    ...(input.offers
      ? {
        offers: {
          '@type': 'Offer',
          price: input.offers.price,
          priceCurrency: input.offers.priceCurrency,
          ...(input.offers.availability ? { availability: `https://schema.org/${input.offers.availability}` } : {}),
          ...(input.offers.url ? { url: input.offers.url } : {}),
          ...(input.offers.priceValidUntil ? { priceValidUntil: input.offers.priceValidUntil } : {}),
        },
      }
      : {}),
    ...(input.review ? { review: buildReviews(input.review) } : {}),
    ...(input.aggregateRating
      ? {
        aggregateRating: '@type' in input.aggregateRating
          ? withoutContext(input.aggregateRating)
          : {
            '@type': 'AggregateRating',
            ratingValue: input.aggregateRating.ratingValue,
            reviewCount: input.aggregateRating.reviewCount,
            ...(input.aggregateRating.bestRating !== undefined ? { bestRating: input.aggregateRating.bestRating } : {}),
            ...(input.aggregateRating.worstRating !== undefined ? { worstRating: input.aggregateRating.worstRating } : {}),
            ...(input.aggregateRating.ratingExplanation
              ? { ratingExplanation: input.aggregateRating.ratingExplanation }
              : {}),
          },
      }
      : {}),
    ...(input.audience
      ? {
        audience: {
          '@type': 'Audience',
          ...(input.audience.audienceType ? { audienceType: input.audience.audienceType } : {}),
          ...(input.audience.name ? { name: input.audience.name } : {}),
        },
      }
      : {}),
  })
}

export type ServiceSchema = JsonLdNode & { '@type': 'Service' }