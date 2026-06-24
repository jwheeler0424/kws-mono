import { jsonLd, type JsonLdBase } from './common'

export type BreadcrumbItem = {
  name: string
  url: string
}

export function breadcrumbListSchema(items: BreadcrumbItem[]): JsonLdBase<'BreadcrumbList'> {
  return jsonLd({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  })
}