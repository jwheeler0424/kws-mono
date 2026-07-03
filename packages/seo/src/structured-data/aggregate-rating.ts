import { jsonLd, type JsonLdBase, type JsonLdNode } from './common';

export type AggregateRatingSchemaInput = {
  ratingValue: number | string;
  reviewCount: number;
  bestRating?: number | string;
  worstRating?: number | string;
  ratingExplanation?: string;
};

export function aggregateRatingSchema(
  input: AggregateRatingSchemaInput,
): JsonLdBase<'AggregateRating'> {
  return jsonLd({
    '@type': 'AggregateRating',
    ratingValue: input.ratingValue,
    reviewCount: input.reviewCount,
    ...(input.bestRating !== undefined ? { bestRating: input.bestRating } : {}),
    ...(input.worstRating !== undefined ? { worstRating: input.worstRating } : {}),
    ...(input.ratingExplanation ? { ratingExplanation: input.ratingExplanation } : {}),
  });
}

export type AggregateRatingSchema = JsonLdNode & { '@type': 'AggregateRating' };
