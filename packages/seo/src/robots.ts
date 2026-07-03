export type RobotsRule = {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
};

export type RobotsTxtOptions = {
  rules: RobotsRule[];
  sitemapUrls?: string[];
  host?: string;
};

/**
 * Builds a robots.txt string. Use from a server route - see
 * examples/robots.txt.route.ts.
 */
export function buildRobotsTxt(opts: RobotsTxtOptions): string {
  const lines: string[] = [];
  for (const rule of opts.rules) {
    lines.push(`User-agent: ${rule.userAgent}`);
    rule.allow?.forEach((path) => lines.push(`Allow: ${path}`));
    rule.disallow?.forEach((path) => lines.push(`Disallow: ${path}`));
    if (rule.crawlDelay !== undefined) lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    lines.push('');
  }
  if (opts.host) lines.push(`Host: ${opts.host}`, '');
  opts.sitemapUrls?.forEach((url) => lines.push(`Sitemap: ${url}`));
  return `${lines.join('\n').trim()}\n`;
}
