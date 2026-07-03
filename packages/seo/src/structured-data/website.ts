import { jsonLd, type JsonLdBase } from './common';

export type WebsiteSchemaInput = {
  name: string;
  url: string;
  description?: string;
  /** e.g. `'https://myapp.com/search?q={search_term_string}'` - enables the sitelinks search box. */
  searchUrlTemplate?: string;
};

export function websiteSchema(input: WebsiteSchemaInput): JsonLdBase<'WebSite'> {
  return jsonLd({
    '@type': 'WebSite',
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.searchUrlTemplate
      ? {
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: input.searchUrlTemplate,
            },
            'query-input': 'required name=search_term_string',
          },
        }
      : {}),
  });
}
