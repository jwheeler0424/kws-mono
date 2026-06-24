import { jsonLd, type JsonLdBase } from './common'

export type PersonSchemaInput = {
  name: string
  url?: string
  image?: string | string[]
  jobTitle?: string
  sameAs?: string[]
  worksFor?: { name: string; url?: string }
  knowsAbout?: string[]
}

export function personSchema(input: PersonSchemaInput): JsonLdBase<'Person'> {
  return jsonLd({
    '@type': 'Person',
    name: input.name,
    ...(input.url ? { url: input.url } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
    ...(input.worksFor
      ? {
        worksFor: {
          '@type': 'Organization',
          name: input.worksFor.name,
          ...(input.worksFor.url ? { url: input.worksFor.url } : {}),
        },
      }
      : {}),
    ...(input.knowsAbout?.length ? { knowsAbout: input.knowsAbout } : {}),
  })
}