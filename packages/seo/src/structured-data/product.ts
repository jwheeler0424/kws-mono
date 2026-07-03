import { jsonLd, type JsonLdBase } from './common';

export type ProductOfferInput = {
  price: number | string;
  priceCurrency: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'LimitedAvailability';
  url?: string;
  priceValidUntil?: string;
};

export type ProductSchemaInput = {
  name: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: string;
  offers?: ProductOfferInput;
  aggregateRating?: { ratingValue: number | string; reviewCount: number };
};

export function productSchema(input: ProductSchemaInput): JsonLdBase<'Product'> {
  return jsonLd({
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brand ? { brand: { '@type': 'Brand', name: input.brand } } : {}),
    ...(input.offers
      ? {
          offers: {
            '@type': 'Offer',
            price: input.offers.price,
            priceCurrency: input.offers.priceCurrency,
            availability: `https://schema.org/${input.offers.availability ?? 'InStock'}`,
            ...(input.offers.url ? { url: input.offers.url } : {}),
            ...(input.offers.priceValidUntil
              ? { priceValidUntil: input.offers.priceValidUntil }
              : {}),
          },
        }
      : {}),
    ...(input.aggregateRating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: input.aggregateRating.ratingValue,
            reviewCount: input.aggregateRating.reviewCount,
          },
        }
      : {}),
  });
}
