import type { OpenGraphType, SeoImage, SeoMetaTag, TwitterCardType } from './types';

import { metaName, metaProperty } from './meta';

export type OpenGraphArticle = {
  publishedTime?: string;
  modifiedTime?: string;
  expirationTime?: string;
  author?: string | string[];
  section?: string;
  tags?: string[];
};

export type OpenGraphProfile = {
  firstName?: string;
  lastName?: string;
  username?: string;
  gender?: string;
};

export type OpenGraphInput = {
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  type?: OpenGraphType;
  locale?: string;
  alternateLocale?: string[];
  images?: SeoImage[];
  videos?: Array<Pick<SeoImage, 'url' | 'width' | 'height' | 'type'>>;
  article?: OpenGraphArticle;
  profile?: OpenGraphProfile;
};

function mediaTags(media: SeoImage[] | undefined, prefix: 'og:image' | 'og:video'): SeoMetaTag[] {
  if (!media?.length) return [];
  return media.flatMap((item) => {
    const tags = [
      metaProperty(prefix, item.url),
      item.width ? metaProperty(`${prefix}:width`, String(item.width)) : null,
      item.height ? metaProperty(`${prefix}:height`, String(item.height)) : null,
      item.type ? metaProperty(`${prefix}:type`, item.type) : null,
      'alt' in item && item.alt ? metaProperty(`${prefix}:alt`, item.alt) : null,
    ];
    return tags.filter((t): t is SeoMetaTag => t !== null);
  });
}

/**
 * Builds the full set of Open Graph tags for a page, including the
 * `article:*` or `profile:*` extensions when `type` is `'article'`/`'profile'`
 * and per-image width/height/alt tags (the spec allows repeating `og:image`
 * for multiple images).
 */
export function buildOpenGraph(og: OpenGraphInput): SeoMetaTag[] {
  const tags: Array<SeoMetaTag | null> = [
    metaProperty('og:title', og.title),
    metaProperty('og:description', og.description),
    metaProperty('og:type', og.type ?? 'website'),
    metaProperty('og:url', og.url),
    metaProperty('og:site_name', og.siteName),
    metaProperty('og:locale', og.locale),
  ];

  og.alternateLocale?.forEach((locale) => tags.push(metaProperty('og:locale:alternate', locale)));

  if (og.type === 'article' && og.article) {
    tags.push(
      metaProperty('article:published_time', og.article.publishedTime),
      metaProperty('article:modified_time', og.article.modifiedTime),
      metaProperty('article:expiration_time', og.article.expirationTime),
      metaProperty('article:section', og.article.section),
    );
    const authors = Array.isArray(og.article.author)
      ? og.article.author
      : og.article.author
        ? [og.article.author]
        : [];
    authors.forEach((author) => tags.push(metaProperty('article:author', author)));
    og.article.tags?.forEach((tag) => tags.push(metaProperty('article:tag', tag)));
  }

  if (og.type === 'profile' && og.profile) {
    tags.push(
      metaProperty('profile:first_name', og.profile.firstName),
      metaProperty('profile:last_name', og.profile.lastName),
      metaProperty('profile:username', og.profile.username),
      metaProperty('profile:gender', og.profile.gender),
    );
  }

  tags.push(...mediaTags(og.images, 'og:image'));
  tags.push(...mediaTags(og.videos as SeoImage[] | undefined, 'og:video'));

  return tags.filter((t): t is SeoMetaTag => t !== null);
}

export type TwitterAppPlatformFields = {
  iphone?: string;
  ipad?: string;
  googleplay?: string;
};

export type TwitterCardInput = {
  card?: TwitterCardType;
  /** `@handle` of the site/brand account -> `twitter:site`. */
  site?: string;
  /** `@handle` of the content author -> `twitter:creator`. */
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  player?: { url: string; width: number; height: number; stream?: string };
  app?: {
    name: TwitterAppPlatformFields;
    id: TwitterAppPlatformFields;
    url?: TwitterAppPlatformFields;
  };
};

/**
 * Builds Twitter Card tags. Defaults to `summary_large_image` whenever an
 * image is present, otherwise `summary` - matching what Twitter/X's card
 * validator expects to actually render a preview.
 */
export function buildTwitterCard(twitter: TwitterCardInput): SeoMetaTag[] {
  const tags: Array<SeoMetaTag | null> = [
    metaName('twitter:card', twitter.card ?? (twitter.image ? 'summary_large_image' : 'summary')),
    metaName('twitter:site', twitter.site),
    metaName('twitter:creator', twitter.creator),
    metaName('twitter:title', twitter.title),
    metaName('twitter:description', twitter.description),
    metaName('twitter:image', twitter.image),
    metaName('twitter:image:alt', twitter.imageAlt),
  ];

  if (twitter.player) {
    tags.push(
      metaName('twitter:player', twitter.player.url),
      metaName('twitter:player:width', String(twitter.player.width)),
      metaName('twitter:player:height', String(twitter.player.height)),
      metaName('twitter:player:stream', twitter.player.stream),
    );
  }

  if (twitter.app) {
    const app = twitter.app;
    (['iphone', 'ipad', 'googleplay'] as const).forEach((platform) => {
      tags.push(
        metaName(`twitter:app:name:${platform}`, app.name[platform]),
        metaName(`twitter:app:id:${platform}`, app.id[platform]),
        metaName(`twitter:app:url:${platform}`, app.url?.[platform]),
      );
    });
  }

  return tags.filter((t): t is SeoMetaTag => t !== null);
}
