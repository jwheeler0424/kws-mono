import { jsonLd, type JsonLdBase, type JsonLdNode, withoutContext } from './common'

export type ReviewAuthorInput = {
  name: string
  url?: string
  type?: 'Person' | 'Organization'
}

export type ReviewItemReviewedInput = JsonLdBase | {
  name: string
  url?: string
  type?: string
}

export type ReviewSchemaInput = {
  author: ReviewAuthorInput
  reviewBody?: string
  reviewRating: number | string
  bestRating?: number | string
  worstRating?: number | string
  datePublished?: string
  name?: string
  itemReviewed?: ReviewItemReviewedInput
}

function buildReviewAuthor(input: ReviewAuthorInput): Record<string, unknown> {
  return {
    '@type': input.type ?? 'Person',
    name: input.name,
    ...(input.url ? { url: input.url } : {}),
  }
}

function buildItemReviewed(input: ReviewItemReviewedInput): Record<string, unknown> {
  if ('@type' in input) {
    return withoutContext(input)
  }

  return {
    '@type': input.type ?? 'Thing',
    name: input.name,
    ...(input.url ? { url: input.url } : {}),
  }
}

export function reviewSchema(input: ReviewSchemaInput): JsonLdBase<'Review'> {
  return jsonLd({
    '@type': 'Review',
    author: buildReviewAuthor(input.author),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.reviewRating,
      ...(input.bestRating !== undefined ? { bestRating: input.bestRating } : { bestRating: 5 }),
      ...(input.worstRating !== undefined ? { worstRating: input.worstRating } : { worstRating: 1 }),
    },
    ...(input.name ? { name: input.name } : {}),
    ...(input.reviewBody ? { reviewBody: input.reviewBody } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.itemReviewed ? { itemReviewed: buildItemReviewed(input.itemReviewed) } : {}),
  })
}

export type ReviewSchema = JsonLdNode & { '@type': 'Review' }