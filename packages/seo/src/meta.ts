import type { RobotsDirectives, SeoMetaTag } from './types';

/**
 * Drops falsy entries and entries whose `content` ended up undefined/empty,
 * so optional fields (description, keywords, etc.) never render as empty or
 * duplicate tags.
 */
export function cleanMeta(tags: Array<SeoMetaTag | false | null | undefined>): SeoMetaTag[] {
  return tags.filter((tag): tag is SeoMetaTag => {
    if (!tag) return false;
    if ('content' in tag) return tag.content !== undefined && tag.content !== '';
    return true;
  });
}

export function charsetMeta(charSet = 'utf-8'): SeoMetaTag {
  return { charSet };
}

export function viewportMeta(content = 'width=device-width, initial-scale=1'): SeoMetaTag {
  return { name: 'viewport', content };
}

export function titleMeta(title: string): SeoMetaTag {
  return { title };
}

/**
 * Builds the `description` meta tag, truncating to a search-engine-friendly
 * length (Google generally truncates snippets around ~155-160 characters).
 */
export function descriptionMeta(
  description?: string,
  opts?: { maxLength?: number },
): SeoMetaTag | null {
  if (!description) return null;
  const maxLength = opts?.maxLength ?? 160;
  const content =
    description.length > maxLength
      ? `${description.slice(0, maxLength - 1).trimEnd()}…`
      : description;
  return { name: 'description', content };
}

export function keywordsMeta(keywords?: string | string[]): SeoMetaTag | null {
  if (!keywords || (Array.isArray(keywords) && keywords.length === 0)) return null;
  return { name: 'keywords', content: Array.isArray(keywords) ? keywords.join(', ') : keywords };
}

/** Generic `<meta name="..." content="..." />` builder. Returns `null` for empty content so it can be inlined in arrays and filtered with `cleanMeta`. */
export function metaName(name: string, content?: string): SeoMetaTag | null {
  if (content === undefined || content === '') return null;
  return { name, content };
}

/** Generic `<meta property="..." content="..." />` builder (Open Graph, etc). */
export function metaProperty(property: string, content?: string): SeoMetaTag | null {
  if (content === undefined || content === '') return null;
  return { property, content };
}

export function authorMeta(author?: string): SeoMetaTag | null {
  return author ? { name: 'author', content: author } : null;
}

export function themeColorMeta(color?: string): SeoMetaTag | null {
  return color ? { name: 'theme-color', content: color } : null;
}

/**
 * Builds the `robots` meta tag.
 * - `true` -> `index, follow`
 * - `false` -> `noindex, nofollow`
 * - `RobotsDirectives` -> fine-grained control (max-snippet, max-image-preview, etc.)
 */
export function robotsMeta(directives?: RobotsDirectives | boolean): SeoMetaTag | null {
  if (directives === undefined) return null;
  if (directives === false) return { name: 'robots', content: 'noindex, nofollow' };
  if (directives === true) return { name: 'robots', content: 'index, follow' };

  const parts: string[] = [];
  parts.push(directives.index === false ? 'noindex' : 'index');
  parts.push(directives.follow === false ? 'nofollow' : 'follow');
  if (directives.noarchive) parts.push('noarchive');
  if (directives.nosnippet) parts.push('nosnippet');
  if (directives.noimageindex) parts.push('noimageindex');
  if (directives.notranslate) parts.push('notranslate');
  if (directives.maxSnippet !== undefined) parts.push(`max-snippet:${directives.maxSnippet}`);
  if (directives.maxImagePreview) parts.push(`max-image-preview:${directives.maxImagePreview}`);
  if (directives.maxVideoPreview !== undefined)
    parts.push(`max-video-preview:${directives.maxVideoPreview}`);
  if (directives.unavailableAfter) parts.push(`unavailable_after:${directives.unavailableAfter}`);

  return { name: 'robots', content: parts.join(', ') };
}
