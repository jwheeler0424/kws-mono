import { jsonLd, type JsonLdBase, withoutContext } from './common'

export type ProfilePagePersonInput = {
  name: string
  description?: string
  image?: string | string[]
  url?: string
  sameAs?: string[]
  jobTitle?: string
  worksFor?: { name: string; url?: string }
  knowsAbout?: string[]
}

export type ProfilePageSchemaInput = {
  url: string
  name: string
  description?: string
  primaryImageOfPage?: string | string[]
  mainEntity: JsonLdBase<'Person'> | ProfilePagePersonInput
}

function buildPerson(input: ProfilePagePersonInput): Record<string, unknown> {
  return {
    '@type': 'Person',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
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
  }
}

export function profilePageSchema(input: ProfilePageSchemaInput): JsonLdBase<'ProfilePage'> {
  return jsonLd({
    '@type': 'ProfilePage',
    url: input.url,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.primaryImageOfPage ? { primaryImageOfPage: input.primaryImageOfPage } : {}),
    mainEntity: '@type' in input.mainEntity ? withoutContext(input.mainEntity) : buildPerson(input.mainEntity),
  })
}