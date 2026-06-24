export type SitemapEntry = {
  loc: string
  /** ISO 8601 date, e.g. `'2026-06-24'` or a full timestamp. */
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** 0.0 - 1.0 */
  priority?: number
}

/**
 * Builds a sitemap.xml string from a list of entries. Use from a server
 * route - see examples/sitemap.xml.route.ts:
 *
 * ```ts
 * // src/routes/sitemap[.]xml.ts
 * export const Route = createFileRoute('/sitemap.xml')({
 *   server: { handlers: { GET: async () => new Response(buildSitemapXml(entries), {
 *     headers: { 'Content-Type': 'application/xml' },
 *   }) } },
 * })
 * ```
 */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const fields = [
        `<loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '',
        entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : '',
        entry.priority !== undefined ? `<priority>${entry.priority.toFixed(1)}</priority>` : '',
      ]
        .filter(Boolean)
        .join('')
      return `<url>${fields}</url>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
