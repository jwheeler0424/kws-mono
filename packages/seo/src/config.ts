import type { RobotsDirectives, SeoImage } from './types'

export type OrganizationConfig = {
  name: string
  url: string
  logo?: string
  sameAs?: string[]
}

/**
 * Site-wide defaults that get layered under every page's SEO input. Define
 * this once and bind it with `createSeoHelpers()` (see head.ts) so individual
 * routes only ever need to supply page-specific values.
 */
export type SiteConfig = {
  siteName: string
  siteUrl: string
  defaultTitle: string
  /** Applied to every page title. Use `%s` as the placeholder, e.g. `'%s | My App'`. */
  titleTemplate?: string
  defaultDescription?: string
  defaultImage?: SeoImage
  /** BCP 47 locale, e.g. `'en_US'`. */
  locale?: string
  alternateLocales?: string[]
  /** `@handle` used for `twitter:creator`. */
  twitterHandle?: string
  /** `@handle` used for `twitter:site`. */
  twitterSite?: string
  themeColor?: string
  defaultRobots?: RobotsDirectives | boolean
  organization?: OrganizationConfig
}

/** Identity helper - exists purely so config objects get inferred/checked against `SiteConfig`. */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config
}

export function resolveTitle(
  title: string | undefined,
  config: Pick<SiteConfig, 'defaultTitle' | 'titleTemplate'>,
): string {
  if (!title) return config.defaultTitle
  if (!config.titleTemplate) return title
  return config.titleTemplate.includes('%s')
    ? config.titleTemplate.replace('%s', title)
    : `${title} ${config.titleTemplate}`
}