# seo-utils

Type-safe SEO and document-head utilities for TanStack Start / TanStack
Router. Built directly against the `routeOptions.head()` shape (`meta`,
`links`, `styles`, `scripts`) and the `sitemap.xml` / `robots.txt` server-route
conventions from TanStack's own SEO guide - this is the typed, composable
successor to the single `seo()` helper shipped in the starter templates.

## Install

This is a local source package (no build step required - everything is
plain `.ts`, consumed directly). Drop the `src/` folder into your app, e.g.
as `src/lib/seo/`, and import from it directly, or publish it to your
private registry / workspace if you use a monorepo.

```ts
import { seo, createHead, createSeoHelpers, articleSchema } from '~/lib/seo'
```

## Quick start

Define your site-wide defaults once, then bind `seo`/`createHead` so every
route only supplies page-specific values.

```ts
// src/utils/seo.ts
import { defineSiteConfig, createSeoHelpers } from '~/lib/seo'

export const siteConfig = defineSiteConfig({
  siteName: 'My App',
  siteUrl: 'https://myapp.com',
  defaultTitle: 'My App',
  titleTemplate: '%s | My App',
  defaultDescription: 'My App is a platform for...',
  defaultImage: { url: 'https://myapp.com/og-default.png', width: 1200, height: 630 },
  twitterHandle: '@myapp',
  twitterSite: '@myapp',
  themeColor: '#0f172a',
})

export const { seo, createHead } = createSeoHelpers(siteConfig)
```

```ts
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createHead } from '~/utils/seo'

export const Route = createFileRoute('/')({
  head: () => createHead({ title: 'Home', description: 'Welcome to My App...' }),
  component: HomePage,
})
```

That single `createHead()` call produces basic meta, robots, Open Graph,
and Twitter Card tags, all merged with your site defaults.

## What each module gives you

| Module | Covers |
|---|---|
| `types.ts` | `SeoMetaTag`, `SeoLinkTag`, `SeoStyleTag`, `SeoScriptTag`, `SeoHeadConfig` - typed mirrors of `head()`'s shape |
| `config.ts` | `SiteConfig` / `defineSiteConfig` - site-wide defaults (title template, default image, twitter handles, locale, org info) |
| `meta.ts` | `titleMeta`, `descriptionMeta`, `keywordsMeta`, `robotsMeta`, `charsetMeta`, `viewportMeta`, `themeColorMeta`, `metaName`/`metaProperty` generics, `cleanMeta` |
| `social.ts` | `buildOpenGraph` (website/article/profile + multi-image), `buildTwitterCard` (summary/large-image/app/player) |
| `links.ts` | `canonicalLink`, `alternateLanguageLinks` (hreflang), `iconLinks` (favicons/manifest), `preconnect`, `dnsPrefetch`, `preload`, `paginationLinks`, `rssLink` |
| `structured-data.ts` | JSON-LD builders: `organizationSchema`, `websiteSchema`, `articleSchema`, `breadcrumbListSchema`, `faqPageSchema`, `personSchema`, `productSchema`, `localBusinessSchema`, `eventSchema`, `videoObjectSchema`, plus `jsonLdScript`/`jsonLdGraph` to serialize them |
| `seo.ts` | `seo()` - the composer that merges basic + robots + OG + Twitter into one `meta[]` array |
| `head.ts` | `createHead()` - full `head()` builder (meta + links + JSON-LD scripts), `createSeoHelpers()` factory, `mergeHead()` |
| `sitemap.ts` | `buildSitemapXml`, `buildRobotsTxt` for server routes |

## Covering every `head()` field

TanStack's `head()` returns four fields - `meta`, `links`, `styles`,
`scripts` - and `createHead()` populates the first three for you. `styles`
is left as an escape hatch via `extra` since inline critical CSS is rarely
SEO-driven:

```ts
head: () =>
  createHead({
    title: 'Pricing',
    extra: { styles: [{ media: 'print', children: '.no-print { display: none }' }] },
  }),
```

Two head-adjacent APIs live outside `head()` entirely and aren't wrapped
here on purpose, since they're not SEO-specific:
- `routeOptions.scripts` - **body** scripts (analytics, etc.), rendered via `<Scripts />`.
- `ScriptOnce` - pre-hydration inline scripts (theme detection / FOUC avoidance).

## Open Graph & Twitter, beyond the basics

```ts
createHead({
  title: post.title,
  description: post.excerpt,
  url: `https://myapp.com/posts/${post.id}`,
  canonical: true,
  type: 'article',
  image: { url: post.coverImage, width: 1200, height: 630, alt: post.title },
  article: {
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    author: post.author.name,
    section: post.category,
    tags: post.tags,
  },
  twitter: { card: 'summary_large_image' }, // per-page override of the site default
})
```

One important deviation from the original starter-template `seo()` helper:
that helper emitted Open Graph tags with `name="og:..."`. Per the actual Open
Graph spec, those should use `property="og:..."` - Facebook's scraper reads
`property`, and while most crawlers tolerate `name` as a fallback, `property`
is what validators (e.g. Facebook's Sharing Debugger) expect. `seo()`/
`buildOpenGraph()` here use `property` for `og:*`/`article:*`/`profile:*` and
`name` for `twitter:*`, matching each spec.

## Robots control

```ts
createHead({ title: 'Internal Tool', noIndex: true })

createHead({
  title: 'Archived Post',
  robots: { index: true, follow: true, maxImagePreview: 'large', maxSnippet: -1 },
})
```

## Structured data (JSON-LD)

Each builder returns a plain schema.org object; `jsonLd` (used internally
in `head: () => createHead()`) handles serialization:

```ts
createHead({
  title: post.title,
  jsonLd: [
    articleSchema({
      type: 'BlogPosting',
      headline: post.title,
      url: `https://myapp.com/posts/${post.id}`,
      datePublished: post.publishedAt,
      author: { name: post.author.name },
    }),
    breadcrumbListSchema([
      { name: 'Home', url: 'https://myapp.com' },
      { name: 'Posts', url: 'https://myapp.com/posts' },
      { name: post.title, url: `https://myapp.com/posts/${post.id}` },
    ]),
  ],
})
```

Available builders: `organizationSchema`, `websiteSchema` (with optional
sitelinks search box), `articleSchema` (Article/BlogPosting/NewsArticle),
`breadcrumbListSchema`, `faqPageSchema`, `personSchema`, `productSchema`
(with offers + aggregate rating), `localBusinessSchema`, `eventSchema`,
`videoObjectSchema`. Pass an array to `jsonLd` in `createHead()` to emit one
`<script>` per schema, or call `jsonLdGraph([...])` yourself first if you'd
rather emit a single `@graph` script.

## Multi-language pages

```ts
createHead({
  title: post.title,
  alternates: [
    { hrefLang: 'en', href: `https://myapp.com/en/posts/${post.id}` },
    { hrefLang: 'es', href: `https://myapp.com/es/posts/${post.id}` },
    { hrefLang: 'x-default', href: `https://myapp.com/posts/${post.id}` },
  ],
})
```

## Sitemaps & robots.txt

TanStack Start serves these as server routes (`src/routes/sitemap[.]xml.ts`,
`src/routes/robots[.]txt.ts` - the brackets escape the dot so the router
treats it as a literal filename rather than a path segment). See
`examples/sitemap.xml.route.ts` and `examples/robots.txt.route.ts`.

```ts
buildSitemapXml([
  { loc: 'https://myapp.com/', changefreq: 'daily', priority: 1.0 },
  { loc: 'https://myapp.com/posts/1', lastmod: '2026-06-01', changefreq: 'weekly', priority: 0.7 },
])

buildRobotsTxt({
  rules: [{ userAgent: '*', allow: ['/'], disallow: ['/admin'] }],
  sitemapUrls: ['https://myapp.com/sitemap.xml'],
})
```

If your site is fully static/prerendered, TanStack Start's Vite plugin can
also generate a sitemap at build time from the route tree (`tanstackStart({
sitemap: { enabled: true } })`) - reach for the manual builders here when you
need per-URL `lastmod`/`priority` driven by real content data (e.g. post
update timestamps), which the automatic crawler can't infer.

## Examples

- `examples/root-route.tsx` - site config, charset/viewport, icons/manifest, Organization + WebSite JSON-LD
- `examples/blog-post-route.tsx` - loader-driven dynamic SEO, canonical, Article + Breadcrumb JSON-LD, draft `noIndex`
- `examples/sitemap.xml.route.ts` / `examples/robots.txt.route.ts` - server routes

## Notes on TanStack's own deduping

TanStack Router dedupes `title` and `meta` tags across nested routes by
name/property, preferring the last (most specific/child) occurrence. That
means a child route's `createHead()` call safely overrides the root's
defaults for `title`/`description`/`og:*`/`twitter:*` without you having to
do anything - `links` and `scripts` are concatenated rather than deduped, so
avoid emitting the same canonical/JSON-LD twice across a route's ancestor
chain.