import { jsonLd, type JsonLdBase } from './common'

export type ArticleAuthor = {
  name: string
  url?: string
}

export type ArticlePublisher = {
  name: string
  url?: string
  logo?: string
}

export type ArticleSchemaInput = {
  /** Defaults to `'Article'`; use `'BlogPosting'` for a blog platform, `'NewsArticle'` for news. */
  type?: 'Article' | 'BlogPosting' | 'NewsArticle'
  headline: string
  description?: string
  image?: string | string[]
  url: string
  datePublished: string
  dateModified?: string
  author: ArticleAuthor | ArticleAuthor[]
  publisher?: ArticlePublisher
  section?: string
  keywords?: string[]
  isAccessibleForFree?: boolean
}

function buildAuthor(author: ArticleAuthor) {
  return {
    '@type': 'Person',
    name: author.name,
    ...(author.url ? { url: author.url } : {}),
  }
}

function buildPublisher(publisher: ArticlePublisher) {
  return {
    '@type': 'Organization',
    name: publisher.name,
    ...(publisher.url ? { url: publisher.url } : {}),
    ...(publisher.logo
      ? {
        logo: {
          '@type': 'ImageObject',
          url: publisher.logo,
        },
      }
      : {}),
  }
}

export function articleSchema(input: ArticleSchemaInput): JsonLdBase<'Article' | 'BlogPosting' | 'NewsArticle'> {
  const authors = Array.isArray(input.author) ? input.author : [input.author]

  return jsonLd({
    '@type': input.type ?? 'Article',
    headline: input.headline,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: authors.map(buildAuthor),
    ...(input.publisher ? { publisher: buildPublisher(input.publisher) } : {}),
    ...(input.section ? { articleSection: input.section } : {}),
    ...(input.keywords?.length ? { keywords: input.keywords.join(', ') } : {}),
    ...(input.isAccessibleForFree !== undefined ? { isAccessibleForFree: input.isAccessibleForFree } : {}),
  })
}