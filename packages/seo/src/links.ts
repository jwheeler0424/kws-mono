import type { SeoLinkTag } from './types';

export function canonicalLink(url: string): SeoLinkTag {
  return { rel: 'canonical', href: url };
}

export type AlternateLanguage = {
  /** BCP 47 language code, or `'x-default'` for the fallback variant. */
  hrefLang: string;
  href: string;
};

/** Builds `<link rel="alternate" hrefLang="..." href="..." />` tags for multi-language pages. */
export function alternateLanguageLinks(alternates: AlternateLanguage[]): SeoLinkTag[] {
  return alternates.map(({ hrefLang, href }) => ({ rel: 'alternate', hrefLang, href }));
}

export type IconLinksOptions = {
  /** `/favicon.ico` */
  favicon?: string;
  icon16?: string;
  icon32?: string;
  icon96?: string;
  appleTouchIcon?: string;
  manifest?: string;
  maskIcon?: { href: string; color: string };
  /** Applied alongside `manifest` as the legacy `color` link attribute some crawlers still read. */
  themeColor?: string;
};

/**
 * Builds the standard favicon/touch-icon/manifest link set. Typically only
 * needed on the root route - see examples/root-route.tsx.
 */
export function iconLinks(opts: IconLinksOptions): SeoLinkTag[] {
  const links: SeoLinkTag[] = [];
  if (opts.icon32)
    links.push({ rel: 'icon', type: 'image/png', sizes: '32x32', href: opts.icon32 });
  if (opts.icon16)
    links.push({ rel: 'icon', type: 'image/png', sizes: '16x16', href: opts.icon16 });
  if (opts.icon96)
    links.push({ rel: 'icon', type: 'image/png', sizes: '96x96', href: opts.icon96 });
  if (opts.appleTouchIcon)
    links.push({ rel: 'apple-touch-icon', sizes: '180x180', href: opts.appleTouchIcon });
  if (opts.maskIcon)
    links.push({ rel: 'mask-icon', href: opts.maskIcon.href, color: opts.maskIcon.color });
  if (opts.manifest) {
    links.push({
      rel: 'manifest',
      href: opts.manifest,
      ...(opts.themeColor ? { color: opts.themeColor } : {}),
    });
  }
  if (opts.favicon) links.push({ rel: 'icon', href: opts.favicon });
  return links;
}

export function preconnect(href: string, crossOrigin = true): SeoLinkTag {
  return { rel: 'preconnect', href, ...(crossOrigin ? { crossOrigin: 'anonymous' } : {}) };
}

export function dnsPrefetch(href: string): SeoLinkTag {
  return { rel: 'dns-prefetch', href };
}

export function preload(href: string, as: string, type?: string): SeoLinkTag {
  return { rel: 'preload', href, as, ...(type ? { type } : {}) };
}

export type PaginationLinksOptions = {
  prev?: string;
  next?: string;
};

/** `rel="prev"` / `rel="next"` links for paginated list pages. */
export function paginationLinks({ prev, next }: PaginationLinksOptions): SeoLinkTag[] {
  const links: SeoLinkTag[] = [];
  if (prev) links.push({ rel: 'prev', href: prev });
  if (next) links.push({ rel: 'next', href: next });
  return links;
}

export function rssLink(href: string, title = 'RSS Feed'): SeoLinkTag {
  return { rel: 'alternate', type: 'application/rss+xml', title, href };
}
