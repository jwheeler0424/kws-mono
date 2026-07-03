import type { SiteConfig } from './config';
import type { AlternateLanguage } from './links';
import type { SeoInput } from './seo';
import type { JsonLdBase } from './structured-data/index.ts';
import type { SeoHeadConfig, SeoLinkTag, SeoScriptTag } from './types';

import { alternateLanguageLinks, canonicalLink } from './links';
import { seo } from './seo';
import { jsonLdScript } from './structured-data/index.ts';

export type CreateHeadInput = SeoInput & {
  /** Adds `<link rel="canonical">`. Pass `true` to reuse `url`, or an explicit URL. */
  canonical?: boolean | string;
  alternates?: AlternateLanguage[];
  /** One or more JSON-LD schemas (see structured-data.ts builders), each rendered as its own `<script>`. */
  jsonLd?: JsonLdBase | JsonLdBase[];
  /** Escape hatch for anything not covered above - merged in as-is. */
  extra?: SeoHeadConfig;
};

/**
 * Builds a complete `head()` return value - meta, links, and JSON-LD scripts -
 * for a single route. Spread the result directly:
 *
 * ```ts
 * export const Route = createFileRoute('/posts/$postId')({
 *   loader: async ({ params }) => ({ post: await fetchPost(params.postId) }),
 *   head: ({ loaderData }) =>
 *     createHead({
 *       title: loaderData.post.title,
 *       description: loaderData.post.excerpt,
 *       image: loaderData.post.coverImage,
 *       type: 'article',
 *       url: `https://myapp.com/posts/${loaderData.post.id}`,
 *       canonical: true,
 *       jsonLd: articleSchema({ ... }),
 *     }),
 * })
 * ```
 */
export function createHead(input: CreateHeadInput, site?: SiteConfig): SeoHeadConfig {
  const meta = seo(input, site);

  const links: SeoLinkTag[] = [];
  const canonicalUrl =
    input.canonical === true
      ? input.url
      : typeof input.canonical === 'string'
        ? input.canonical
        : undefined;
  if (canonicalUrl) links.push(canonicalLink(canonicalUrl));
  if (input.alternates?.length) links.push(...alternateLanguageLinks(input.alternates));

  const scripts: SeoScriptTag[] = input.jsonLd ? jsonLdScript(input.jsonLd) : [];

  return {
    meta: [...meta, ...(input.extra?.meta ?? [])],
    links: [...links, ...(input.extra?.links ?? [])],
    scripts: [...scripts, ...(input.extra?.scripts ?? [])],
    ...(input.extra?.styles?.length ? { styles: input.extra.styles } : {}),
  };
}

/**
 * Binds a `SiteConfig` so every route only needs to supply page-specific
 * values. Define once in a shared module and import the bound helpers
 * everywhere else:
 *
 * ```ts
 * // src/utils/seo.ts
 * import { createSeoHelpers, defineSiteConfig } from 'seo-utils'
 *
 * export const siteConfig = defineSiteConfig({
 *   siteName: 'My App',
 *   siteUrl: 'https://myapp.com',
 *   defaultTitle: 'My App',
 *   titleTemplate: '%s | My App',
 *   defaultImage: { url: 'https://myapp.com/og-default.png', width: 1200, height: 630 },
 *   twitterHandle: '@myapp',
 *   twitterSite: '@myapp',
 * })
 *
 * export const { seo, createHead } = createSeoHelpers(siteConfig)
 * ```
 */
export function createSeoHelpers(site: SiteConfig) {
  return {
    seo: (input: SeoInput) => seo(input, site),
    createHead: (input: CreateHeadInput) => createHead(input, site),
    site,
  };
}

/**
 * Concatenates multiple `SeoHeadConfig` objects - e.g. a shared root-level
 * config plus a page-specific one assembled outside the route file. TanStack
 * Router already dedupes `meta` (by name/property, last occurrence wins) and
 * `title` across nested routes, so simple concatenation is safe and you
 * rarely need this directly; it's here mainly for composing head config
 * outside of the route tree (e.g. shared layout helpers).
 */
export function mergeHead(...heads: Array<SeoHeadConfig | undefined>): SeoHeadConfig {
  return heads.reduce<SeoHeadConfig>(
    (acc, head) => ({
      meta: [...(acc.meta ?? []), ...(head?.meta ?? [])],
      links: [...(acc.links ?? []), ...(head?.links ?? [])],
      styles: [...(acc.styles ?? []), ...(head?.styles ?? [])],
      scripts: [...(acc.scripts ?? []), ...(head?.scripts ?? [])],
    }),
    {},
  );
}
