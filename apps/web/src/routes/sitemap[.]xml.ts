// src/routes/sitemap[.]xml.ts
import { siteConfig } from '@/lib/tools/seo';
import { buildSitemapXml } from '@kws/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        // const posts = await fetchAllPosts()

        const xml = buildSitemapXml([
          { loc: siteConfig.siteUrl, changefreq: 'daily', priority: 1.0 },
          { loc: `${siteConfig.siteUrl}/blog`, changefreq: 'daily', priority: 0.8 },
          // ...posts.map((post) => ({
          //   loc: `${siteConfig.siteUrl}/posts/${post.id}`,
          //   lastmod: post.updatedAt,
          //   changefreq: 'weekly' as const,
          //   priority: 0.7,
          // })),
        ])

        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
      },
    },
  },
});
