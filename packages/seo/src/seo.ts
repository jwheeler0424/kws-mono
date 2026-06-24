import type { SiteConfig } from './config'
import { resolveTitle } from './config'
import { cleanMeta, descriptionMeta, keywordsMeta, robotsMeta, themeColorMeta, titleMeta } from './meta'
import type { OpenGraphArticle, OpenGraphProfile, TwitterCardInput } from './social'
import { buildOpenGraph, buildTwitterCard } from './social'
import type { OpenGraphType, RobotsDirectives, SeoImage, SeoMetaTag } from './types'

export type SeoInput = {
  title?: string
  description?: string
  keywords?: string | string[]
  /** Canonical/og:url for this page. Also used by `createHead`'s `canonical: true` shortcut. */
  url?: string
  image?: string | SeoImage
  images?: SeoImage[]
  type?: OpenGraphType
  article?: OpenGraphArticle
  profile?: OpenGraphProfile
  robots?: RobotsDirectives | boolean
  /** Shortcut for `robots: false`. Wins over `robots` if both are set. */
  noIndex?: boolean
  /** Per-page Twitter overrides, layered over the site-wide handle/card defaults. */
  twitter?: Partial<TwitterCardInput>
  themeColor?: string
}

function normalizeImages(input: SeoInput): SeoImage[] {
  if (input.images?.length) return input.images
  if (!input.image) return []
  return [typeof input.image === 'string' ? { url: input.image } : input.image]
}

/**
 * Builds the full set of `<meta>` tags - basic SEO, robots, Open Graph, and
 * Twitter Card - for a single route. This is the direct successor to the
 * `seo()` helper from the TanStack Start starter template: same call shape
 * for the common case, but type-safe, og-tags use `property` (per spec)
 * instead of `name`, supports multiple images, robots directives, and
 * article/profile metadata, and can be bound to site-wide defaults.
 *
 * Spread the result into `head().meta`:
 *
 * ```ts
 * head: () => ({ meta: seo({ title: 'About', description: '...' }) })
 * ```
 *
 * Or use `createHead()` (see head.ts) to also get links/JSON-LD in one call.
 */
export function seo(input: SeoInput, site?: SiteConfig): SeoMetaTag[] {
  const title = site ? resolveTitle(input.title, site) : input.title ?? ''
  const description = input.description ?? site?.defaultDescription
  const resolvedImages = normalizeImages(input)
  const images = resolvedImages.length ? resolvedImages : site?.defaultImage ? [site.defaultImage] : []
  const robots = input.noIndex ? false : input.robots ?? site?.defaultRobots

  const basic = cleanMeta([
    title ? titleMeta(title) : null,
    descriptionMeta(description),
    keywordsMeta(input.keywords),
    robotsMeta(robots),
    themeColorMeta(input.themeColor ?? site?.themeColor),
  ])

  const og = buildOpenGraph({
    title,
    description,
    url: input.url,
    siteName: site?.siteName,
    type: input.type ?? 'website',
    locale: site?.locale,
    alternateLocale: site?.alternateLocales,
    images,
    article: input.article,
    profile: input.profile,
  })

  const twitter = buildTwitterCard({
    site: site?.twitterSite,
    creator: site?.twitterHandle,
    title,
    description,
    image: images[0]?.url,
    imageAlt: images[0]?.alt,
    ...input.twitter,
  })

  return [...basic, ...og, ...twitter]
}