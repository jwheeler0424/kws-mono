import type { SeoScriptTag } from '../types'

export const SCHEMA_CONTEXT = 'https://schema.org'

export type JsonLdProps = Record<string, unknown>

export type JsonLdBase<
  TType extends string = string,
  TProps extends JsonLdProps = JsonLdProps,
> = {
  '@context'?: string | string[]
  '@type': TType
} & TProps

export type JsonLdNode = JsonLdBase<string, JsonLdProps>

/** Wraps a plain schema.org object with `@context`. Mostly used internally by the builders below. */
export function jsonLd<TType extends string, TProps extends JsonLdProps>(
  data: { '@type': TType } & TProps,
): JsonLdBase<TType, TProps> {
  return { '@context': SCHEMA_CONTEXT, ...data } as JsonLdBase<TType, TProps>
}

/**
 * Serializes one or more JSON-LD objects into `<script type="application/ld+json">`
 * tags ready to drop into a route's `head().scripts`.
 */
export function jsonLdScript(data: JsonLdBase | JsonLdBase[]): SeoScriptTag[] {
  const items = Array.isArray(data) ? data : [data]
  return items.map((item) => ({
    type: 'application/ld+json',
    children: JSON.stringify(item),
  }))
}

/**
 * Combines several schemas into a single script tag using an `@graph` array -
 * useful when Google's Rich Results Test complains about multiple top-level
 * JSON-LD scripts, or you'd just rather emit one `<script>` per page.
 */
export function jsonLdGraph(data: JsonLdBase[]): SeoScriptTag {
  return {
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': SCHEMA_CONTEXT,
      '@graph': data.map(withoutContext),
    }),
  }
}

/** Strips `@context` so a JsonLdBase can be safely nested inside another schema. */
export function withoutContext<T extends JsonLdBase>(node: T): Omit<T, '@context'> {
  const { '@context': _ctx, ...rest } = node
  return rest as Omit<T, '@context'>
}