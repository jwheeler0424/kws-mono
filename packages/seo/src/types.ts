/**
 * Core type definitions for TanStack Start / TanStack Router document head
 * management. These mirror the shapes accepted by `routeOptions.head()`, so
 * every object these utilities produce can be spread directly into it:
 *
 * ```ts
 * export const Route = createFileRoute('/posts/$postId')({
 *   head: () => createHead({ title: post.title }), // <- see head.ts
 * })
 * ```
 */

/**
 * A single `<meta>` tag entry. TanStack Router accepts a loosely-typed
 * object where exactly one "kind" of field is normally set per entry:
 * - `{ title }` sets the document `<title>`
 * - `{ charSet }` sets `<meta charSet="..." />`
 * - `{ name, content }` sets `<meta name="..." content="..." />`
 * - `{ property, content }` sets `<meta property="..." content="..." />`
 * - `{ httpEquiv, content }` sets `<meta http-equiv="..." content="..." />`
 */
export type SeoMetaTag = {
  title?: string
  charSet?: string
  name?: string
  property?: string
  httpEquiv?: string
  content?: string
  [key: string]: string | undefined
}

/** A single `<link>` tag entry. */
export type SeoLinkTag = {
  rel: string
  href: string
  hrefLang?: string
  sizes?: string
  type?: string
  media?: string
  color?: string
  as?: string
  title?: string
  crossOrigin?: string | boolean
  [key: string]: string | number | boolean | undefined
}

/** A single inline `<style>` tag entry, as accepted by `head().styles`. */
export type SeoStyleTag = {
  media?: string
  children: string
}

/**
 * A single `<script>` tag entry. Used both for `head().scripts` (rendered
 * in `<head>` via `<HeadContent />`) and `routeOptions.scripts` (rendered in
 * `<body>` via `<Scripts />`) - see the SCRIPTS section of the README.
 */
export type SeoScriptTag = {
  src?: string
  type?: string
  children?: string
  async?: boolean
  defer?: boolean
  crossOrigin?: string | boolean
  [key: string]: string | boolean | undefined
}

/** The full shape accepted by `routeOptions.head()`. */
export type SeoHeadConfig = {
  meta?: SeoMetaTag[]
  links?: SeoLinkTag[]
  styles?: SeoStyleTag[]
  scripts?: SeoScriptTag[]
}

/**
 * Common Open Graph object types. Left open via `(string & {})` so you can
 * pass any other og:type value while still getting autocomplete for the
 * common ones.
 */
export type OpenGraphType =
  | 'website'
  | 'article'
  | 'profile'
  | 'book'
  | 'music.song'
  | 'music.album'
  | 'music.playlist'
  | 'music.radio_station'
  | 'video.movie'
  | 'video.episode'
  | 'video.tv_show'
  | 'video.other'
  | (string & {})

export type TwitterCardType = 'summary' | 'summary_large_image' | 'app' | 'player'

export type SeoImage = {
  url: string
  width?: number
  height?: number
  alt?: string
  type?: string
}

export type MaxImagePreview = 'none' | 'standard' | 'large'

/**
 * Structured directives for the `robots` meta tag / `X-Robots-Tag` header.
 * Pass `true`/`false` to `robotsMeta()` for the common index/noindex cases,
 * or this shape for fine-grained control.
 */
export type RobotsDirectives = {
  index?: boolean
  follow?: boolean
  noarchive?: boolean
  nosnippet?: boolean
  noimageindex?: boolean
  notranslate?: boolean
  maxSnippet?: number
  maxImagePreview?: MaxImagePreview
  maxVideoPreview?: number
  unavailableAfter?: string
}