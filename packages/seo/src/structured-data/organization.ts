import { jsonLd, type JsonLdBase } from './common'

export type OrganizationSchemaInput = {
  name: string
  url: string
  logo?: string
  sameAs?: string[]
  contactPoint?: { telephone: string; contactType: string; email?: string; areaServed?: string }
}

export function organizationSchema(input: OrganizationSchemaInput): JsonLdBase<'Organization'> {
  return jsonLd({
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.logo
      ? {
        logo: {
          '@type': 'ImageObject',
          url: input.logo,
        },
      }
      : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
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